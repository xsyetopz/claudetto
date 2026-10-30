// What every lab case stands on: the answers beneath the plugin, where the engine would be. Every
// call the plugin may make has an answer here and nothing else has one, so a call outside the
// surface throws and names its event, and no model is ever reached.

import type {
	ModelCompleteInput,
	ModelCompleteResult,
	On,
	RenderSurface,
} from "claude-code";
import { type Engine, type MockClock, mock } from "claude-code/testing";

/** The options of a plugin that was turned on by hand. */
export const TURNED_ON = { enabled: true } as const;

/** The session every case runs in. */
export const SESSION = "s1";

const ZERO = {
	input_tokens: 0,
	output_tokens: 0,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
} as const;

/** An answered call whose reply is `text`. */
export const answered = (text: string): ModelCompleteResult => ({
	isAnswered: true,
	text,
	usage: ZERO,
});

/** A reply that offers one line with an explanation. */
export const OFFER_REPLY = (line: string): string =>
	`learn: ${line}\ntag: You should know\nexplain: **A title**\nA body that says what it is.`;

export interface Lab {
	/** Each request the plugin made to the model, in order. */
	readonly asked: ModelCompleteInput[];
	readonly clock: MockClock;
	/** What the plugin has written to its store, as a later read would find it. */
	readonly store: Map<string, unknown>;
	/** What the next answer carries. */
	reply: (text: string) => void;
}

/** What a case may set beneath the plugin: what is drawn, and what the store already holds. */
export interface Ground {
	surfaces?: readonly RenderSurface[];
	store?: Readonly<Record<string, unknown>>;
}

/** An offer that is open in the session, as the store keeps it. */
export const openRow = (
	kind: "offer" | "asked" | "explained",
	line = "Tests run in order.",
) => ({
	id: SESSION,
	view: { kind, line, explanation: "", shownAt: 1000 },
	tag: "You should know",
	offeredTurn: "t0",
	askedTurn: "t0",
});

/** Puts the answers beneath the plugin. */
export const lab = (on: On, ground: Ground = {}): Lab => {
	const clock = mock.clock(on, { now: 1000 });
	const store = new Map<string, unknown>(Object.entries(ground.store ?? {}));
	on("store.get", (_$, e) => ({ value: store.get(e.key) }));
	on("store.set", (_$, e) => {
		store.set(e.key, structuredClone(e.value));
		return { value: undefined };
	});
	const asked: ModelCompleteInput[] = [];
	let text = "learn: none";
	on("session.id", () => ({ value: SESSION }));
	on("session.surfaces", () => ({
		value: ground.surfaces ?? ["terminal"],
	}));
	on("ui.invalidate", () => ({ value: undefined }));
	on("ui.render", () => ({ type: "Box" }));
	on("prompt.submit", (_$, e) => ({ text: e.text }));
	on("session.end", (_$, e) => ({ sessionId: e.sessionId }));
	on("model.complete", (_$, e) => {
		asked.push(e);
		return { value: answered(text) };
	});
	on("turn.step", async function* (_$, e) {
		yield { kind: "text", index: 0, text: "" };
		return {
			turnId: e.turnId,
			index: e.index,
			answer: "",
			toolUses: [],
			stopReason: "end_turn",
			usage: null,
		};
	});
	return {
		asked,
		clock,
		store,
		reply: (next) => {
			text = next;
		},
	};
};

/** The person typing a prompt at the composer. */
export const typed = ($: Engine, text: string) =>
	$.prompt.submit({ text, wait: false, origin: { kind: "composer" } });

/** The props the band is drawn with when no survey holds it. */
export const BAND = {
	hasSurvey: false,
	isWorking: false,
	maxRows: 12,
	bodyColumns: 80,
	scroll: { offset: 0, bodyRows: 12 },
	view: {},
} as const;

/** Runs one step of a turn to its end, then lets what it scheduled run. */
export const step = async (
	$: Engine,
	l: Lab,
	at: { turnId: string; index: number; agentId?: string },
): Promise<void> => {
	const chunks: unknown[] = [];
	for await (const chunk of $.turn.step({
		turnId: at.turnId,
		index: at.index,
		model: "m",
		messageCount: 1,
		...(at.agentId === undefined ? {} : { agentId: at.agentId }),
	})) {
		chunks.push(chunk);
	}
	await l.clock.settle();
};

/** Runs the steps `from` to `to` of one turn, one after the other. */
export const steps = async (
	$: Engine,
	l: Lab,
	turnId: string,
	range: { from: number; to: number },
): Promise<void> => {
	if (range.from > range.to) {
		return;
	}
	await step($, l, { turnId, index: range.from });
	await steps($, l, turnId, { from: range.from + 1, to: range.to });
};
