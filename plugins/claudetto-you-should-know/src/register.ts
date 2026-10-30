// The one module that `hooks/hooks.json` names: the four hooks of the observer, and no others
// (`docs/keep/plugins/you-should-know-source-2.1.310.txt`, "WHAT THE REBUILD USES").

import type { On, PluginOptions } from "claude-code";
import { onEnd, onRender, onStep, onSubmit, RENDER_MATCH } from "./hooks.ts";
import { keepOptions } from "./options.ts";

/** Called by the host with its `on` and the plugin options; it registers the four hooks `turn.step`, `prompt.submit`, `session.end`, and `ui.render`. */
export const register = (on: On, options: PluginOptions): void => {
	// The options are kept first, because the hooks are registered by reference and read them from there.
	keepOptions(options);
	on("turn.step", onStep);
	on("prompt.submit", onSubmit);
	on("session.end", onEnd);
	on("ui.render", RENDER_MATCH, onRender);
};
