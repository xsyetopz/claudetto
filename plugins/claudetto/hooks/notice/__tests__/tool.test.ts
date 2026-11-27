import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

const NOTIFY = "mcp__claudetto__notify";

type Sent =
	| { isSent: true; channel: "terminal_bell" | "iterm2" }
	| { isSent: false; reason: "disabled" | "no-channel" };

/** `auto` on a terminal that notifies through no escape sequence, such as Apple's Terminal. */
const NO_CHANNEL: Sent = { isSent: false, reason: "no-channel" };

/** Serves the notification channel with `answer`; returns the sends and the notices raised natively. */
const channel = (on: On, answer: Sent = NO_CHANNEL) => {
	const sent: string[] = [];
	const runs: string[][] = [];
	on("ui.notify", (_$, e) => {
		sent.push(e.text);
		return { value: answer };
	});
	on("ui.log", () => ({ value: undefined }));
	on("tool.check", () => ({ decision: "ask" }));
	on("process.run", (_$, e) => {
		if (["osascript", "notify-send"].includes(e.argv[0] ?? "")) {
			runs.push([...e.argv]);
		}
		return {
			value: {
				exitCode: 0,
				stdout: "",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		};
	});
	return { sent, runs };
};

describe("notify tool", () => {
	test("KERNEL-035 runs with no permission prompt", async ($, on) => {
		// Arrange
		channel(on);

		// Act
		const verdict = await $.tool.check({ tool: NOTIFY, input: { text: "x" } });

		// Assert
		expect(verdict.decision).toBe("allow");
	});

	test("KERNEL-035 a terminal with no notification channel gets the model's line as a native banner", async ($, on) => {
		// Arrange
		const { sent, runs } = channel(on);

		// Act
		const { result } = await $.tool.call({
			tool: NOTIFY,
			text: "Press A on the pad now"
		});

		// Assert
		expect(sent).toEqual(["Press A on the pad now"]);
		expect(runs[0]?.[0]).toBe("osascript");
		expect(runs[0]?.at(-1)).toContain("Press A on the pad now");
		expect(result).toBe("Sent.");
	});

	test("KERNEL-035 a terminal that shows the text gets no second notice", async ($, on) => {
		// Arrange
		const { sent, runs } = channel(on, { isSent: true, channel: "iterm2" });

		// Act
		await $.tool.call({ tool: NOTIFY, text: "x" });

		// Assert
		expect(sent).toEqual(["x"]);
		expect(runs).toEqual([]);
	});

	test("KERNEL-035 tells the model when notifications are off", async ($, on) => {
		// Arrange
		const { runs } = channel(on, { isSent: false, reason: "disabled" });

		// Act
		const { result } = await $.tool.call({
			tool: NOTIFY,
			text: "x"
		});

		// Assert
		expect(String(result)).toContain("Not sent");
		expect(runs).toEqual([]);
	});
});
