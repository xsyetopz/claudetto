import { GIT_TIMEOUT_MS } from "./limits.ts";
import type { GitScope } from "./loss.ts";
import type { Run } from "./ports.ts";

const STATUS_FLAGS: Record<GitScope, string[]> = {
	changes: ["--untracked-files=no"],
	untracked: ["--untracked-files=all"],
	delete: ["--untracked-files=all", "--ignored"],
};

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
