import type { On, PluginOptions } from "claude-code";

import { registerGuards } from "./guards/guards";
import { registerClear } from "./handover/clear";
import { registerCompact } from "./handover/compact";
import { registerRenewal } from "./handover/renewal";
import { registerStopNotice } from "./notice/stop";
import { registerStart } from "./settings/start";

export const register = (on: On, options: PluginOptions): void => {
	registerStart(on, options);
	registerGuards(on, options);
	registerCompact(on);
	registerRenewal(on);
	registerClear(on);
	registerStopNotice(on);
};
