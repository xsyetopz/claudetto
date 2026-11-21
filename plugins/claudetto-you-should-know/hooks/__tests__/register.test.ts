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
	"the sixth step of a drawn band asks the fork once and stores its offer",
	MOUNT,
	async ($, on) => {
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

		await runChecks($);
		await until(() => asked.length > 0, 20);
		expect(asked.length).toBe(1);
		const line = () => band.find({ type: "Text", text: /Tests run in order/u });
		await until(async () => (await line()) !== undefined, 400);
		expect(await line()).toBeDefined();
	}
);
