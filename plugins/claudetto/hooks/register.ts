import type { On, PluginOptions } from "claude-code";

import { registerOffer } from "./delegation/offer";
import { registerSpawn } from "./delegation/spawn";
import { registerPerl } from "./edit/perl";
import { registerGit } from "./git/instructions";
import { registerTrailer } from "./git/trailer";
import { registerGuards } from "./guards/guards";
import { registerClear } from "./handover/clear";
import { registerCompact } from "./handover/compact";
import { registerRenewal } from "./handover/renewal";
import { registerStopNotice } from "./notice/stop";
import { registerPatch, registerToolOffer } from "./patch/tool";
import { registerStart } from "./settings/start";
import { registerStatuslineCommand } from "./statusline/command";
import { registerStatusline } from "./statusline/statusline";
import { registerWeb } from "./web/register";

export const register = (on: On, options: PluginOptions): void => {
	registerStart(on, options);
	registerGuards(on, options);
	registerGit(on, options);
	registerTrailer(on, options);
	registerPerl(on);
	registerPatch(on);
	registerToolOffer(on);
	registerCompact(on);
	registerRenewal(on);
	registerClear(on);
	registerStopNotice(on);
	registerSpawn(on);
	registerOffer(on);
	registerStatusline(on);
	registerStatuslineCommand(on);
	registerWeb(on);
};
