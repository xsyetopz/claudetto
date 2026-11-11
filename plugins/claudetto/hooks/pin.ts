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
import { breaks } from "./pin-rules.ts";
import {
	PIN_ANSWER_FIRST,
	PIN_BLOCKED,
	PIN_COMPACT,
	PIN_EXTRACT,
	PIN_NO_QUESTIONS,
	PIN_NOTE,
	type PinConstraint,
	type PinKind,
} from "./texts-handoff.ts";
import { isRecord } from "./tools.ts";
import { ASK_TOOL, isPersonMessage } from "./verify.ts";

export const PERSON = /^(?:composer|bridge|sdk)$/u;
const RULES: ReadonlySet<unknown> = new Set<PinConstraint["rule"]>([
	"read-only",
	"no-commit",
	"no-push",
	"only-files",
	"no-questions",
	"none",
]);
const isRule = (x: unknown): x is PinConstraint["rule"] => RULES.has(x);

const flat = (s: string) => s.toLowerCase().replaceAll(/\s+/gu, " ").trim();

// An entry stands only on words a message of the person holds, so a remark or the agent's own text sets none.
const toConstraint = (c: unknown, said: string[]): PinConstraint[] => {
	if (!(
		isRecord(c) &&
		typeof c["text"] === "string" &&
		typeof c["quote"] === "string" &&
		flat(c["quote"]) !== "" &&
		isRule(c["rule"])
	)) {
		return [];
	}
	const quote = flat(c["quote"]);
	if (!said.some((t) => flat(t).includes(quote))) {
		return [];
	}
	const files = c["files"];
	return [
		{
			text: c["text"],
			rule: c["rule"],
			quote: c["quote"],
			...(Array.isArray(files) ? { files: files.map(String) } : {}),
		},
	];
};

const KINDS: ReadonlySet<unknown> = new Set<PinKind>([
	"remark",
	"question",
	"dispute",
	"task",
]);
const isKind = (x: unknown): x is PinKind => KINDS.has(x);

interface Extraction {
	constraints: PinConstraint[];
	kind: PinKind;
}

const parseLedger = (text: string, said: string[]): Extraction | undefined => {
	try {
		const json: unknown = JSON.parse(
			text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
		);
		const list = isRecord(json) ? json["constraints"] : undefined;
		const kind = isRecord(json) ? json["kind"] : undefined;
		return Array.isArray(list)
			? {
					constraints: list.flatMap((c) => toConstraint(c, said)),
					kind: isKind(kind) ? kind : "task",
				}
			: undefined;
	} catch {
		return undefined;
	}
};

const personTexts = async ($: EngineInterface): Promise<string[]> => {
	const messages = await $.session.messages();
	return messages.filter((item) => isPersonMessage(item)).map((m) => m.text);
};

const extractLedger = async (
	$: EngineInterface,
	text: string,
	previous: PinConstraint[],
): Promise<Extraction | undefined> => {
	const history = await personTexts($);
	const r = await $.model.complete({
		model: "haiku",
		prompt: PIN_EXTRACT(history, previous, text),
		maxTokens: 600,
		timeoutMs: 20_000,
	});
	return r.isAnswered ? parseLedger(r.text, [...history, text]) : undefined;
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
	/** What the latest person message is; a failed extraction leaves it a task, which no check touches. */
	kind: PinKind;
	/** The message count at which the answer-first deny fired this turn: calls of that one batch are denied, the retry is not. */
	nudgedAt: number;
	/** The extraction runs beside the reply so the prompt is not held for it; tool.check waits on it. */
	pending: Promise<void>;
}

const isFirstBatch = (s: PinState, messages: SessionMessage[]): boolean =>
	s.nudgedAt < 0 || s.nudgedAt === messages.length;

const adopt = async (
	s: PinState,
	job: Promise<Extraction | undefined>,
): Promise<void> => {
	const found = await job.catch(() => void 0);
	// A failed or unreadable answer keeps the last ledger rather than dropping constraints.
	s.ledger = found?.constraints ?? s.ledger;
	s.kind = found?.kind ?? s.kind;
};

const ledgerHooks = (on: On, s: PinState): void => {
	// A resumed session holds person messages this process never saw: its first prompt waits for the extraction, so the note rides it.
	let seen = false;
	on("prompt.submit", { origin: { kind: PERSON } }, async ($, e, next) => {
		s.kind = "task";
		s.nudgedAt = -1;
		if (!(e.command || e.isMeta)) {
			s.pending = adopt(s, extractLedger($, e.text, s.ledger));
			const awaited = await personTexts($);
			const earlier = awaited.some((t) => t !== e.text);
			if (!seen && earlier) {
				await s.pending;
			}
			seen = true;
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
