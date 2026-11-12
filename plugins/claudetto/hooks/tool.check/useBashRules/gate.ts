import type { On, PluginOptions } from "claude-code";

import { listOption } from "../../options";
import { walledUnguarded } from "../../texts-gate";
import { homeOf } from "./own";
import { newRecreation } from "./recreate";
import { unguarded } from "./walled";
import { type GateState, watchPermissionEvents } from "./watch";

/** Builds the walls and the memory the gate guards share. */
export const gateState = (options: PluginOptions): GateState => ({
	walls: {
		paths: listOption(options, "protectedPaths"),
		files: newRecreation(),
		worktrees: new Set(),
	},
	memory: { denials: {} },
});

export const gate = (on: On, { walls, memory }: GateState): void => {
	const { files } = walls;

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

	// Fires before the folder exists; `name` gives `.claude/worktrees/<name>` and the branch `worktree-<name>`, for an isolated agent and for `EnterWorktree`. Kept here, so compaction does not lose it.
	on("classic.WorktreeCreate", (_$, e, next) => {
		walls.worktrees.add(e.name);
		return next(e);
	});

	watchPermissionEvents(on, walls, memory);
};
