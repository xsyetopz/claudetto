import type {
	ModelForkResult,
	PluginOptions,
	SessionCompactInput,
	SessionCompactResult,
	SessionContextUsage,
} from "claude-code";
import { finished } from "../handoff/finish.ts";
import { HANDOFF_TITLE, handoffPath } from "../handoff/handoff.ts";

export const HANDOVER_PROMPT =
	"Continue from the handoff above: take its next steps.";

/**
 * The handoff waiting for the compaction this plugin started. A plugin's own `$.session.compact` skips its own hook,
 * so the handover goes through `/compact`, and this marks that one apart from a typed or automatic compaction.
 */
let pending: string | undefined;

/** A reply whose first line is the template's title is a handoff, so no tool call is needed to announce one. */
export const isHandoff = (answer: string): boolean =>
	answer.trimStart().startsWith(`${HANDOFF_TITLE}\n`);

const COMPACTED = "The conversation was compacted. The handoff follows.";

/**
 * Keeps the first message by its handle, so the request after the handover starts with the same bytes as the
 * session's first one. An assistant line stands between, because the engine joins two user messages into one and
 * edits the first. The API still answers that prefix uncached, so the line keeps the bytes equal and wins no read.
 */
export const handOverTo = (
	e: SessionCompactInput,
): SessionCompactResult | undefined => {
	if (e.agentId !== undefined || e.trigger === "precompute") {
		return undefined;
	}
	declined = false;
	if (pending === undefined) {
		return undefined;
	}
	const text = pending;
	pending = undefined;
	const first = e.messages.slice(0, 1);
	return {
		messages: [
			...first,
			{ role: "assistant", text: COMPACTED, toolUses: [] },
			{ role: "user", text, toolUses: [] },
		],
	};
};

/** What the handover does to the session, built from `$` in the module that registers the hook. */
export interface Session {
	readonly write: (path: string, text: string) => Promise<unknown>;
	readonly compact: () => Promise<unknown>;
	readonly submit: (text: string) => Promise<unknown>;
	readonly log: (line: string) => void;
	readonly context: () => Promise<SessionContextUsage>;
	readonly fork: (prompt: string) => Promise<ModelForkResult>;
}

const save = async (session: Session, text: string): Promise<void> => {
	const path = handoffPath(new Date());
	try {
		await session.write(path, text);
	} catch (error) {
		session.log(`The handoff could not be saved to \`${path}\` (${error})`);
	}
};

/**
 * A handoff reply comes mid-task, so its next steps go on with no one typing. A fork runs after the turn answered the
 * user, so the handover waits for the user: a prompt then makes the model act on next steps that wait for the user.
 */
const handOver = async (
	session: Session,
	reply: string,
	isContinued: boolean,
): Promise<void> => {
	const text = finished(reply);
	await save(session, text);
	try {
		pending = text;
		await session.compact();
		if (pending !== undefined) {
			session.log(
				"The handoff compaction was answered elsewhere, so no next prompt was sent.",
			);
			return;
		}
	} catch (error) {
		session.log(`The handoff compaction failed (${error})`);
		return;
	} finally {
		pending = undefined;
	}
	handedOver = true;
	if (!isContinued) {
		return;
	}
	try {
		await session.submit(HANDOVER_PROMPT);
	} catch (error) {
		session.log(
			`The conversation was compacted to the handoff, and the next prompt failed (${error})`,
		);
	}
};

/** The default of `heavyTokens`, where the tool-call cap starts to hold calls. */
const HANDOVER_TOKENS = 400_000;

export const FORK_PROMPT = `The context is large. Write the handoff now, as the whole reply, in the layout of the context management block, starting with \`${HANDOFF_TITLE}\`.`;

/** Half of a small window, so a 200k model hands over before the engine compacts. */
export const handoverTokens = (
	options: PluginOptions,
	window: number,
): number => {
	const set = Number(options["handoverTokens"]);
	return Number.isFinite(set) && set > 0
		? set
		: Math.min(HANDOVER_TOKENS, window / 2);
};

/** Set while a fork runs, so a prompt typed meanwhile does not start a second one. */
let forking = false;

/**
 * Set from a handover to the end of the turn after it. That turn ending at the size means the handover did not shrink
 * the context below it, and a fork then would hand over and submit the next prompt again, turn after turn.
 */
let handedOver = false;

/** Set when a fork wrote no handoff, so each later turn does not pay for the same read again before a compaction. */
let declined = false;

const why = (reply: ModelForkResult): string =>
	reply.isAnswered ? "a reply without the title" : reply.reason;

/** At idle the fork repeats the last request and adds the final reply, so the cache serves the whole context. */
const forkHandover = async (
	session: Session,
	options: PluginOptions,
	afterHandover: boolean,
): Promise<void> => {
	if (forking || declined) {
		return;
	}
	const context = await session.context();
	const limit = handoverTokens(options, context.window);
	if (context.tokens === undefined || context.tokens < limit) {
		return;
	}
	if (afterHandover) {
		declined = true;
		session.log(
			`The context is still over ${limit} tokens after the handover, so no fork is asked before Claude Code's compaction runs.`,
		);
		return;
	}
	forking = true;
	try {
		const reply = await session.fork(FORK_PROMPT);
		if (!reply.isAnswered || !isHandoff(reply.text)) {
			declined = true;
			session.log(
				`The context passed ${limit} tokens, and the fork for a handoff came back with ${why(reply)}, so Claude Code's compaction stays, and no fork is asked again before it runs.`,
			);
			return;
		}
		await handOver(session, reply.text, false);
	} finally {
		forking = false;
	}
};

/** A handoff reply hands over as it is; any other reply hands over through a fork once the context is large. */
export const afterTurn = (
	session: Session,
	reply: string,
	options: PluginOptions,
): Promise<void> => {
	const afterHandover = handedOver;
	handedOver = false;
	return isHandoff(reply)
		? handOver(session, reply, true)
		: forkHandover(session, options, afterHandover);
};
