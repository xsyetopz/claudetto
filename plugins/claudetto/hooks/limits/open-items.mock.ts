import type { On, PluginOptions, SessionMessage } from "claude-code";
import type { Engine } from "claude-code/testing";

import { said } from "../handoff.mock.ts";
import { scanner } from "../secrets.mock.ts";

export const withUse = (use: {
	tool: string;
	isError?: true;
	text?: string;
}): SessionMessage => ({
	role: "assistant",
	text: "",
	toolUses: [{ tool_use_id: "t1", input: {}, ...use }],
});

/** Wires a Stop after the user's `go` and `turn`; `listed` counts the `tool.list` calls. */
export const lab = (
	on: On,
	...turn: SessionMessage[]
): { listed: () => number } => {
	scanner(on);
	on("classic.Stop", () => ({}));
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("session.start", () => ({ cwd: "/repo" }));
	on("session.messages", () => ({ value: [said("user", "go"), ...turn] }));
	let listed = 0;
	on("tool.list", () => {
		listed += 1;
		return { value: [] };
	});
	return { listed: () => listed };
};

export const stop = (
	$: Engine,
	reply: string,
	stopHookActive = false,
): Promise<{ block?: string }> =>
	$.classic.Stop({
		stop_hook_active: stopHookActive,
		last_assistant_message: reply,
		background_tasks: [],
	});

export const off = (): { options: PluginOptions } => ({
	options: { openItemsCheckEnabled: false },
});
