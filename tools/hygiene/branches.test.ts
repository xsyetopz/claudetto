import { expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
	branchReport,
	freeBranches,
} from "../../plugins/claudetto/hooks/hygiene/branches.ts";
import { output } from "../../plugins/claudetto/hooks/hygiene/trash.ts";
import type { Run } from "../../plugins/claudetto/hooks/hygiene/worktrees.ts";
import { DAY, git, repo } from "./trash.mock.ts";

/** A branch of `proj` with one commit of its own, left with the default branch checked out. */
const branch = async (proj: string, name: string) => {
	const current = await output(["git", "branch", "--show-current"], proj);
	const base = (current ?? "").trim();
	await git(proj, "switch", "-q", "-c", name);
	await writeFile(join(proj, `${name.replace("/", "-")}.txt`), name);
	await git(proj, "add", ".");
	await git(proj, "commit", "-qm", name);
	await git(proj, "switch", "-q", base);
	return base;
};

const tipOf = async (proj: string, name: string) =>
	((await output(["git", "rev-parse", name], proj)) ?? "").trim();

const names = async (proj: string) =>
	((await output(["git", "branch", "--format=%(refname:short)"], proj)) ?? "")
		.split("\n")
		.filter(Boolean);

const LATER = Date.now() + 30 * DAY;

// Seen on the author's machine: `SwifterKit` and `asd-ste100-skill-next` held merged branches that nothing used.
test("a branch whose commits the default branch has goes, and one with its own commit, one in a worktree, and a new one stay", async () => {
	const { proj } = await repo();
	const base = await branch(proj, "feat/merged");
	await git(proj, "cherry-pick", "feat/merged");
	await branch(proj, "feat/work");
	await branch(proj, "feat/open");
	await git(
		proj,
		"worktree",
		"add",
		"-q",
		join(proj, ".claude/worktrees/o"),
		"feat/open",
	);
	await git(proj, "cherry-pick", "feat/open");

	const free = await freeBranches(output, proj, LATER, 7 * DAY);
	expect(free).toEqual(["feat/merged"]);
	expect(await freeBranches(output, proj, Date.now(), 7 * DAY)).toEqual([]);

	const report = await branchReport(output, [proj, proj], {
		dryRun: true,
		remote: false,
		now: LATER,
		limitMs: 7 * DAY,
	});
	expect(report).toContain(`local-branch  ${proj}  feat/merged`);
	expect(report).toContain("would delete 1 branches");
	expect(await names(proj)).toContain("feat/merged");

	await branchReport(output, [proj], {
		dryRun: false,
		remote: false,
		now: LATER,
		limitMs: 7 * DAY,
	});
	const left = await names(proj);
	expect(left).not.toContain("feat/merged");
	expect(
		[base, "feat/work", "feat/open"].filter((name) => !left.includes(name)),
	).toEqual([]);
});

/** A `Run` that answers `git` for real, and the `gh` and `ls-remote` calls and the push from the given texts. */
const remoteRun =
	(prs: unknown[], heads: string[], pushed: string[]): Run =>
	(argv, cwd) => {
		const text = argv.join(" ");
		if (text.startsWith("git remote get-url")) {
			return Promise.resolve("git@github.com:me/proj.git\n");
		}
		if (text.startsWith("gh pr list")) {
			return Promise.resolve(JSON.stringify(prs));
		}
		if (text.startsWith("git ls-remote")) {
			return Promise.resolve(heads.join("\n"));
		}
		if (text.startsWith("git push")) {
			pushed.push(argv[4] ?? "");
			return Promise.resolve("");
		}
		return output(argv, cwd);
	};

test("a remote branch goes only with --remote and no dry run, by a merged pull request or a default branch that has its commits, and never with an open pull request", async () => {
	const { proj } = await repo();
	await branch(proj, "fix/merged-pr");
	await branch(proj, "fix/open-pr");
	await branch(proj, "fix/by-cherry");
	await git(proj, "cherry-pick", "fix/by-cherry");
	const tip = (name: string) => tipOf(proj, name);
	const heads = await Promise.all(
		["fix/merged-pr", "fix/open-pr", "fix/by-cherry"].map(
			async (name) => `${await tip(name)}\trefs/heads/${name}`,
		),
	);
	const prs = [
		{
			state: "MERGED",
			headRefName: "fix/merged-pr",
			headRefOid: await tip("fix/merged-pr"),
			isCrossRepository: false,
		},
		{
			state: "OPEN",
			headRefName: "fix/open-pr",
			headRefOid: await tip("fix/open-pr"),
			isCrossRepository: false,
		},
	];
	const pushed: string[] = [];
	const run = remoteRun(prs, heads, pushed);
	const options = { remote: true, now: LATER, limitMs: 7 * DAY };

	const dry = await branchReport(run, [proj], { ...options, dryRun: true });
	expect(dry).toContain(`remote-branch  ${proj}  origin/fix/merged-pr`);
	expect(dry).toContain("origin/fix/by-cherry");
	expect(dry).not.toContain("fix/open-pr  ");
	expect(dry).not.toContain("origin/fix/open-pr");
	expect(pushed).toEqual([]);

	const without = await branchReport(run, [proj], {
		...options,
		remote: false,
		dryRun: false,
	});
	expect(without).not.toContain("remote-branch");
	expect(pushed).toEqual([]);

	await branchReport(run, [proj], { ...options, dryRun: false });
	expect(new Set(pushed)).toEqual(new Set(["fix/by-cherry", "fix/merged-pr"]));
});
