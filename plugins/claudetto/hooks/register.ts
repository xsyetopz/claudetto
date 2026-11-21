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
import { registerPatch } from "./patch/tool";
import { registerToolDescribe } from "./pool/describe";
import { registerToolOffer } from "./pool/offer";
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
	// ENGINE(v2.1.330): the hook registered first runs first and reaches this one through next, so this
	// stays after registerGit and the git block lands on the short Bash text.
	registerToolDescribe(on);
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
