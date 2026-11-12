import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { scanned } from "../../secrets.mock";
import { GIT_CLOSED } from "../../texts-gate";

/** A project at /repo whose `existing` paths are there; a Bash call whose command starts with `git init` makes `/repo/.git`. Answers each host command and each tool run in order. */
const lab = (on: On, existing: string[] = ["/repo/.git"]): string[] => {
	const seen: string[] = [];
	on("process.run", (_$, e) => {
		const found = scanned(e);
		if (found) {
			return found;
		}
		seen.push(e.argv.join(" "));
		return {
			value: {
				exitCode: 0,
				stdout: "/repo/.git\n",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false,
			},
		};
	});
	on("clock.now", () => ({ value: 0 }));
	on("fs.exists", (_$, e) => ({ value: existing.includes(e.path) }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("session.root", () => ({ value: "/repo" }));
	on("session.id", () => ({ value: "S1" }));
	on("session.messages", () => ({ value: [] }));
	on("tool.list", () => ({ value: [] }));
	on("tool.call", (_$, e) => {
		if (e.tool === "Bash" && e.command.startsWith("git init")) {
			existing.push("/repo/.git");
		}
		seen.push("tool");
		return { result: { stdout: "", stderr: "" }, text: "ran" };
	});
	return seen;
};

const run = ($: Engine, command: string) =>
	$.tool.call({ tool: "Bash", tool_use_id: "toolu_1", command });

test("the repository's worktrees folder is made on the host before a `git worktree add` runs", async ($: Engine, on: On) => {
	const seen = lab(on);

	await run($, "cd /repo && git worktree add -b fix ../fix");

	expect(seen).toEqual([
		"git rev-parse --path-format=absolute --git-common-dir",
		"mkdir -p /repo/.git/worktrees",
		"tool",
	]);
});

test("a call that adds no worktree runs no host command", async ($: Engine, on: On) => {
	const seen = lab(on);

	await run($, "git worktree list");
	await run($, "echo git worktree add ../fix");

	expect(seen).toEqual(["tool", "tool"]);
});

test("a root that gains `.git` after the start gets the restart reminder once", async ($: Engine, on: On) => {
	lab(on, []);

	const before = await run($, "ls");
	const made = await run($, "git init -q");
	const after = await run($, "git status");

	expect(before.context).toBeUndefined();
	expect(made.context).toEqual([GIT_CLOSED]);
	expect(after.context).toBeUndefined();
});

test("a session that started in a repository gets no reminder", async ($: Engine, on: On) => {
	lab(on);

	const out = await run($, "git init -q");

	expect(out.context).toBeUndefined();
});
