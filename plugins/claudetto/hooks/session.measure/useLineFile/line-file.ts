import type { EngineInterface } from "claude-code";

import { atRoot, lineFilePath } from "./heartbeat";

/**
 * After each turn, the compaction window and the theme go to the line file: stdin's `context_window_size` is the
 * model's window, and stdin has no theme. The `summary` breakdown estimates locally and sends no request.
 */
export async function writeLineFile($: EngineInterface): Promise<void> {
	try {
		const [session, root, usage, rows] = await Promise.all([
			$.session.id(),
			$.session.root(),
			$.session.usage({ breakdown: "summary" }),
			$.config.list(),
		]);
		const theme = rows.find((row) => row.key === "theme")?.value;
		await $.fs.write(
			atRoot(root, lineFilePath(session)),
			JSON.stringify({
				window: usage.context.breakdown?.rawMaxTokens,
				...(typeof theme === "string" ? { theme } : {}),
			}),
		);
	} catch (error) {
		// The line leaves out what it cannot read, so a missed write costs one refresh's context part and colour.
		$.ui.log(`The line file was not written (${String(error)})`);
	}
}
