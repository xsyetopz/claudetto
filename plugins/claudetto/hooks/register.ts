import type { On, PluginOptions } from "claude-code";

import { registerClear } from "./handover/clear";
import { registerCompact } from "./handover/compact";
import { registerRenewal } from "./handover/renewal";
import { registerSpawn } from "./delegation/spawn";
import { registerStart } from "./settings/start";

export const register = (on: On, _options: PluginOptions): void => {
	registerStart(on);
	registerCompact(on);
	registerRenewal(on);
	registerClear(on);
	registerSpawn(on);
};
