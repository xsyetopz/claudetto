import type { On, ToolCallResult } from "claude-code";

import { fieldOf, stringsOf } from "../../../shared/field";

/** What the machine beneath the plugin reports, and what the Bash tool answers; a test sets these before the call. */
export interface BashWorld {
	/** The Bash tool's answer to the next call. */
	answer: ToolCallResult;
	/** The commands that reached the Bash tool, as the shell would run them. */
	seen: string[];
	/** The login shell the session reports. */
	shell: string;
	/** Whether the repo's justfile has a `setup` recipe. */
	hasSetup: boolean;
}

/**
 * Stands in for the engine beneath the plugin's Bash hooks: free memory,
 * the permission check, the environment, the settings and the Bash tool.
 */
export const bashWorld = (on: On): BashWorld => {
	const world: BashWorld = {
		answer: { result: "ok" },
		seen: [],
		shell: "/bin/bash",
		hasSetup: true
	};
	on("process.run", (_$, e) => ({
		value: {
			exitCode: e.argv[0] === "just" && !world.hasSetup ? 1 : 0,
			stdout:
				e.argv[0] === "memory_pressure"
					? "System-wide memory free percentage: 50%\n"
					: "",
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false
		}
	}));
	on("ui.log", () => ({ value: undefined }));
	on("tool.check", () => ({ decision: "allow" }));
	on("env.get", (_$, e) => ({
		value: e.name === "SHELL" ? world.shell : undefined
	}));
	on("settings.read", () => ({ value: {} }));
	on("tool.call", { tool: "Bash" }, (_$, e) => {
		if (e.tool === "Bash") {
			world.seen.push(e.command);
		}
		return world.answer;
	});
	return world;
};

/** The notes the model reads beside a Bash result. */
export const contextOf = (answer: ToolCallResult): string[] =>
	stringsOf(fieldOf(answer, "context")) ?? [];
