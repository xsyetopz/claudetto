// The one module that `hooks/hooks.json` names; the blocks register the four hooks of the observer.

import type { On, PluginOptions } from "claude-code";
import { attachBlocks } from "./blocks/catalog.ts";

/** Called by the host with its `on` and the plugin options. */
export const register = (on: On, options: PluginOptions): void => {
	attachBlocks(on, options);
};
