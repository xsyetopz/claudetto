import type { EngineInterface, On, ToolSpec } from "claude-code";

import { fault } from "../shared/fault";
import { fieldOf } from "../shared/field";
import { START_CAP_MS, within } from "../shared/within";
import { claimOf, judgeClaim, type Use } from "./evidence";
import { endGoal, setGoal, type Tracker } from "./state";

/** How many newest transcript messages `clear_goal` reads for backing results. */
const WINDOW = 40;

/** Pause before a queued `/goal` runs; the engine holds it until the session is idle anyway. */
const DELAY_MS = 50;

/** The goal tools that run without a permission prompt: read, pause, and an evidence-checked clear. */
const SELF_SERVED = /^mcp__claudetto__(?:get|pause|clear)_goal$/u;

/**
 * The goal tools. Claude Code 2.1.330 offers SetGoal, PauseGoal and GetGoal to
 * no session (probed interactive and `-p`: the server gate is closed), so
 * claudetto serves the same three in snake_case plus `clear_goal`, which has no
 * original. Each description stays within 200 characters.
 */
export const SPECS: readonly ToolSpec[] = [
	{
		name: "get_goal",
		description:
			"Shows the session's goal: its condition, the stop blocks used this turn, or the paused condition. Use it before `set_goal` or `clear_goal`."
	},
	{
		name: "set_goal",
		description:
			"Sets the session goal, as `/goal` does. The condition is checked by an evaluator from the transcript, so state what a check can show. Starts when the turn ends.",
		inputSchema: {
			type: "object",
			properties: { condition: { type: "string" } },
			required: ["condition"]
		}
	},
	{
		name: "pause_goal",
		description:
			"Stops the stop-hook loop but keeps the condition for `get_goal`. Use when blocked on the user; when the work is done, use `clear_goal`. `set_goal` resumes it.",
		// In the prompt, not behind ToolSearch: a deferred pause_goal was first
		// loaded at the cap note, five blocks into a loop on a user-held step (RISK-520).
		isDeferred: false
	},
	{
		name: "clear_goal",
		description:
			"Ends a goal that is met, as `/goal clear` does. Give the condition and the checks you ran with outcomes. Refused when the last check failed or no tool result backs it.",
		inputSchema: {
			type: "object",
			properties: {
				condition: { type: "string" },
				checks: {
					type: "array",
					items: {
						type: "object",
						properties: {
							command: { type: "string" },
							outcome: { type: "string", enum: ["passed", "failed"] }
						},
						required: ["command", "outcome"]
					}
				}
			},
			required: ["condition", "checks"]
		}
	}
];

/**
 * Runs `/goal <args>` once the session is idle. `$.command.run` is refused
 * inside a tool hook (probed: HooksError), and a timer's call is queued until
 * idle, so the tool answers first and the command runs after the turn.
 * ENGINE(v2.1.330): a goal command cannot run mid-turn, so a clear lands after
 * the turn's Stop hook has run once more, and a set starts the next turn.
 */
function queue($: EngineInterface, args: string): void {
	$.clock.after(DELAY_MS, () => {
		$.command.run({ command: "goal", args }).catch((error: unknown) => {
			fault($, "goal command run", error);
		});
	});
}

/** The newest tool calls of the transcript, goal tools included (`judgeClaim` drops those). */
async function recentUses($: EngineInterface): Promise<Use[]> {
	const messages = await $.session.messages({ last: WINDOW });
	if ("deny" in messages) {
		return [];
	}
	return messages.flatMap((message) => message.toolUses);
}

function show(tracker: Tracker): string {
	if (tracker.goal !== undefined) {
		return `Active goal: "${tracker.goal.condition}". Stop blocks this turn: ${tracker.goal.blocks}.`;
	}
	if (tracker.paused !== undefined) {
		return `Paused goal: "${tracker.paused}". \`set_goal\` resumes it.`;
	}
	return "No goal is set.";
}

function set($: EngineInterface, tracker: Tracker, condition: unknown): string {
	if (typeof condition !== "string" || condition.trim() === "") {
		return "Give a condition: what a check can show once the work is done.";
	}
	queue($, condition.trim());
	setGoal(tracker, condition.trim());
	return `Goal queued: "${condition.trim()}". It starts when this turn ends.`;
}

