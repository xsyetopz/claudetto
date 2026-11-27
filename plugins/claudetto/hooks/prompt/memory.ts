import { TOOL_FULL_NAME as PATCH } from "../patch/texts";

/**
 * ENGINE(v2.1.330): the stock `memory` section sends memory writes to the
 * Write tool, which claudetto turns off (TOOLS-001), and names the folder
 * in backticks after "memory at" (lean) or "memory system at" (full).
 */
export const STOCK_MEMORY_WRITE = "write to it directly with the Write tool";

/**
 * The `memory` section with its write instruction naming `patch` when the
 * request offers it. The text is unchanged when patch is not offered or the
 * stock sentence moved.
 */
export function memorySection(
	stock: string,
	offered: readonly string[]
): string {
	return offered.includes(PATCH)
		? stock.replace(
				STOCK_MEMORY_WRITE,
				`write to it directly with \`${PATCH}\``
			)
		: stock;
}
