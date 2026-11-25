/** Shared fixtures for the mounted-flow tests. */

import type { On, RenderPropsOf, RenderSurface } from "claude-code";
import { type Engine, mock, type MockClock } from "claude-code/testing";

import { stepTurn } from "./turns";

export { completeTurn, drain, stepTurn } from "./turns";

declare const setTimeout: (fn: () => void, ms: number) => unknown;

export const PLUGIN = "claudetto-you-should-know";
export const PROPS: RenderPropsOf["AbovePrompt"] = {
	hasSurvey: false,
	isCollapsed: false,
	isWorking: false,
	maxRows: 20,
	bodyColumns: 100,
	scroll: { offset: 0, bodyRows: 20 },
	view: {}
};
export const USAGE = {
	input_tokens: 0,
	output_tokens: 0,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0
} as const;
export const REPLY =
	"learn: Tests run in order.\ntag: You should know\nexplain: **Order**\nThey run one after another.";

export const delay = (ms: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});

export const pause = (): Promise<void> => delay(5);

/** Ten pauses: long enough for the plugin's chained awaits to finish. */
export const settle = (): Promise<void> => delay(50);

/**
 * Runs `step` on each item one after another: the engine calls depend on the
 * order they arrive in, so they cannot run together.
 */
export const inOrder = async <T>(
	items: readonly T[],
	step: (item: T) => Promise<unknown>
): Promise<void> => {
	const [first, ...rest] = items;
	if (first !== undefined) {
		await step(first);
		await inOrder(rest, step);
	}
};

/** A promise a test settles by hand: `release` lets everything waiting on `hold` go on. */
export const gate = (): { hold: Promise<void>; release: () => void } => {
	const door: { open?: () => void } = {};
	const hold = new Promise<void>((resolve) => {
		door.open = () => {
			resolve();
		};
	});
	return { hold, release: () => door.open?.() };
};

/** The origins a test submits a prompt from. */
export type PromptKind = "composer" | "bridge" | "sdk";

/** Submits `text` as the engine raises a typed prompt from `kind`. */
export const submitTyped = (
	$: Engine,
	text: string,
	kind: PromptKind = "composer"
): Promise<unknown> => $.prompt.submit({ text, origin: { kind }, wait: false });

/** Pauses until `ready` holds or `tries` pauses have passed. */
export const until = async (
	ready: () => boolean | Promise<boolean>,
	tries: number
): Promise<void> => {
	if (tries > 0 && !(await ready())) {
		await pause();
		await until(ready, tries - 1);
	}
};

/**
 * Time limit for a test that mounts the band. `$.ui.mount` alone took 1785 ms
 * on claude 2.1.327, and a loaded machine pushed a mounting test past the
 * kit's 5 s default; the kit has no per-file default, so each such test passes this.
 */
export const MOUNT = { timeoutMs: 15_000 };

export interface Box {
	text: string;
	filled: string[];
	toasts: string[];
	forks: number;
	/** The arguments of each fork, in order. */
	args?: { prompt?: unknown }[];
	/** The mocked clock, set by `offered`. */
	clock?: MockClock;
	/** Prompt texts the plugin submitted itself. */
	submitted?: string[];
	/** Each prompt that reached the bottom of the chain, as the plugin passed it on. */
	sent?: { text: string; context?: unknown }[];
	/** Lines the plugin wrote with `ui.log`. */
	logs?: string[];
}

export interface Offer {
	readonly surface?: RenderSurface;
	readonly props?: RenderPropsOf["AbovePrompt"];
	readonly env?: Record<string, string>;
	/** Fork replies in order; the last one repeats. The first answers the check. */
	readonly replies?: readonly string[];
	/** Held until the test releases it: the fork waits on it before it answers. */
	readonly hold?: Promise<void>;
	/** Held until the test releases it: every fork after the first (the check) waits on it. */
	readonly holdLater?: Promise<void>;
	/** The surfaces the session reports, read at each call so a test can change them. */
	readonly surfaces?: RenderSurface[];
	/** True when the prompt box refuses a fill. The harness strips a cause a hook writes, so none is given. */
	readonly refuse?: boolean;
	/** True when every fork after the first (the check) rejects. */
	readonly faults?: boolean;
	/** False when the test expects the check to show nothing. */
	readonly isOffer?: boolean;
}

