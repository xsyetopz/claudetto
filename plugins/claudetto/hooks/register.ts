import type { On, PluginOptions } from "claude-code";

import { registerGuards } from "./guards/guards";
import { registerGit } from "./git/instructions";
import { registerTrailer } from "./git/trailer";
import { registerPerl } from "./edit/perl";
import { registerTabs } from "./edit/tabs";
import { registerOffer } from "./delegation/offer";
import { registerSpawn } from "./delegation/spawn";
import { registerClear } from "./handover/clear";
import { registerCompact } from "./handover/compact";
import { registerRenewal } from "./handover/renewal";
import { registerStopNotice } from "./notice/stop";
import { registerStart } from "./settings/start";
import { registerStatuslineCommand } from "./statusline/command";
import { registerStatusline } from "./statusline/statusline";

export const register = (on: On, options: PluginOptions): void => {
	registerStart(on, options);
	registerGuards(on, options);
	registerGit(on, options);
	registerTrailer(on, options);
	registerPerl(on);
	registerTabs(on);
	registerCompact(on);
	registerRenewal(on);
	registerClear(on);
	registerStopNotice(on);
	registerSpawn(on);
	registerOffer(on);
	registerStatusline(on);
	registerStatuslineCommand(on);
};