function pause($: EngineInterface, tracker: Tracker): string {
	const goal = tracker.goal;
	if (goal === undefined) {
		return "No active goal to pause.";
	}
	endGoal(tracker, true);
	tracker.ended = goal.condition;
	queue($, "clear");
	$.ui.log(`Goal paused by the model: ${goal.condition}`, {
		to: "debug"
	});
	return `Paused: "${goal.condition}". It stays in \`get_goal\`; \`set_goal\` resumes it.`;
}

async function clear(
	$: EngineInterface,
	tracker: Tracker,
	input: { condition: unknown; checks: unknown }
): Promise<string> {
	const goal = tracker.goal;
	if (goal === undefined) {
		return "No active goal: it is already met, cleared or paused. Nothing to do.";
	}
	const claim = claimOf(input.condition, input.checks);
	const verdict = judgeClaim(goal.condition, claim, await recentUses($));
	if (!verdict.ok) {
		return `Refused: ${verdict.reason}`;
	}
	endGoal(tracker, false);
	tracker.ended = goal.condition;
	queue($, "clear");
	const checks = claim.checks
		.map((check) => `\`${check.command}\` (${check.outcome})`)
		.join("; ");
	await $.ui.notify(
		`The model ended the goal "${goal.condition}" as met. Checks: ${checks}`,
		{ title: "claudetto goal" }
	);
	return `Goal cleared: "${goal.condition}". Tell the user it is met and name the checks.`;
}

async function registerSpecs($: EngineInterface): Promise<void> {
	await Promise.all(SPECS.map((spec) => $.tool.register(spec)));
}

/**
 * Keeps the built-in goal tools out of the pool, and lets three of claudetto's
 * run unasked. The engine asks before any MCP tool, and a goal check keeps the
 * person away from the prompt: an unanswered ask kept the loop going to the
 * cap (RISK-520). Reading, pausing and an evidence-backed clear run unasked; a
 * settings rule keeps its verdict, and set_goal keeps the engine's ask.
 */
function registerPolicy(on: On): void {
	on("tool.offer", { tool: /^(?:Set|Pause|Get)Goal$/u }, () => ({
		isOffered: false
	})).catch(($, e, next) => {
		fault($, "goal tool offer", next.error);
		return next(e);
	});
	on("tool.check", { tool: SELF_SERVED }, async (_$, e, next) => {
		const verdict = await next(e);
		return verdict.decision === "deny" || verdict.rule !== undefined
			? verdict
			: { decision: "allow" };
	}).catch(($, _e, next) => {
		fault($, "goal tool check", next.error);
		return {
			decision: "ask",
			reason: "Could not check the goal tool"
		};
	});
}

/**
 * Serves `get_goal`, `set_goal`, `pause_goal` and `clear_goal`, and keeps the
 * built-in SetGoal, PauseGoal and GetGoal out of the pool so a session that
 * has the gate open is not offered both.
 */
export function registerTools(on: On, tracker: Tracker): void {
	// One registration per matcher value: settings/start.ts holds the unmatched one.
	on("session.start", { isInteractive: true }, async ($, e, next) => {
		await within($, START_CAP_MS, "goal tool register", () => registerSpecs($));
		return next(e);
	}).catch(($, e, next) => {
		fault($, "goal tool register", next.error);
		return next(e);
	});
	on("session.start", { isInteractive: false }, async ($, e, next) => {
		await within($, START_CAP_MS, "goal tool register", () => registerSpecs($));
		return next(e);
	}).catch(($, e, next) => {
		fault($, "goal tool register", next.error);
		return next(e);
	});
	registerPolicy(on);
	on("tool.run", { tool: /^mcp__claudetto__get_goal$/u }, () => ({
		result: show(tracker)
	})).catch(($, e, next) => {
		fault($, "get_goal", next.error);
		return next(e);
	});
	on("tool.run", { tool: /^mcp__claudetto__set_goal$/u }, ($, e) => ({
		result: set($, tracker, fieldOf(e, "condition"))
	})).catch(($, e, next) => {
		fault($, "set_goal", next.error);
		return next(e);
	});
	on("tool.run", { tool: /^mcp__claudetto__pause_goal$/u }, ($) => ({
		result: pause($, tracker)
	})).catch(($, e, next) => {
		fault($, "pause_goal", next.error);
		return next(e);
	});
	on("tool.run", { tool: /^mcp__claudetto__clear_goal$/u }, async ($, e) => ({
		result: await clear($, tracker, {
			condition: fieldOf(e, "condition"),
			checks: fieldOf(e, "checks")
		})
	})).catch(($, e, next) => {
		fault($, "clear_goal", next.error);
		return next(e);
	});
}
