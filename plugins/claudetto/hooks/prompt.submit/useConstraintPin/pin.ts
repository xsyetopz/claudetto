import type { EngineInterface, On } from "claude-code";

import type {
	CallAnswer,
	CallEvent,
	CallNext,
	CheckAnswer,
	CheckEvent,
	CheckNext,
} from "../../chain";
import {
	PIN_BLOCKED,
	PIN_COMPACT,
	PIN_NO_QUESTIONS,
	PIN_NOTE,
	type PinConstraint,
} from "../../texts-pin";
import { deny } from "../../tool.check/useBashRules/verdict";
import { ASK_TOOL, isPersonMessage } from "../../verify";
import { readLedger } from "./pin-ledger";
import { breaks } from "./pin-rules";

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

export interface PinState {
	ledger: PinConstraint[];
	/** The Decider reads the message beside the reply so the prompt is not held for it; tool.check waits on it. */
	pending: Promise<void>;
}

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
		s.ledger = await readLedger($, earlier, text, s.ledger);
	} catch (error) {
		$.ui.log(`The constraint ledger was not read (${String(error)})`);
	}
};

const ledgerHooks = (on: On, s: PinState): void => {
	// A resumed session holds person messages this process never saw: its first read covers them, and its first prompt waits for that read, so the note rides it.
	let seen = false;
	on("prompt.submit", { origin: { kind: PERSON } }, async ($, e, next) => {
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
		return next({
			...e,
			instructions: PIN_COMPACT(e.instructions, s.ledger),
		});
	});
};

/** Denies `AskUserQuestion` while a no-questions constraint stands. */
export async function pinCall(
	e: CallEvent,
	next: CallNext,
	state: PinState,
): Promise<Awaited<CallAnswer>> {
	if (e.tool !== ASK_TOOL) {
		return next(e);
	}
	await state.pending;
	const hit = state.ledger.find((c) => c.rule === "no-questions");
	return hit === undefined ? next(e) : { deny: PIN_NO_QUESTIONS(hit.text) };
}

/** Denies a call that breaks a pinned constraint. */
export async function pinCheck(
	e: CheckEvent,
	next: CheckNext,
	state: PinState,
): Promise<Awaited<CheckAnswer>> {
	await state.pending;
	const hit = state.ledger.find((c) => breaks(c, e.tool, e.input));
	return hit === undefined ? next(e) : deny(PIN_BLOCKED(hit.text));
}

export const pinState = (): PinState => ({
	ledger: [],
	pending: Promise.resolve(),
});

export const pin = (on: On, state: PinState): void => {
	ledgerHooks(on, state);
};
