import type { On, PluginOptions } from "claude-code";

import { registerContext } from "./context/context";
import { registerAgentNotes } from "./delegation/notes";
import { registerOffer } from "./delegation/offer";
import { registerRunaway } from "./delegation/runaway";
import { registerSpawn } from "./delegation/spawn";
import { registerThrash } from "./delegation/thrash";
import { registerPerl } from "./edit/perl";
import { registerGit } from "./git/instructions";
import { registerTrailer } from "./git/trailer";
import { registerGoal } from "./goal";
import { registerGuards } from "./guards/guards";
import { registerClear } from "./handover/clear";
import { registerCompact } from "./handover/compact";
import { registerRenewal } from "./handover/renewal";
import { registerStopNotice } from "./notice/stop";
import { registerPatch } from "./patch/tool";
import { registerToolDescribe } from "./pool/describe";
import { registerMessagingDescribe } from "./pool/messaging";
import { registerToolOffer } from "./pool/offer";
import { registerQuestionRule } from "./pool/question";
import { registerBashRecipes } from "./pool/recipes";
import { registerCompose } from "./prompt/compose";
import { registerStart } from "./settings/start";
import { registerStatuslineCommand } from "./statusline/command";
import { registerStatusline } from "./statusline/statusline";
import { registerWeb } from "./web/register";

export const register = (on: On, options: PluginOptions): void => {
	registerStart(on, options);
	registerGuards(on, options);
	registerGit(on, options);
	registerBashRecipes(on);
	registerQuestionRule(on);
	registerTrailer(on, options);
	registerPerl(on);
	registerContext(on);
	registerPatch(on);
	registerToolOffer(on);
	// ENGINE(v2.1.330): the hook registered first runs first and reaches this one through next, so this
	// stays after registerGit and the git block lands on the short Bash text.
	registerToolDescribe(on);
	registerMessagingDescribe(on);
	registerCompact(on);
	registerRenewal(on);
	registerClear(on);
	registerStopNotice(on);
	registerSpawn(on);
	registerThrash(on);
	registerRunaway(on);
	registerAgentNotes(on);
	registerOffer(on);
	registerGoal(on);
	registerStatusline(on);
	registerStatuslineCommand(on);
	registerWeb(on);
	registerCompose(on);
};
