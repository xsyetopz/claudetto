import type { On, PluginOptions } from "claude-code";

/**
 * Registers no hook. The openspec block is not built over vanilla Claude Code
 * 2.1.327 (OUT-179 to OUT-181); this module exists so `claude plugin test`
 * has a module to load.
 *
 * @param _on The engine's hook registrar.
 * @param _options The plugin's options.
 */
export const register = (_on: On, _options: PluginOptions): void => {};
