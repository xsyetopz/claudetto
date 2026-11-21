import { TOOL_FULL_NAME as PATCH } from "../patch/texts";

/**
 * ENGINE(v2.1.330): the stock `memory` section sends memory writes to the
 * Write tool, which claudetto turns off (REQ-TOOLS-001), and names the folder
 * in backticks after "memory at" (lean) or "memory system at" (full).
 */
export const STOCK_MEMORY_WRITE = "write to it directly with the Write tool";

const FOLDER = /memory(?: system)? at `(\/[^`]+)`/u;

/** The auto-memory folder the last composed prompt named; patch may write inside it. */
let folder: string | undefined;

/** The auto-memory folder the session's prompt names, without a trailing slash, if any. */
export const memoryFolder = (): string | undefined => folder;

/**
 * The `memory` section with its write instruction naming `patch` when the
 * request offers it, and the folder recorded so `patch` accepts paths there.
 * The text is unchanged when patch is not offered or the stock sentence moved.
 */
export function memorySection(
	stock: string,
	offered: readonly string[]
): string {
	const named = FOLDER.exec(stock)?.[1];
	if (named !== undefined) {
		folder = named.replace(/\/+$/u, "");
	}
	return offered.includes(PATCH)
		? stock.replace(
				STOCK_MEMORY_WRITE,
				`write to it directly with \`${PATCH}\``
			)
		: stock;
}
