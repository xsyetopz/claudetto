import { expect, mock, test } from "claude-code/testing";

import { MOUNT, PLUGIN, PROPS, runChecks, stubSteps, until } from "./testkit";

test(
	"a check fork that fails leaves one debug line and no offer",
	MOUNT,
	async ($, on) => {
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
		stubSteps(on);
		const band = await $.ui.mount({
			plugin: PLUGIN,
			surface: "terminal",
			component: "AbovePrompt",
			props: PROPS
		});

		// Act
		await runChecks($);
		await until(() => lines.length > 0, 100);

		// Assert
		expect(lines.length).toBe(1);
		expect(lines[0]).toStartWith("debug: claudetto-you-should-know");
		expect(lines[0]).toContain("model.fork");
		expect(await band.find({ key: "Learn more" })).toBeUndefined();
	}
);
