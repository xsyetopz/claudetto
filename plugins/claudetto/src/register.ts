import type { On, PluginOptions } from "claude-code";
import { attachBlocks } from "./blocks/catalog.ts";

export const register = (on: On, options: PluginOptions): void => {
	attachBlocks(on, options);
};
