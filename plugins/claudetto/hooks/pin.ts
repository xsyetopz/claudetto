import type { EngineInterface, On, SessionMessage } from "claude-code";

import type {
	CallAnswer,
	CallEvent,
	CallNext,
	CheckAnswer,
	CheckEvent,
	CheckNext,
} from "./chain.ts";
import { deny } from "./gate/verdict.ts";
import { readLedger } from "./pin-ledger.ts";
import { breaks } from "./pin-rules.ts";
import {
	PIN_ANSWER_FIRST,
	PIN_BLOCKED,
	PIN_COMPACT,
	PIN_NO_QUESTIONS,
	PIN_NOTE,
	type PinConstraint,
	type PinKind,
} from "./texts-handoff.ts";
import { ASK_TOOL, isPersonMessage } from "./verify.ts";

export const PERSON = /^(?:composer|bridge|sdk)$/u;

const personTexts = async ($: EngineInterface): Promise<string[]> => {
	const messages = await $.session.messages();
	return messages.filter((item) => isPersonMessage(item)).map((m) => m.text);
};

/** The repo root as the cwd spells it: `cdup` is `git rev-parse --show-cdup`, one `../` per level up. */
export const rootOf = (cwd: string, cdup: string): string =>
	cwd
		.split("/")
		.slice(0, cwd.split("/").length - (cdup.split("../").length - 1))
		.join("/");

// Built-ins that change nothing: a question that needs one of them gets the lookup, not the answer-first gate.
const LOOKUPS: ReadonlySet<string> = new Set([
	"ListAgents",
	"Read",
	"Grep",
	"Glob",
]);

const hasSpoken = (messages: SessionMessage[]): boolean =>
	messages
		.slice(messages.findLastIndex((item) => isPersonMessage(item)) + 1)
		.some((m) => m.role === "assistant" && m.text !== "");

/** Whether a call waits for the answer to the latest message. A dispute is settled by running the disputed code, so its command passes. The person's message reaches the main loop only, so a running subagent has nothing to answer first. */
const awaitsAnswer = (
	kind: PinKind,
	e: { readonly tool: string; readonly agentId?: string | undefined },
): boolean =>
	e.agentId === undefined &&
	kind !== "task" &&
	!(kind !== "remark" && LOOKUPS.has(e.tool)) &&
	!(kind === "dispute" && e.tool === "Bash");

export interface PinState {
	ledger: PinConstraint[];
	/** What the latest person message is; a read that fails leaves it a task, which no check touches. */
	kind: PinKind;
	/** The message count at which the answer-first deny fired this turn: calls of that one batch are denied, the retry is not. */
	nudgedAt: number;
	/** The Decider reads the message beside the reply so the prompt is not held for it; tool.check waits on it. */
	pending: Promise<void>;
}

const isFirstBatch = (s: PinState, messages: SessionMessage[]): boolean =>
	s.nudgedAt < 0 || s.nudgedAt === messages.length;

// Each read updates the ledger the read before it left, so it starts once that one has settled.
const adopt = async (
	$: EngineInterface,
	s: PinState,
	earlier: string[],
	text: string,
	before: Promise<void>,
): Promise<void> => {
	await before;
	try {
		const read = await readLedger($, earlier, text, s.ledger);
		s.ledger = read.ledger;
		s.kind = read.kind;
	} catch (error) {
		$.ui.log(`The constraint ledger was not read (${String(error)})`);
	}
};

const ledgerHooks = (on: On, s: PinState): void => {
	// A resumed session holds person messages this process never saw: its first read covers them, and its first prompt waits for that read, so the note rides it.
	let seen = false;
	on("prompt.submit", { origin: { kind: PERSON } }, async ($, e, next) => {
		s.kind = "task";
		s.nudgedAt = -1;
		if (!(e.command || e.isMeta)) {
			const said = seen ? [] : await personTexts($);
			const earlier = said.filter((t) => t !== e.text);
			seen = true;
			s.pending = adopt($, s, earlier, e.text, s.pending);
			if (earlier.length > 0) {
				await s.pending;
			}
		}
		const shown = s.ledger;
		return shown.length === 0
			? next(e)
			: next({ ...e, context: [...(e.context ?? []), PIN_NOTE(shown)] });
	});
	on("session.compact", async (_$, e, next) => {
		await s.pending;
		// The summary that follows is a user message no person wrote: the answer-first gate would read it as an unanswered remark.
		s.kind = "task";
		return s.ledger.length === 0
			? next(e)
			: next({ ...e, instructions: PIN_COMPACT(e.instructions, s.ledger) });
	});
};

/** Denies the ask tool while a no-questions constraint stands. `delegation` answers the ask tool in its own `tool.call`, so `tool.check` never runs for it: the ask's checks sit here, and the chain puts `pin` first. */
export async function pinCall(
	e: CallEvent,
	next: CallNext,
	state: PinState,
): Promise<Awaited<CallAnswer>> {
	if (!ASK_TOOL.test(e.tool)) {
		return next(e);
	}
	await state.pending;
	const hit = state.ledger.find((c) => c.rule === "no-questions");
	return hit === undefined ? next(e) : { deny: PIN_NO_QUESTIONS(hit.text) };
}

/** Denies a call that breaks a pinned constraint, and the first batch of calls made before the answer to a question or dispute. */
export async function pinCheck(
	$: EngineInterface,
	e: CheckEvent,
	next: CheckNext,
	state: PinState,
): Promise<Awaited<CheckAnswer>> {
	await state.pending;
	const hit = state.ledger.find((c) => breaks(c, e.tool, e.input));
	if (hit !== undefined) {
		return deny(PIN_BLOCKED(hit.text));
	}
	if (!awaitsAnswer(state.kind, e)) {
		return next(e);
	}
	const messages = await $.session.messages();
	if (!hasSpoken(messages) && isFirstBatch(state, messages)) {
		state.nudgedAt = messages.length;
		return deny(PIN_ANSWER_FIRST);
	}
	return next(e);
}

export const pinState = (): PinState => ({
	ledger: [],
	kind: "task",
	nudgedAt: -1,
	pending: Promise.resolve(),
});

export const pin = (on: On, state: PinState): void => {
	ledgerHooks(on, state);
};
