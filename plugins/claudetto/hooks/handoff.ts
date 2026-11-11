import type { EngineInterface, On, PluginOptions } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "./chain.ts";
import { type CallState, handOff } from "./handoff/call.ts";
import {
	afterTurn,
	type HandoverState,
	handOverTo,
	newHandoverState,
} from "./handoff/handover.ts";
import { readBack, writeHandoff } from "./handoff/session.ts";
import { HANDOFF_INPUT_SCHEMA } from "./handoff/tool.ts";
import {
	contextManagementText,
	HANDOFF_TOOL,
	TOOL_HANDOFF,
} from "./texts-handoff.ts";

const ANY_ID = /./u;

/** The turn and goal that the handoff call needs, and whether a handoff runs. */
export type HandoffState = CallState;

/** Makes the handoff call state of one session. */
export const handoffState = (): HandoffState => ({
	handingOff: false,
	turn: undefined,
	goal: undefined,
});

/** The handoff block rides the first user message's context: a hook cannot write Claude's handoff itself. */
const handoffBlock = {
	name: "context_management",
	text: contextManagementText(),
};

const HANDOFF_CALLED = /^mcp__claudetto__handoff$/u;

/** Writes a handoff from the transcript before each compaction, and hands the work over when one was installed. */
const onCompact = (
	on: On,
	handover: HandoverState,
	watched: { transcript: string | undefined },
): void => {
	on(
		"session.compact",
		{ trigger: ["manual", "auto", "plugin"] },
		async ($, e, next) => {
			const installed = handOverTo(handover, e);
			if (installed !== undefined) {
				return installed;
			}
			if (e.agentId === undefined) {
				await writeHandoff(
					$,
					e.messages,
					watched.transcript,
					`compaction ${e.trigger}`,
				);
			}
			return next(e);
		},
	);
};

const onSessionStart = (on: On): void => {
	on("session.start", { isInteractive: [true, false] }, async ($, e, next) => {
		const spec = {
			name: HANDOFF_TOOL,
			description: TOOL_HANDOFF,
			inputSchema: HANDOFF_INPUT_SCHEMA,
		};
		// `$.tool.register` rejects until the session binds, so an early refusal is retried after the start.
		let early = true;
		try {
			await $.tool.register(spec);
		} catch (error) {
			$.ui.log(
				`The handoff tool is not registered yet, so it is retried after the start (${String(error)})`,
			);
			early = false;
		}
		const started = await next(e);
		if (!early) {
			try {
				await $.tool.register(spec);
			} catch (error) {
				// The tool stays unregistered; the code-built handoff still works.
				$.ui.log(`The handoff tool was not registered (${String(error)})`);
			}
		}
		return started;
	});
};

/** Follows the turn id and the goal that the handoff call needs. */
const onCallState = (on: On, call: CallState): void => {
	on("turn.start", { turnId: [ANY_ID] }, (_$, e, next) => {
		if (e.agentId === undefined) {
			call.turn = e.turnId;
		}
		return next(e);
	});
	// No type or event shows the active goal: its `goal_status` row is a sentinel the engine renders as nothing, so the command is what is seen.
	on("command.run", { command: ["goal"] }, (_$, e, next) => {
		const condition = e.args.trim();
		if (condition !== "") {
			call.goal = condition === "clear" ? undefined : condition;
		}
		return next(e);
	});
};

/** Answers a call of the handoff tool with the handoff's result; every other tool passes on. */
export async function handoffCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
	call: HandoffState,
): Promise<Awaited<CallAnswer>> {
	if (!HANDOFF_CALLED.test(e.tool)) {
		return next(e);
	}
	return { result: await handOff($, call, e) };
}

const onPromptContext = (on: On): void => {
	on("prompt.context", async (_$, e, next) => {
		const answer = await next(e);
		return { ...answer, blocks: [...answer.blocks, handoffBlock] };
	});
	on("prompt.section", { name: ["context_management"] }, () => ({
		text: null,
	}));
};

/** Runs from a timer: `$.command.run` is queued until the session is idle, and it is not while this hook runs. */
const onTurnComplete = (
	on: On,
	handover: HandoverState,
	options: PluginOptions,
): void => {
	on("turn.complete", { isAborted: [false] }, async ($, e, next) => {
		const answer = await next(e);
		if (e.agentId === undefined && e.reason === "answer") {
			$.clock.after(0, () => {
				afterTurn($, handover, e.answer, options).catch((error: unknown) => {
					$.ui.log(`The handover failed (${String(error)})`);
				});
			});
		}
		return answer;
	});
};

export const handoff = (
	on: On,
	options: PluginOptions,
	call: HandoffState,
): void => {
	const handover: HandoverState = newHandoverState();
	const watched: { transcript: string | undefined } = { transcript: undefined };
	onCompact(on, handover, watched);
	onSessionStart(on);
	onCallState(on, call);
	on("classic.SessionStart", async ($, e, next) => {
		watched.transcript = e.transcript_path;
		if (e.source === "resume") {
			await readBack($, e.transcript_path);
		}
		return next(e);
	});
	onPromptContext(on);
	onTurnComplete(on, handover, options);
};
