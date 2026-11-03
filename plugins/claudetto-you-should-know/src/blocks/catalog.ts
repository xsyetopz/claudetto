import type { On, PluginOptions } from "claude-code";
import type { BlockContext } from "./block.ts";
import { attachYouShouldKnow } from "./you-should-know/block.ts";

/** The hook loader takes `on` only into a function named at the top of a file, so each block is called by its own name. */
export const attachBlocks = (on: On, options: PluginOptions): void => {
	const context: BlockContext = { options };
	attachYouShouldKnow(on, context);
};
