import type { On } from "claude-code";
import { didWrite, WRITERS } from "./limits/stop.ts";
import { SLICE_COMMIT } from "./texts.ts";

/** A Stop that leaves the session's own file changes uncommitted is blocked once, unless the permission chain would deny a commit. */
export const slices = (on: On): void => {
	const written = new Set<string>();
	on("tool.call", { tool: WRITERS }, async (_$, e, next) => {
		const answer = await next(e);
		if (didWrite(answer) && e.file_path !== undefined) {
			written.add(e.file_path);
		}
		return answer;
	});
	on("classic.Stop", { stop_hook_active: false }, async ($, e, next) => {
		const answer = await next(e);
		if (answer.block !== undefined || written.size === 0) {
			return answer;
		}
		const commit = await $.tool.check({
			tool: "Bash",
			input: { command: "git commit" },
		});
		if (commit.decision === "deny") {
			return answer;
		}
		const status = await $.process
			.run(["git", "status", "--porcelain", "--", ...written])
			.catch(() => undefined);
		const changed =
			status?.exitCode === 0
				? status.stdout
						.split("\n")
						.filter((line) => line !== "")
						.map((line) => line.slice(3))
				: [];
		return changed.length === 0
			? answer
			: { ...answer, block: SLICE_COMMIT(changed) };
	});
};
