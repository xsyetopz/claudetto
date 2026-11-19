import { expect, mock, test } from "claude-code/testing";

import { MOUNT } from "./testkit";

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

const settled = async (done: () => boolean): Promise<void> => {
	for (let i = 0; i < 20 && !done(); i++) {
		await new Promise((resolve) => setTimeout(() => resolve(undefined), 5));
	}
};

test("the sixth step of a drawn band asks the fork once and stores its offer", MOUNT, async ($, on) => {
	mock.clock(on, { now: 1000 });
	mock.store(on);
	on("session.id", () => ({ value: "s1" }));
	on("session.surfaces", () => ({ value: ["terminal"] as const }));
	const asked: string[] = [];
	on("model.fork", (_$, e) => {
		asked.push(e.prompt);
		return {
			value: {
				isAnswered: true as const,
				text: "learn: Tests run in order.\ntag: You should know",
				usage: USAGE,
			},
		};
	});
	on("turn.step", async function* (_$, e) {
		yield { kind: "text", index: 0, text: "" };
		return { turnId: e.turnId, index: e.index, answer: "", toolUses: [], stopReason: "end_turn", usage: null };
	});
	const band = await $.ui.mount({ plugin: PLUGIN, surface: "terminal", component: "AbovePrompt", props: PROPS });

	for (const index of [1, 5, 6]) {
		for await (const _chunk of $.turn.step({ turnId: "t1", index, model: "m", messageCount: 1 })) {
			// the stream is drained so the step completes
		}
	}
	await settled(() => asked.length > 0);
	expect(asked.length).toBe(1);
	let found = await band.find({ type: "Text", text: /Tests run in order/ });
	for (let i = 0; i < 100 && found === undefined; i++) {
		await settled(() => false);
		found = await band.find({ type: "Text", text: /Tests run in order/ });
	}
	expect(found).toBeDefined();
});
