import type { On, PluginOptions } from "claude-code";

import { disableBuiltins } from "./builtins/builtins";

export const register = (on: On, _options: PluginOptions): void => {
	disableBuiltins(on);
};
