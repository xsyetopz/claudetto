import type { EngineInterface, On } from "claude-code";

import { configDir } from "../settings/settings";
import { fault } from "../shared/fault";
import { START_CAP_MS, within } from "../shared/within";
import { tasksAfter } from "./activity";
import { baselinesAfter, partsOf } from "./baseline";
import {
	EMPTY_STATE,
	type LiveState,
	statePath,
	type Waiting,
	writeState
} from "./line/state";

/** The tool that puts a question to the person, whatever the permission mode says about it. */
const QUESTION_TOOL = "AskUserQuestion";

/**
 * Matches every value of a string field. These hooks observe every event of their
 * kind, and the engine refuses a second unmatched hook on an event another module
 * already hooks, so each registers with a match-all key instead.
 */
const ANY = /^/u;

const ANY_TURN = { turnId: ANY } as const;

/** The state of one session; a hook instance is per session, so the holder lives in the registration. */
export interface Live {
	state: LiveState;
}

/** A holder for one session's state, before its first event. */
export const newLive = (): Live => ({ state: EMPTY_STATE });

/** Writes the state file of this session; a failed write is logged and never fails the hook. */
async function save($: EngineInterface, state: LiveState): Promise<void> {
	try {
		await $.fs.write(
			statePath(await configDir($), await $.session.id()),
			writeState(state)
		);
	} catch (error) {
		fault($, "status state", error);
	}
}

/** `current` with `waiting` as the prompt it waits on. */
const waitingOn = (current: LiveState, waiting: Waiting): LiveState => ({
	...current,
	waiting
});

/** `current` with no waiting prompt. */
const answered = (current: LiveState): LiveState => {
	const { waiting: _dropped, ...rest } = current;
	return rest;
};

/** `current` with no permission or question prompt: a tool that starts running was allowed, so the prompt is answered. */
const answeredCall = (current: LiveState): LiveState =>
	current.waiting !== undefined && current.waiting.kind !== "input"
		? answered(current)
		: current;

/** The phase: working from a prompt until the turn ends, and then waiting on the next prompt. Subagent turns are skipped, since the lead's phase is the one shown. */
function registerPhase(on: On, live: Live): void {
	on("turn.start", ANY_TURN, async ($, e, next) => {
		if (e.agentId === undefined) {
			live.state = { ...answered(live.state), phase: "working" };
			await save($, live.state);
		}
		return next(e);
	});
	on("turn.complete", ANY_TURN, async ($, e, next) => {
		if (e.agentId === undefined) {
			live.state = {
				...waitingOn(live.state, { kind: "input" }),
				phase: "idle"
			};
			await save($, live.state);
		}
		return next(e);
	});
}

/**
 * The prompt a tool call raises, cleared when a tool starts running; each
 * started call is counted, and a task call updates the list. A
 * permission prompt is recorded at `classic.PermissionRequest`, which fires only
 * when a dialog opens: an `ask` verdict at `tool.check` goes to the mode's
 * decider first, and auto mode's classifier settles most with nobody asked.
 */
function registerPrompt(on: On, live: Live): void {
	on("tool.check", { tool: ANY }, async ($, e, next) => {
		const verdict = await next(e);
		if (
			e.tool_use_id !== undefined &&
			e.tool === QUESTION_TOOL &&
			verdict.decision !== "deny"
		) {
			live.state = waitingOn(live.state, {
				kind: "question",
				tool: e.tool
			});
			await save($, live.state);
		}
		return verdict;
	}).catch(($, e, next) => {
		fault($, "status tool check", next.error);
		return next(e);
	});
	on("classic.PermissionRequest", async ($, e, next) => {
		live.state = waitingOn(live.state, {
			kind: "permission",
			tool: e.tool_name
		});
		await save($, live.state);
		return next(e);
	}).catch(($, e, next) => {
		fault($, "status permission request", next.error);
		return next(e);
	});
	on("tool.run", async ($, e, next) => {
		const current = answeredCall(live.state);
		live.state = { ...current, tools: current.tools + 1 };
		await save($, live.state);
		const result = await next(e);
		const tasks = tasksAfter(live.state.tasks, e.tool, e, result.result);
		if (tasks !== undefined) {
			live.state = { ...live.state, tasks };
			await save($, live.state);
		}
		return result;
	}).catch(($, e, next) => {
		fault($, "status tool run", next.error);
		return next(e);
	});
}

/** Drops the state when the session ends, so a resumed one starts its own counts. */
function registerEnd(on: On, live: Live): void {
	on("session.end", { sessionId: ANY }, async ($, e, next) => {
		live.state = EMPTY_STATE;
		await save($, live.state);
		return next(e);
	});
}

/**
 * The rate-limit baselines and the context rows: the windows as the session
 * starts, then at each measure (after each turn, and when a window moves a
 * point) the rows /context's free local estimate gives, and any window seen
 * for the first time or reset since. The band and the usage pane redraw.
 */
function registerMeasure(on: On, live: Live): void {
	// A failed usage read is logged here rather than thrown: the session.start
	// hooks upstream would otherwise report it as their own failure.
	on("session.start", { cwd: ANY }, async ($, e, next) => {
		await within($, START_CAP_MS, "status session start", async () => {
			// The summary breakdown is a free local estimate. Its window is the auto-compact one,
			// so the first draw fills toward that window and not the model's 1M.
			try {
				const { rateLimits, context } = await $.session.usage({
					breakdown: "summary"
				});
				const now = await $.clock.now();
				const window = context.breakdown?.rawMaxTokens;
				live.state = {
					...live.state,
					limits: baselinesAfter(live.state.limits ?? [], rateLimits, now),
					...(window === undefined ? {} : { window })
				};
			} catch (error) {
				fault($, "status session start", error);
			}
			// Saved even when the usage read failed: the status line command draws only for a session with this file.
			await save($, live.state);
		});
		return next(e);
	});
	on("session.measure", async ($, e, next) => {
		try {
			const usage = await $.session.usage({ breakdown: "summary" });
			const breakdown = usage.context.breakdown;
			const categories = breakdown?.categories;
			const now = await $.clock.now();
			live.state = {
				...live.state,
				limits: baselinesAfter(live.state.limits ?? [], e.rateLimits, now),
				...(categories === undefined ? {} : { context: partsOf(categories) }),
				...(breakdown === undefined ? {} : { window: breakdown.rawMaxTokens })
			};
			await save($, live.state);
			$.ui.invalidate("ui.render");
		} catch (error) {
			fault($, "status measure", error);
		}
		return next(e);
	});
}

/**
 * Writes what the hooks observe in one session to the file the status line
 * command reads (ADR-0201): the turn phase, the prompt the session waits on
 * the person for, the tool call count, the task list, the context rows, and the rate-limit baselines. Each
 * change rewrites the whole file into `live`, which the usage pane reads too.
 */
export function registerLive(on: On, live: Live): void {
	registerPhase(on, live);
	registerPrompt(on, live);
	registerEnd(on, live);
	registerMeasure(on, live);
}
