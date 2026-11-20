import type { On, PluginOptions } from "claude-code";

import { registerStep } from "./check/step";
import { registerSession } from "./session/hooks";
import { registerCommand, registerSubmit } from "./session/submit";
import { newCtx } from "./shared/context";
import { registerRender } from "./view/render";

export const register = (on: On, _options: PluginOptions): void => {
	const ctx = newCtx();
	registerSubmit(on, ctx);
	registerCommand(on, ctx);
	registerStep(on, ctx);
	registerRender(on, ctx);
	registerSession(on, ctx);
};
