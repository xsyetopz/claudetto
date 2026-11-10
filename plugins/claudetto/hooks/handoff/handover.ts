import type {
	EngineInterface,
	ModelForkResult,
	PluginOptions,
	SessionCompactInput,
	SessionCompactResult,
} from "claude-code";

import { numberOption } from "../options.ts";
import { FORK_PROMPT, HANDOVER_PROMPT } from "../texts-handoff.ts";
import { atRoot, HANDOFF_TITLE, handoffPath } from "./layout.ts";
import { redactOf } from "./session.ts";

/** One registration's state. */
export interface HandoverState {
	/** The handoff waiting for the compaction this plugin started. */
	pending: string | undefined;
	forking: boolean;
	/** Set from a handover to the end of the turn after it: still over the size then means the handover did not shrink the context. */
	handedOver: boolean;
	/** Set when a fork wrote no handoff, so each later turn does not pay for the same read before a compaction. */
	declined: boolean;
}

export const newHandoverState = (): HandoverState => ({
	pending: undefined,
	forking: false,
	handedOver: false,
	declined: false,
});

/** A reply whose first line is the template's title is a handoff. */
export const isHandoff = (answer: string): boolean =>
	answer.trimStart().startsWith(`${HANDOFF_TITLE}\n`);

/** The set value, else the lesser of 400,000 and half the window. */
export const handoverTokens = (
	options: PluginOptions,
	window: number,
): number =>
	numberOption(
		options,
		"handoverThresholdTokens",
		Math.min(400_000, window / 2),
	);

/** Keeps the first message by its handle, so the request after the handover starts with the same bytes as the session's first. */
export const handOverTo = (
	state: HandoverState,
	e: SessionCompactInput,
): SessionCompactResult | undefined => {
	if (e.agentId !== undefined || e.trigger === "precompute") {
		return undefined;
	}
	state.declined = false;
	const text = state.pending;
	state.pending = undefined;
	return text === undefined
		? undefined
		: {
				messages: [
					...e.messages.slice(0, 1),
					{
						role: "assistant",
						text: "The conversation was compacted. The handoff follows.",
						toolUses: [],
					},
					{ role: "user", text, toolUses: [] },
				],
			};
};

async function handOver(
	$: EngineInterface,
	state: HandoverState,
	reply: string,
	isContinued: boolean,
): Promise<void> {
	const text = await redactOf($)(reply);
	const path = handoffPath(new Date());
	try {
		await $.fs.write(atRoot(await $.session.root(), path), text);
	} catch (error) {
		$.ui.log(
			`The handoff could not be saved to \`${path}\` (${String(error)})`,
		);
	}
	try {
		state.pending = text;
		await $.command.run({ command: "compact" });
		if (state.pending !== undefined) {
			$.ui.log(
				"The handoff compaction was answered elsewhere, so no next prompt was sent.",
			);
			return;
		}
	} catch (error) {
		$.ui.log(`The handoff compaction failed (${String(error)})`);
		return;
	} finally {
		state.pending = undefined;
	}
	state.handedOver = true;
	if (isContinued) {
		await $.prompt.submit({ text: HANDOVER_PROMPT }).catch((error: unknown) => {
			$.ui.log(
				`The conversation was compacted, and the next prompt failed (${String(error)})`,
			);
		});
	}
}

const why = (reply: ModelForkResult): string =>
	reply.isAnswered ? "a reply without the title" : reply.reason;

/** At idle the fork repeats the last request and adds the final reply, so the cache serves the whole context. */
async function forkHandover(
	$: EngineInterface,
	state: HandoverState,
	options: PluginOptions,
	afterHandover: boolean,
): Promise<void> {
	if (state.forking || state.declined) {
		return;
	}
	const { context } = await $.session.usage();
	const limit = handoverTokens(options, context.window);
	if (context.tokens === undefined || context.tokens < limit) {
		return;
	}
	if (afterHandover) {
		state.declined = true;
		$.ui.log(
			`The context is still over ${limit} tokens after the handover, so no fork is asked before the compaction runs.`,
		);
		return;
	}
	state.forking = true;
	try {
		const reply = await $.model.fork({ prompt: FORK_PROMPT });
		if (!reply.isAnswered || !isHandoff(reply.text)) {
			state.declined = true;
			$.ui.log(
				`The context passed ${limit} tokens, and the fork came back with ${why(reply)}, so the compaction stays.`,
			);
			return;
		}
		await handOver($, state, reply.text, false);
	} finally {
		state.forking = false;
	}
}

/** A handoff reply hands over as it is; any other reply hands over through a fork once the context is large. */
export function afterTurn(
	$: EngineInterface,
	state: HandoverState,
	reply: string,
	options: PluginOptions,
): Promise<void> {
	const afterHandover = state.handedOver;
	state.handedOver = false;
	return isHandoff(reply)
		? handOver($, state, reply, true)
		: forkHandover($, state, options, afterHandover);
}
