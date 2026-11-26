import type { On, UiNotifyResult } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

/** Serves an error stop whose terminal channel answers `answer`; returns the commands run. */
const serve = (
	on: On,
	answer: UiNotifyResult,
	failing: readonly string[] = []
) => {
	const runs: string[][] = [];
	on("classic.StopFailure", () => ({}));
	on("ui.notify", () => ({ value: answer }));
	on("ui.log", () => ({ value: undefined }));
	on("process.run", (_$, e) => {
		runs.push([...e.argv]);
		return {
			value: {
				exitCode: failing.includes(e.argv[0] ?? "") ? 127 : 0,
				stdout: "",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		};
	});
	return runs;
};

const STOP = { error: "rate_limit", error_details: 'quota "5h" hit' };

describe("native error-stop notice", () => {
	test("a terminal with no notification channel gets a macOS banner with the text", async ($, on) => {
		// Arrange
		const runs = serve(on, { isSent: false, reason: "no-channel" });

		// Act
		await $.classic.StopFailure(STOP);

		// Assert
		expect(runs.length).toBe(1);
		expect(runs[0]?.[0]).toBe("osascript");
		expect(runs[0]?.at(-1)).toContain(String.raw`quota \"5h\" hit`);
		expect(runs[0]?.at(-1)).toContain('with title "claudetto"');
	});

	test("without osascript the Linux desktop gets it through notify-send", async ($, on) => {
		// Arrange
		const runs = serve(on, { isSent: false, reason: "no-channel" }, [
			"osascript"
		]);

		// Act
		await $.classic.StopFailure(STOP);

		// Assert
		expect(runs.map((argv) => argv[0])).toEqual(["osascript", "notify-send"]);
		expect(runs[1]?.slice(1)).toEqual([
			"claudetto",
			'The turn stopped on an API error (rate_limit): quota "5h" hit.'
		]);
	});

	test("a bell-only channel also gets the banner, since the bell shows no text", async ($, on) => {
		// Arrange
		const runs = serve(on, { isSent: true, channel: "terminal_bell" });

		// Act
		await $.classic.StopFailure(STOP);

		// Assert
		expect(runs.length).toBe(1);
	});

	test("a terminal that showed the text gets no second notice", async ($, on) => {
		// Arrange
		const shown = serve(on, { isSent: true, channel: "iterm2" });

		// Act
		await $.classic.StopFailure(STOP);

		// Assert
		expect(shown.length).toBe(0);
	});

	test("notifications_disabled gets no native notice", async ($, on) => {
		// Arrange
		const runs = serve(on, { isSent: false, reason: "disabled" });

		// Act
		await $.classic.StopFailure(STOP);

		// Assert
		expect(runs.length).toBe(0);
	});
});
