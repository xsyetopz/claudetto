import type { On, PluginOptions } from "claude-code";

import { registerClear } from "./handover/clear";
import { registerCompact } from "./handover/compact";
import { registerRenewal } from "./handover/renewal";
import { registerStart } from "./settings/start";
import { registerStatuslineCommand } from "./statusline/command";
import { registerStatusline }from "./statusline/statusline";

export const register = (on: On, _options: PluginOptions): void => {
	registerStart(on);
	registerCompact(on);
	registerRenewal(on);
	registerClear(on);
	registerStatusline(on);
	registerStatuslineCommand(on);
};
