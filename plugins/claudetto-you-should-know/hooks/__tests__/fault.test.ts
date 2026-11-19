import { expect, mock, test } from "claude-code/testing";

import { PLUGIN, PROPS, pause, MOUNT } from "./testkit";

test("a check fork that fails leaves one debug line and no offer", MOUNT, async ($, on) => {
	// Arrange
	mock.clock(on, { now: 1000 });
	mock.store(on);
	on("session.id", () => ({ value: "s1" }));
	on("session.surfaces", () => ({ value: ["terminal"] as const }));
	on("env.get", () => ({ value: undefined }));
	const lines: string[] = [];
	on("ui.log", (_$, e) => {
		lines.push(`${e.to}: ${e.text}`);
		return { value: undefined };
	});
	on("turn.step", async function* (_$, e) {
		yield { kind: "text", index: 0, text: "" };
		return { turnId: e.turnId, index: e.index, answer: "", toolUses: [], stopReason: "end_turn", usage: null };
	});
	const band = await $.ui.mount({ plugin: PLUGIN, surface: "terminal", component: "AbovePrompt", props: PROPS });

	// Act
	for (const index of [1, 5, 6]) {
		for await (const _chunk of $.turn.step({ turnId: "t1", index, model: "m", messageCount: 1 })) {
			// drained so the step completes
		}
	}
	for (let i = 0; i < 100 && lines.length === 0; i++) {
		await pause();
	}

	// Assert
	expect(lines.length).toBe(1);
	expect(lines[0]).toStartWith("debug: claudetto-you-should-know");
	expect(lines[0]).toContain("model.fork");
	expect(await band.find({ key: "Learn more" })).toBeUndefined();
});
