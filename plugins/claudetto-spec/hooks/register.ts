import type { On, PluginOptions } from "claude-code";

import { registerSpecStop } from "./check/stop";
import { registerSpecCheck } from "./check/tool";

/**
 * Registers the `spec_check` tool, its handler and the Stop gate.
 *
 * @param on The engine's hook registrar.
 * @param _options The plugin's options.
 */
export const register = (on: On, _options: PluginOptions): void => {
	registerSpecCheck(on);
	registerSpecStop(on);
};
