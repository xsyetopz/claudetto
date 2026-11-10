import type { On, PluginOptions } from "claude-code";

import { homeOf } from "./gate/own.ts";
import { newRecreation } from "./gate/recreate.ts";
import { unguarded } from "./gate/walled.ts";
import {
	type Memory,
	watchDenials,
	watchResults,
	watchTools,
} from "./gate/watch.ts";
import { listOption } from "./options.ts";
import { walledUnguarded } from "./texts-gate.ts";

export { isMarked } from "./gate/ownership.ts";

export const gate = (on: On, options: PluginOptions): void => {
	const files = newRecreation();
	const walls = { paths: listOption(options, "protectedPaths"), files };

	// A deny rule in the settings can vanish unnoticed, as it did on 2026-11-07, while the gate's wall stays.
	on("classic.SessionStart", { source: "startup" }, async ($, e, next) => {
		const open = unguarded(
			walls.paths,
			await $.settings.read({ key: "permissions" }),
			await homeOf($, files),
		);
		if (open.length > 0) {
			$.ui.log(walledUnguarded(open));
		}
		return next(e);
	});

	const memory: Memory = { denials: {} };
	watchTools(on, walls, memory);
	watchDenials(on, walls, memory);
	watchResults(on, walls);
};
