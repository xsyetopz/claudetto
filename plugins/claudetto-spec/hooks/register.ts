import type { On, PluginOptions } from "claude-code";

import { registerSpecCheck } from "./check/tool";

/**
 * Registers the `spec_check` tool and its handler.
 *
 * @param on The engine's hook registrar.
 * @param _options The plugin's options.
 */
export const register = (on: On, _options: PluginOptions): void => {
	registerSpecCheck(on);
};
