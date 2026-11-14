import type {
	ModelCompleteInput,
	On,
	PromptFilled,
	PromptOrigin,
	RenderSurface,
} from "claude-code";
import { type Engine, mock } from "claude-code/testing";

import { blankRow, type Row } from "./note";
import { rowsOf } from "./store";

const PLUGIN = "claudetto-you-should-know";
export const ON = { options: { sideCheckEnabled: true } };
export const LINE = "Tests run in order.";

const USAGE = {
	input_tokens: 0,
	output_tokens: 0,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
} as const;

export const offerReply = (line: string): string =>
	`learn: ${line}\ntag: You should know\nexplain: **A title**\nA body that says what it is.`;

export interface Ground {
	surfaces?: readonly RenderSurface[];
	store?: Readonly<Record<string, unknown>>;
	box?: string;
	fill?: PromptFilled;
	fault?: boolean;
	unanswered?: boolean;
	idFault?: boolean;
	answer?: string;
	choices?: Readonly<Record<string, string>>;
}

export const openRow = (
	kind: "offer" | "asked" | "explained",
	explanation = "",
): Row => ({
	...blankRow("s1"),
	view: { kind, line: LINE, explanation, shownAt: 1000 },
	offeredTurn: "t0",
	askedTurn: "t0",
});

export const CARD = "**Order**\nTests run top to bottom.";

const wireSession = (on: On, ground: Ground): Map<string, unknown> => {
	const store = new Map<string, unknown>(Object.entries(ground.store ?? {}));
	on("store.get", (_$, e) => ({ value: store.get(e.key) }));
	on("store.set", (_$, e) => {
		store.set(e.key, structuredClone(e.value));
		return { value: undefined };
	});
	on("session.id", () => {
		if (ground.idFault === true) {
			throw new Error("no session");
		}
		return { value: "s1" };
	});
	on("session.surfaces", () => ({ value: ground.surfaces ?? ["terminal"] }));
	on("session.end", (_$, e) => ({ sessionId: e.sessionId }));
	on("ui.invalidate", () => ({ value: undefined }));
	on("ui.render", () => ({ type: "Box" }));
	return store;
};

const wirePrompt = (on: On, ground: Ground) => {
	const seen: Record<"submitted" | "fills" | "toasts", string[]> = {
		submitted: [],
		fills: [],
		toasts: [],
	};
	on("prompt.submit", (_$, e) => {
		if (e.origin.kind === "plugin") {
			seen.submitted.push(e.text);
		}
		return { text: e.text };
	});
	on("prompt.read", () => ({ value: { text: ground.box ?? "", cursor: 0 } }));
	on("prompt.fill", (_$, e) => {
		seen.fills.push(e.text);
		return ground.fill ?? { isFilled: true };
	});
	on("ui.toast", (_$, e) => {
		seen.toasts.push(e.text);
		return { value: undefined };
	});
	return seen;
};

const wireStep = (on: On, ground: Ground): void => {
	on("turn.step", async function* (_$, e) {
		const answer = await Promise.resolve(ground.answer ?? "");
		yield { kind: "text", index: 0, text: "" };
		return {
			turnId: e.turnId,
			index: e.index,
			answer,
			toolUses: [],
			stopReason: "end_turn",
			usage: null,
		};
	});
};

const answerOf = (ground: Ground, reply: string) =>
	ground.unanswered === true
		? { isAnswered: false as const, reason: "aborted" as const, usage: USAGE }
		: { isAnswered: true as const, text: reply, usage: USAGE };

export const fixture = (on: On, ground: Ground = {}) => {
	const clock = mock.clock(on, { now: 1000 });
	const store = wireSession(on, ground);
	const { submitted, fills, toasts } = wirePrompt(on, ground);
	const asked: ModelCompleteInput[] = [];
	const ran: string[] = [];
	let reply = "learn: none";
	let held: Promise<boolean> | undefined;
	on("tool.call", (_$, e) => {
		ran.push(e.tool);
		return e.tool === "AskUserQuestion"
			? { result: { questions: e.questions, answers: ground.choices ?? {} } }
			: { result: "ok", text: "ok" };
	});
	on("model.complete", async (_$, e) => {
		asked.push(e);
		await held;
		if (ground.fault === true) {
			throw new Error("model fault");
		}
		return { value: answerOf(ground, reply) };
	});
	wireStep(on, ground);
	return {
		asked,
		clock,
		store,
		submitted,
		fills,
		toasts,
		ran,
		answerWith: (text: string) => {
			reply = text;
		},
		hold: (): (() => void) => {
			// `claude plugin validate` types this file against `es2023`, which lacks `Promise.withResolvers`; the executor runs before `new` returns.
			let release!: (value: boolean) => void;
			held = new Promise<boolean>((resolve) => {
				release = resolve;
			});
			return () => {
				release(true);
			};
		},
		row: () => rowsOf(store.get("sessions"))[0],
		body: (): string => asked[0]?.promptBlocks?.[1]?.text ?? "",
		instructions: (): string => asked[0]?.promptBlocks?.[0]?.text ?? "",
	};
};

export type Fixture = ReturnType<typeof fixture>;

const COMPOSER: PromptOrigin = { kind: "composer" };

export const typed = (
	$: Engine,
	text: string,
	origin: PromptOrigin = COMPOSER,
) => $.prompt.submit({ text, wait: false, origin });

export const step = async (
	$: Engine,
	f: Fixture,
	at: { turnId: string; index: number; agentId?: string },
): Promise<void> => {
	const chunks = $.turn.step({
		turnId: at.turnId,
		index: at.index,
		model: "m",
		messageCount: 1,
		...(at.agentId === undefined ? {} : { agentId: at.agentId }),
	});
	const drained: unknown[] = [];
	for await (const chunk of chunks) {
		drained.push(chunk);
	}
	await f.clock.settle();
};

export const PUSH = { tool: "Bash", command: "git push" } as const;

export const act = async (
	$: Engine,
	f: Fixture,
	turnId: string,
	call: Parameters<Engine["tool"]["call"]>[0] = PUSH,
) => {
	await step($, f, { turnId, index: 1 });
	return $.tool.call(call);
};

export const mountBand = (
	$: Engine,
	hasSurvey = false,
	surface: RenderSurface = "terminal",
) =>
	$.ui.mount({
		plugin: PLUGIN,
		surface,
		component: "AbovePrompt",
		props: {
			hasSurvey,
			isCollapsed: false,
			isWorking: false,
			maxRows: 12,
			bodyColumns: 80,
			scroll: { offset: 0, bodyRows: 12 },
			view: {},
		},
	});

export const inOrder = async <T>(
	items: readonly T[],
	run: (item: T) => Promise<unknown>,
): Promise<void> => {
	const [head, ...rest] = items;
	if (head !== undefined) {
		await run(head);
		await inOrder(rest, run);
	}
};

export const BACKED_OFF = { ignored: 4, skips: 8 };

export const pressed = async (
	$: Engine,
	on: On,
	kind: "offer" | "asked",
	key: string,
) => {
	const f = fixture(on, {
		store: { sessions: [openRow(kind)], ...BACKED_OFF },
	});
	const band = await mountBand($);
	await band.press({ key });
	return f;
};

/** The log entries of a check body, one per line after its heading. */
export const logOf = (body: string): readonly string[] =>
	body.split("Latest work:\n")[1]?.split("\n") ?? [];
