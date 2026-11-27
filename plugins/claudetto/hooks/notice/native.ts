import type { EngineInterface } from "claude-code";

/** An AppleScript string literal of `text`. */
const appleString = (text: string): string =>
	`"${text.replaceAll("\\", String.raw`\\`).replaceAll('"', String.raw`\"`)}"`;

/** Whether `argv` ran and exited 0; a missing program reads as false. */
async function ran($: EngineInterface, argv: string[]): Promise<boolean> {
	try {
		const result = await $.process.run(argv);
		return result.exitCode === 0;
	} catch {
		return false;
	}
}

/**
 * Raises the notice through the operating system: Notification Center on
 * macOS (`osascript`), the desktop's notification daemon on Linux
 * (`notify-send`, libnotify). Used where the person's terminal channel shows
 * no text, since Claude Code's channels are terminal escape sequences only.
 */
export async function notifyNative(
	$: EngineInterface,
	title: string,
	text: string
): Promise<void> {
	const isShown = await ran($, [
		"osascript",
		"-e",
		`display notification ${appleString(text)} with title ${appleString(title)}`
	]);
	if (!isShown) {
		await ran($, ["notify-send", title, text]);
	}
}
