import type { On, PluginOptions } from "claude-code";

import { switchOption } from "../../options";

/**
 * A stop that an API error ended has no one at the prompt to see it. The `permission_prompt`, `idle_prompt` and
 * `elicitation_dialog` notices stay with the native channel, and no hook here listens to `classic.Notification`
 * or `ui.notify`, so a notice never raises another.
 */
export const notify = (on: On, options: PluginOptions): void => {
	const isOn = switchOption(options, "notificationsEnabled");
	on("classic.StopFailure", async ($, e, next) => {
		if (isOn) {
			await $.ui
				.notify(`Claude stopped on an error: ${e.error}`, {
					title: "claudetto",
				})
				.catch((error: unknown) => {
					$.ui.log(`The stop notice was not shown (${String(error)})`);
				});
		}
		return next(e);
	});
};
