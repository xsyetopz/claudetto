import { expect, mock, test } from "claude-code/testing";

import {
	MOUNT,
	PLUGIN,
	PROPS,
	runChecks,
	stubSteps,
	until,
	USAGE
} from "./testkit";

test(
	"a drawn band asks the fork once on a check step and draws the offer it answers with",
	MOUNT,
	async ($, on) => {
		// Arrange
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
					usage: USAGE
				}
			};
		});
		stubSteps(on);
		const band = await $.ui.mount({
			plugin: PLUGIN,
			surface: "terminal",
			component: "AbovePrompt",
			props: PROPS
		});
		const line = () => band.find({ type: "Text", text: /Tests run in order/u });

		// Act
		await runChecks($);
		await until(() => asked.length > 0, 20);
		await until(async () => (await line()) !== undefined, 400);

		// Assert
		expect(asked.length).toBe(1);
		expect(await line()).toBeDefined();
	}
);
