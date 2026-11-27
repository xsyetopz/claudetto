import type { EngineInterface, On, PluginOptions } from "claude-code";

import { fault } from "../shared/fault";
import { fillSettings } from "./apply";
import { installRules } from "./rules";

/** The slash command that applies the whole setup now. */
const SETUP = "claudetto-setup";

/** Registers `/claudetto-setup`; a refused registration is logged and leaves the session start going. */
export async function registerSetupCommand($: EngineInterface): Promise<void> {
	try {
		await $.command.register({
			name: SETUP,
			description:
				"Apply claudetto's settings, status line and rules now, including parts you removed",
			immediate: true
		});
	} catch (error) {
		fault($, "setup command register", error);
	}
}

/** The settings fill, the status line and the rules, all applied again now, and the reply that names them. */
async function setUp(
	$: EngineInterface,
	options: PluginOptions
): Promise<string> {
	const rules = await installRules($, true);
	const { path, changed } = await fillSettings(
		$,
		{ isInteractive: true, force: true },
		options
	);
	const settings = changed
		? `Applied claudetto's settings and status line to \`${path}\``
		: `\`${path}\` already holds claudetto's settings and status line`;
	const installed =
		rules.length === 0
			? "the rules are current"
			: `wrote ${rules.length} rule file(s)`;
	return `${settings}; ${installed}.`;
}

/** Runs `/claudetto-setup` (SETUP-075). */
export function registerSetup(on: On, options: PluginOptions): void {
	on("command.run", { command: SETUP }, async ($) => ({
		text: await setUp($, options)
	})).catch(($, _e, next) => {
		fault($, "setup command", next.error);
		return {
			text: "Setup stopped on an error; the debug log names the cause."
		};
	});
}
