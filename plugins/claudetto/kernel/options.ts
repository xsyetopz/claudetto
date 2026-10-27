// The `userConfig` values of the plugin, which `register` keeps once for each process, and which each module reads.

import type { PluginOptions } from "claude-code";

const kept: { options: PluginOptions } = { options: {} };

export const keepOptions = (options: PluginOptions): void => {
	kept.options = options;
};

export const pluginOptions = (): PluginOptions => kept.options;
