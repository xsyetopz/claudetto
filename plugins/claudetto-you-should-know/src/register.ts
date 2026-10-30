import type { On, PluginOptions } from "claude-code";
import { onEnd, onRender, onStep, onSubmit, RENDER_MATCH } from "./hooks.ts";
import { keepOptions } from "./options.ts";

export const register = (on: On, options: PluginOptions): void => {
	// Options are kept first: the hooks are registered by reference and read them from there.
	keepOptions(options);
	on("turn.step", onStep);
	on("prompt.submit", onSubmit);
	on("session.end", onEnd);
	on("ui.render", RENDER_MATCH, onRender);
};
