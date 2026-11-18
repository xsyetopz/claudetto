import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

declare const setTimeout: (fn: () => void, ms: number) => unknown;

const PLUGIN = "claudetto-you-should-know";
const PROPS = {
	hasSurvey: false,
	isCollapsed: false,
	isWorking: false,
	maxRows: 20,
	bodyColumns: 100,
	scroll: { offset: 0, bodyRows: 20 },
	view: {},
};
const USAGE = {
	input_tokens: 0,
	output_tokens: 0,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
} as const;
const REPLY = "learn: Tests run in order.\ntag: You should know\nexplain: **Order**\nThey run one after another.";

const pause = (): Promise<void> => new Promise((resolve) => setTimeout(() => resolve(), 5));

type Box = { text: string; filled: string[]; toasts: string[]; forks: number };

const offered = async ($: Engine, on: On, box: Box) => {
	mock.clock(on, { now: 1000 });
	mock.store(on);
	on("session.id", () => ({ value: "s1" }));
	on("session.surfaces", () => ({ value: ["terminal"] as const }));
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
		return { value: { isAnswered: true as const, text: REPLY, usage: USAGE } };
	});
	on("turn.step", async function* (_$, e) {
		yield { kind: "text", index: 0, text: "" };
		return { turnId: e.turnId, index: e.index, answer: "", toolUses: [], stopReason: "end_turn", usage: null };
	});
	const band = await $.ui.mount({ plugin: PLUGIN, surface: "terminal", component: "AbovePrompt", props: PROPS });
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

test("Learn more shows the explanation that came with the offer, without a second fork", async ($, on) => {
	const box: Box = { text: "", filled: [], toasts: [], forks: 0 };
	const band = await offered($, on, box);
	await band.press({ key: "Learn more" });
	for (let i = 0; i < 50 && (await band.find({ key: "Understood" })) === undefined; i++) {
		await pause();
	}
	expect(await band.find({ key: "Understood" })).toBeDefined();
	expect(await band.find({ key: "Chat in main session" })).toBeDefined();
	expect(JSON.stringify(await band.drawn())).toContain("They run one after another");
	expect(box.forks).toBe(1);
});

test("Knew this already clears the offer with no toast", async ($, on) => {
	const box: Box = { text: "", filled: [], toasts: [], forks: 0 };
	const band = await offered($, on, box);
	await band.press({ key: "Knew this already" });
	for (let i = 0; i < 50 && (await band.find({ key: "Learn more" })) !== undefined; i++) {
		await pause();
	}
	expect(await band.find({ key: "Learn more" })).toBeUndefined();
	expect(box.toasts).toEqual([]);
});

test("Dismiss shows the asked row with its one-shot buttons", async ($, on) => {
	const box: Box = { text: "", filled: [], toasts: [], forks: 0 };
	const band = await offered($, on, box);
	await band.press({ key: "Dismiss" });
	for (let i = 0; i < 50 && (await band.find({ key: "Not relevant" })) === undefined; i++) {
		await pause();
	}
	expect(await band.find({ key: "That was helpful" })).toBeDefined();
	expect(await band.find({ key: "Not relevant" })).toBeDefined();
});

test("Disable arms on the first press, then fills the off command and never runs it", async ($, on) => {
	const box: Box = { text: "", filled: [], toasts: [], forks: 0 };
	const band = await offered($, on, box);
	await band.press({ key: "Disable" });
	await pause();
	expect(box.filled).toEqual([]);
	await band.press({ key: "Press again to disable" });
	for (let i = 0; i < 50 && box.filled.length === 0; i++) {
		await pause();
	}
	expect(box.filled).toEqual(["/plugin disable claudetto-you-should-know"]);
});

test("Disable with text in the box toasts and fills nothing", async ($, on) => {
	const box: Box = { text: "half a thought", filled: [], toasts: [], forks: 0 };
	const band = await offered($, on, box);
	await band.press({ key: "Disable" });
	await pause();
	await band.press({ key: "Press again to disable" });
	for (let i = 0; i < 50 && box.toasts.length === 0; i++) {
		await pause();
	}
	expect(box.toasts.length).toBe(1);
	expect(box.filled).toEqual([]);
});
