import type { On, PluginOptions } from "claude-code";

import { disableBuiltins } from "./builtins/builtins";
import { registerClear } from "./handover/clear";
import { registerCompact } from "./handover/compact";
import { registerRenewal } from "./handover/renewal";

export const register = (on: On, _options: PluginOptions): void => {
	disableBuiltins(on);
	registerCompact(on);
	registerRenewal(on);
	registerClear(on);
};
