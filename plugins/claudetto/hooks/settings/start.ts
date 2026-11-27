import type { On, PluginOptions } from "claude-code";

import { fault } from "../shared/fault";
import { START_CAP_MS, within } from "../shared/within";
import { fillSettings } from "./apply";
import { startParts } from "./parts";
import { registerSetup, registerSetupCommand } from "./setup";

/**
 * Runs the tool registrations, the rule install and the settings fill at session start. Core
 * allows one unmatched `session.start` registration per plugin, so they share this hook
 * (TOOLS-020), and so does the registration of `/claudetto-setup`.
 */
export function registerStart(on: On, options: PluginOptions = {}): void {
	on("session.start", async ($, e, next) => {
		const result = await next(e);
		await within($, START_CAP_MS, "settings fill", async () => {
			await registerSetupCommand($);
			await startParts($, e);
			await fillSettings(
				$,
				{ isInteractive: e.isInteractive, force: false },
				options
			);
		});
		return result;
		// A failed settings write must not block the session.
	}).catch(($, e, next) => {
		fault($, "settings fill", next.error);
		return next(e);
	});
	registerSetup(on, options);
}
