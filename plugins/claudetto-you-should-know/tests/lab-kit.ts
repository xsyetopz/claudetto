// Every call the plugin may make has an answer; any other throws and names its event.

import type {
	ModelCompleteInput,
	ModelCompleteResult,
	On,
	RenderSurface,
} from "claude-code";
import { type Engine, type MockClock, mock } from "claude-code/testing";

export const TURNED_ON = { enabled: true } as const;

export const SESSION = "s1";

const ZERO = {
	input_tokens: 0,
	output_tokens: 0,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
} as const;

export const answered = (text: string): ModelCompleteResult => ({
	isAnswered: true,
	text,
	usage: ZERO,
});

export const OFFER_REPLY = (line: string): string =>
	`learn: ${line}\ntag: You should know\nexplain: **A title**\nA body that says what it is.`;

export interface Lab {
	readonly asked: ModelCompleteInput[];
	readonly clock: MockClock;
	readonly store: Map<string, unknown>;
	readonly submitted: string[];
	readonly fills: string[];
	readonly toasts: string[];
	reply: (text: string) => void;
}

export interface Ground {
	surfaces?: readonly RenderSurface[];
	store?: Readonly<Record<string, unknown>>;
	box?: string;
	fill?: { isFilled: boolean };
}

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
	const submitted: string[] = [];
	const fills: string[] = [];
	const toasts: string[] = [];
	on("prompt.submit", (_$, e) => {
		if (e.origin.kind === "plugin") {
			submitted.push(e.text);
		}
		return { text: e.text };
	});
	on("prompt.read", () => ({
		value: { text: ground.box ?? "", cursor: 0 },
	}));
	on("prompt.fill", (_$, e) => {
		fills.push(e.text);
		return ground.fill ?? { isFilled: true };
	});
	on("ui.toast", (_$, e) => {
		toasts.push(e.text);
		return { value: undefined };
	});
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
		submitted,
		fills,
		toasts,
		reply: (next) => {
			text = next;
		},
	};
};

export const typed = ($: Engine, text: string) =>
	$.prompt.submit({ text, wait: false, origin: { kind: "composer" } });

export const BAND = {
	hasSurvey: false,
	isWorking: false,
	maxRows: 12,
	bodyColumns: 80,
	scroll: { offset: 0, bodyRows: 12 },
	view: {},
} as const;

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
