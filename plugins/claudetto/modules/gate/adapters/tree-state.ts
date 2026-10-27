// The `git status` check of the paths of a scope: whether the files have a commit and no change.

import type { GitScope } from "../domain/loss.ts";
import { GIT_TIMEOUT_MS } from "../limits.ts";
import type { Run } from "./ports.ts";

/** The `status` flags of each scope: `delete` also counts the ignored files, because a delete removes them. */
const STATUS_FLAGS: Record<GitScope, string[]> = {
	changes: ["--untracked-files=no"],
	untracked: ["--untracked-files=all"],
	delete: ["--untracked-files=all", "--ignored"],
};

/** `"clean"` when the files of `paths` in `scope` have a commit and no change. For `delete`, `git ls-files` must also find each path. A run that fails gives `"dirty"`. */
export const gitState =
	(run: Run) =>
	async (
		scope: GitScope,
		dir: string,
		paths: string[],
	): Promise<"clean" | "dirty"> => {
		const git = (args: string[]) =>
			run(["git", "-C", dir, ...args, "--", ...paths], GIT_TIMEOUT_MS);
		const status = await git(["status", "--porcelain", ...STATUS_FLAGS[scope]]);
		const lines = status.stdout.split("\n").filter(Boolean);
		const changed =
			scope === "untracked"
				? lines.some((line) => line.startsWith("??"))
				: lines.length > 0;
		if (status.exitCode !== 0 || changed) {
			return "dirty";
		}
		if (scope !== "delete") {
			return "clean";
		}
		const tracked = await git(["ls-files", "--error-unmatch"]);
		return tracked.exitCode === 0 ? "clean" : "dirty";
	};
