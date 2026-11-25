import type { On, PluginOptions } from "claude-code";

import { registerAmendSection } from "./check/amend";
import { recordBaseline } from "./check/baseline";
import { registerSpecStop } from "./check/stop";
import { registerSpecCheck, registerTool } from "./check/tool";

/**
 * Registers the `spec_check` tool, its handler, the session-start baseline, the Stop gate
 * and the amend rule's prompt section.
 *
 * @param on The engine's hook registrar.
 * @param _options The plugin's options.
 */
export const register = (on: On, _options: PluginOptions): void => {
	on("session.start", async ($, e, next) => {
		await registerTool($);
		await recordBaseline($);
		return next(e);
	}).catch(($, e, next) => {
		$.ui.log("claudetto-spec: session start failed", { to: "debug" });
		return next(e);
	});
	registerSpecCheck(on);
	registerSpecStop(on);
	registerAmendSection(on);
};
