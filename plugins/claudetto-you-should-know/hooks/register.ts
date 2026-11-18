import type { On, PluginOptions } from "claude-code";

import { newCtx } from "./context";
import { registerRender } from "./render";
import { registerSession } from "./session";
import { registerStep } from "./step";
import { registerCommand, registerSubmit } from "./submit";

export const register = (on: On, _options: PluginOptions): void => {
	const ctx = newCtx();
	registerSubmit(on, ctx);
	registerCommand(on, ctx);
	registerStep(on, ctx);
	registerRender(on, ctx);
	registerSession(on, ctx);
};
