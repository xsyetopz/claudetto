/** Shared fixtures for the mounted-flow tests. */

import type { On } from "claude-code";
import { type Engine, mock } from "claude-code/testing";

declare const setTimeout: (fn: () => void, ms: number) => unknown;

export const PLUGIN = "claudetto-you-should-know";
export const PROPS = {
	hasSurvey: false,
	isCollapsed: false,
	isWorking: false,
	maxRows: 20,
	bodyColumns: 100,
	scroll: { offset: 0, bodyRows: 20 },
	view: {},
};
export const USAGE = {
	input_tokens: 0,
	output_tokens: 0,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
} as const;
export const REPLY = "learn: Tests run in order.\ntag: You should know\nexplain: **Order**\nThey run one after another.";

export const pause = (): Promise<void> => new Promise((resolve) => setTimeout(() => resolve(), 5));

export type Box = { text: string; filled: string[]; toasts: string[]; forks: number };

export type Offer = {
	readonly surface?: string;
	readonly props?: object;
	readonly env?: Record<string, string>;
	/** Fork replies in order; the last one repeats. The first answers the check. */
	readonly replies?: readonly string[];
	/** When given, the plugin's store lives in this map so a test can read what the plugin kept. */
	readonly kept?: Map<string, unknown>;
};

export const offered = async ($: Engine, on: On, box: Box, opts: Offer = {}) => {
	const { surface = "terminal", props = PROPS, env = {}, replies = [REPLY], kept } = opts;
	let call = 0;
	on("env.get", (_$, e) => ({ value: env[e.name] }));
	mock.clock(on, { now: 1000 });
	if (kept === undefined) {
		mock.store(on);
	} else {
		on("store.get", (_$, e) => ({ value: kept.get(e.key) }));
		on("store.set", (_$, e) => {
			kept.set(e.key, e.value);
			return { value: undefined };
		});
		on("store.delete", (_$, e) => {
			kept.delete(e.key);
			return { value: undefined };
		});
	}
	on("session.id", () => ({ value: "s1" }));
	on("session.surfaces", () => ({ value: [surface] as never }));
	on("prompt.read", () => ({ value: { text: box.text, cursor: box.text.length } }));
	on("prompt.fill", (_$, e) => {
		box.filled.push(e.text);
		return { isFilled: true };
	});
	on("ui.toast", (_$, e) => {
		box.toasts.push(e.text);
		return { value: undefined };
	});
	on("model.fork", () => {
		box.forks++;
		return { value: { isAnswered: true as const, text: replies[Math.min(call++, replies.length - 1)] ?? "", usage: USAGE } };
	});
	on("turn.step", async function* (_$, e) {
		yield { kind: "text", index: 0, text: "" };
		return { turnId: e.turnId, index: e.index, answer: "", toolUses: [], stopReason: "end_turn", usage: null };
	});
	const band = await $.ui.mount({ plugin: PLUGIN, surface: surface as never, component: "AbovePrompt", props: props as never });
	for (const index of [1, 5, 6]) {
		for await (const _chunk of $.turn.step({ turnId: "t1", index, model: "m", messageCount: 1 })) {
			// drained so the step completes
		}
	}
	for (let i = 0; i < 100 && (await band.find({ key: "Learn more" })) === undefined; i++) {
		await pause();
	}
	return band;
};

