import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

const notices = (on: On): string[] => {
	const sent: string[] = [];
	on("classic.StopFailure", () => ({}));
	on("classic.Stop", () => ({}));
	on("ui.notify", (_$, e) => {
		sent.push(e.text);
		return { value: { isSent: true, channel: "terminal_bell" } };
	});
	return sent;
};

describe("stop notice", () => {
	test("an API-error stop notifies once with the error", async ($, on) => {
		// Arrange
		const sent = notices(on);

		// Act
		await $.classic.StopFailure({ error: "rate_limit", error_details: "529 overloaded" });

		// Assert
		expect(sent.length).toBe(1);
		expect(sent[0]).toContain("rate_limit");
		expect(sent[0]).toContain("529 overloaded");
	});

	test("a normal stop notifies nothing", async ($, on) => {
		// Arrange
		const sent = notices(on);

		// Act
		await $.classic.Stop({ stop_hook_active: false });

		// Assert
		expect(sent.length).toBe(0);
	});
});
