import type {
	ModelForkResult,
	PluginOptions,
	SessionCompactInput,
	SessionCompactResult,
	SessionContextUsage,
} from "claude-code";

import { numberOption } from "../options.ts";
import { FORK_PROMPT, HANDOVER_PROMPT } from "../texts-handoff.ts";
import { HANDOFF_TITLE, handoffPath } from "./layout.ts";

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

/** What the handover does to the session, built from `$` in the module that registers the hook. */
export interface Session {
	readonly write: (path: string, text: string) => Promise<unknown>;
	/** Rejects when the secret scanner cannot run. */
	readonly redact: (text: string) => Promise<string>;
	readonly compact: () => Promise<unknown>;
	readonly submit: (text: string) => Promise<unknown>;
	readonly log: (line: string) => void;
	readonly context: () => Promise<SessionContextUsage>;
	readonly fork: (prompt: string) => Promise<ModelForkResult>;
}

const handOver = async (
	session: Session,
	state: HandoverState,
	reply: string,
	isContinued: boolean,
): Promise<void> => {
	const text = await session.redact(reply);
	const path = handoffPath(new Date());
	try {
		await session.write(path, text);
	} catch (error) {
		session.log(
			`The handoff could not be saved to \`${path}\` (${String(error)})`,
		);
	}
	try {
		state.pending = text;
		await session.compact();
		if (state.pending !== undefined) {
			session.log(
				"The handoff compaction was answered elsewhere, so no next prompt was sent.",
			);
			return;
		}
	} catch (error) {
		session.log(`The handoff compaction failed (${String(error)})`);
		return;
	} finally {
		state.pending = undefined;
	}
	state.handedOver = true;
	if (isContinued) {
		await session.submit(HANDOVER_PROMPT).catch((error: unknown) => {
			session.log(
				`The conversation was compacted, and the next prompt failed (${String(error)})`,
			);
		});
	}
};

const why = (reply: ModelForkResult): string =>
	reply.isAnswered ? "a reply without the title" : reply.reason;

/** At idle the fork repeats the last request and adds the final reply, so the cache serves the whole context. */
const forkHandover = async (
	session: Session,
	state: HandoverState,
	options: PluginOptions,
	afterHandover: boolean,
): Promise<void> => {
	if (state.forking || state.declined) {
		return;
	}
	const context = await session.context();
	const limit = handoverTokens(options, context.window);
	if (context.tokens === undefined || context.tokens < limit) {
		return;
	}
	if (afterHandover) {
		state.declined = true;
		session.log(
			`The context is still over ${limit} tokens after the handover, so no fork is asked before the compaction runs.`,
		);
		return;
	}
	state.forking = true;
	try {
		const reply = await session.fork(FORK_PROMPT);
		if (!reply.isAnswered || !isHandoff(reply.text)) {
			state.declined = true;
			session.log(
				`The context passed ${limit} tokens, and the fork came back with ${why(reply)}, so the compaction stays.`,
			);
			return;
		}
		await handOver(session, state, reply.text, false);
	} finally {
		state.forking = false;
	}
};

/** A handoff reply hands over as it is; any other reply hands over through a fork once the context is large. */
export const afterTurn = (
	session: Session,
	state: HandoverState,
	reply: string,
	options: PluginOptions,
): Promise<void> => {
	const afterHandover = state.handedOver;
	state.handedOver = false;
	return isHandoff(reply)
		? handOver(session, state, reply, true)
		: forkHandover(session, state, options, afterHandover);
};