const wireSession = (
	on: On,
	box: Box,
	surfaces: () => RenderSurface[],
	refuse: boolean | undefined
): void => {
	on("session.id", () => ({ value: "s1" }));
	on("session.surfaces", () => ({ value: surfaces() }));
	on("prompt.read", () => ({
		value: { text: box.text, cursor: box.text.length }
	}));
	on("prompt.fill", (_$, e) => {
		if (refuse === true) {
			return { isFilled: false };
		}
		box.filled.push(e.text);
		return { isFilled: true };
	});
	on("ui.toast", (_$, e) => {
		box.toasts.push(e.text);
		return { value: undefined };
	});
	on("prompt.submit", (_$, e) => {
		(box.submitted ??= []).push(e.text);
		(box.sent ??= []).push({ text: e.text, context: e.context });
		return { ...e };
	});
	on("ui.log", (_$, e) => {
		(box.logs ??= []).push(e.text);
		return { value: undefined };
	});
};

/** Answers each `turn.step` with one empty chunk and an empty end-of-turn result, and each `turn.complete` with no text. */
export const stubSteps = (on: On): void => {
	on("turn.complete", () => ({ text: "" }));
	on("turn.step", async function* (_$, e) {
		await Promise.resolve();
		yield { kind: "text", index: 0, text: "" };
		return {
			turnId: e.turnId,
			index: e.index,
			answer: "",
			toolUses: [],
			stopReason: "end_turn",
			usage: null
		};
	});
};

/** Runs the three steps of turn t1 that make the plugin start its check. */
export const runChecks = ($: Engine): Promise<void> =>
	inOrder([1, 5, 6], (index) => stepTurn($, "t1", index));

const wireModel = (
	on: On,
	box: Box,
	replies: readonly string[],
	hold: Promise<void> | undefined,
	faults: boolean | undefined,
	holdLater?: Promise<void>
): void => {
	let call = 0;
	on("model.fork", async (_$, e) => {
		box.forks++;
		(box.args ??= []).push(e);
		await hold;
		if (call > 0) {
			await holdLater;
		}
		if (faults === true && call > 0) {
			throw new Error("fork failed");
		}
		return {
			value: {
				isAnswered: true as const,
				text: replies[Math.min(call++, replies.length - 1)] ?? "",
				usage: USAGE
			}
		};
	});
	stubSteps(on);
};

export const offered = async (
	$: Engine,
	on: On,
	box: Box,
	opts: Offer = {}
) => {
	const {
		surface = "terminal",
		props = PROPS,
		env = {},
		replies = [REPLY],
		hold,
		holdLater,
		faults,
		surfaces,
		refuse,
		isOffer = true
	} = opts;
	on("env.get", (_$, e) => ({ value: env[e.name] }));
	box.clock = mock.clock(on, { now: 1000 });
	mock.store(on);
	wireSession(on, box, () => surfaces ?? [surface], refuse);
	wireModel(on, box, replies, hold, faults, holdLater);
	const band = await $.ui.mount({
		plugin: PLUGIN,
		surface,
		component: "AbovePrompt",
		props
	});
	await runChecks($);
	await until(
		async () => (await band.find({ key: "Learn more" })) !== undefined,
		isOffer ? 100 : 12
	);
	return band;
};

/** The mounted band `offered` returns. */
export type Band = Awaited<ReturnType<typeof offered>>;

/** Pauses until the band draws an element with `key`, for at most `tries` pauses. */
export const untilShown = (
	band: Band,
	key: string,
	tries = 50
): Promise<void> =>
	until(async () => (await band.find({ key })) !== undefined, tries);

/** Pauses until the band draws no element with `key`, for at most `tries` pauses. */
export const untilGone = (band: Band, key: string, tries = 50): Promise<void> =>
	until(async () => (await band.find({ key })) === undefined, tries);

/** True while the band draws the offer's Learn more button. */
export const isOffered = async (band: Band): Promise<boolean> =>
	(await band.find({ key: "Learn more" })) !== undefined;

/** The band drawn as text, for a check on what a person reads. */
export const textOf = async (band: {
	drawn: () => Promise<unknown>;
}): Promise<string> => JSON.stringify(await band.drawn());

/** Runs a check step in turn `turnId` and waits for its fork to finish. */
export const checkIn = async ($: Engine, turnId: string): Promise<void> => {
	await stepTurn($, turnId, 6);
	await settle();
};

/** The request prompt of each fork the plugin made, in order. */
export const promptsOf = (box: Box): string[] =>
	(box.args ?? []).map((arg) => String(arg.prompt));

/** A fresh box for a test that watches the engine calls. */
export const freshBox = (): Box => ({
	text: "",
	filled: [],
	toasts: [],
	forks: 0
});
