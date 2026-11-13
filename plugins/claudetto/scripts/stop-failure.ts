/// <reference types="bun" />
/** A turn that an API error ended has no one at the prompt to see it. Output of a `StopFailure` hook is ignored, so the notice goes through the desktop. */
export const noticeOf = (input: { error?: string }): string =>
	`Claude stopped on an error: ${input.error ?? "unknown"}`;

/** The command that raises `text` as a desktop notice on `platform`. The text is an argument, never part of a script. */
export const noticeCommand = (
	platform: string,
	text: string,
): readonly string[] =>
	platform === "darwin"
		? [
				"osascript",
				"-e",
				"on run argv",
				"-e",
				'display notification (item 1 of argv) with title "claudetto"',
				"-e",
				"end run",
				"--",
				text,
			]
		: ["notify-send", "claudetto", text];

const isNoticeInput = (value: unknown): value is { error?: string } =>
	typeof value === "object" && value !== null;

if (import.meta.main) {
	const input: unknown = await Bun.stdin.json();
	if (!isNoticeInput(input)) {
		throw new TypeError("The StopFailure input is no object");
	}
	if (process.env["CLAUDE_PLUGIN_OPTION_NOTIFICATIONSENABLED"] !== "false") {
		const argv = noticeCommand(process.platform, noticeOf(input));
		const shown = await Bun.$`${argv}`.quiet().nothrow();
		if (shown.exitCode !== 0) {
			process.stderr.write(
				`The stop notice was not shown: ${shown.stderr.toString()}`,
			);
		}
	}
}
