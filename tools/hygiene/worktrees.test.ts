import { expect, test } from "bun:test";
import { exists, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
	agentWorktrees,
	projectsOf,
	worktreeReport,
} from "../../plugins/claudetto/hooks/classic.SessionStart/useHygieneSweep/worktrees.ts";
import { presentProjects } from "../../plugins/claudetto/hygiene/roots.ts";
import { output } from "../../plugins/claudetto/hygiene/trash.ts";
import { git, repo } from "./trash.mock.ts";

const INTEGRATED = "agent-a0000000000000001";
const AHEAD = "agent-a0000000000000002";
const DIRTY = "agent-a0000000000000003";
const LOCKED = "agent-a0000004";

/** An agent worktree of `proj` as Claude Code makes one, with one commit of its own. */
const agent = async (proj: string, name: string) => {
	const path = join(proj, ".claude/worktrees", name);
	await git(proj, "worktree", "add", "-q", "-b", `worktree-${name}`, path);
	await writeFile(join(path, `${name}.txt`), name);
	await git(path, "add", ".");
	await git(path, "commit", "-qm", name);
	return path;
};

/** A repo with four agent worktrees: one whose commit the main branch picked, one with a new commit, one with an uncommitted file, and one an agent still holds. */
const fleet = async () => {
	const { root, proj, worktree } = await repo();
	const integrated = await agent(proj, INTEGRATED);
	await git(proj, "cherry-pick", `worktree-${INTEGRATED}`);
	const ahead = await agent(proj, AHEAD);
	const dirty = await agent(proj, DIRTY);
	await git(proj, "cherry-pick", `worktree-${DIRTY}`);
	await writeFile(join(dirty, "draft.txt"), "x");
	const locked = await agent(proj, LOCKED);
	await git(proj, "cherry-pick", `worktree-${LOCKED}`);
	await git(
		proj,
		"worktree",
		"lock",
		"--reason",
		`claude agent ${LOCKED} (pid 1 start now)`,
		locked,
	);
	return { root, proj, worktree, integrated, ahead, dirty, locked };
};

const branches = async (proj: string) =>
	(await output(["git", "branch", "--format=%(refname:short)"], proj)) ?? "";

// Seen on the author's machine: 49 agent worktrees of one checkout held 95 GiB, 23 of them with every commit already picked into the lead's branch.
test("a clean, unlocked agent worktree whose commits the branch has goes with its branch, and the others stay with a reason", async () => {
	const { proj, worktree, integrated, ahead, dirty, locked } = await fleet();

	const found = await agentWorktrees(output, proj);
	expect(found.free).toEqual([
		{ path: integrated, branch: `worktree-${INTEGRATED}` },
	]);
	expect(found.kept).toEqual([
		{ path: ahead, why: "holds a commit the current branch lacks" },
		{ path: dirty, why: "holds uncommitted changes" },
	]);

	const report = await worktreeReport(output, [proj], false);

	expect(report).toContain(`agent-worktree  ${integrated}  `);
	expect(report).toContain(`kept-worktree  ${ahead}  `);
	expect(report).not.toContain(locked);
	expect(await exists(integrated)).toBe(false);
	const left = await branches(proj);
	expect(left).not.toContain(INTEGRATED);
	expect(left).toContain(`worktree-${AHEAD}`);
	const stayed = await Promise.all(
		[worktree, ahead, dirty, locked].map((path) => exists(path)),
	);
	expect(stayed).toEqual([true, true, true, true]);
});

test("a dry run names the worktree and removes nothing, and a project listed twice is reported once", async () => {
	const { proj, integrated } = await fleet();

	const report = await worktreeReport(output, [proj, proj], true);

	expect(report.split(integrated)).toHaveLength(2);
	expect(report).toContain("would remove 1 agent worktree");
	expect(await exists(integrated)).toBe(true);
	expect(await branches(proj)).toContain(INTEGRATED);
});

// Seen in a dry run: Claude Code's project list names folders under `/tmp` that are gone, and a command cannot start in one.
// Seen in a dry run: each gone folder of the project list logged one failed git call per check, 808 lines in all.
test("a listed project whose folder is gone is logged once and left out, and the next project stays", async () => {
	const { root, proj } = await fleet();
	const gone = join(root, "gone");
	const lines: string[] = [];

	const dirs = await presentProjects([gone, proj], (line) => lines.push(line));

	expect(dirs).toEqual([proj]);
	expect(lines).toEqual([
		`The project folder ${gone} is gone, so the sweep skips it.`,
	]);
});

// Seen in a dry run: 7 records of one project named folders that were gone, and each was reported as a kept worktree of 0 B.
test("a record whose folder is gone is no worktree: it is neither removed nor named", async () => {
	const { proj } = await repo();
	const gone = await agent(proj, AHEAD);
	await rm(gone, { recursive: true });

	expect(await agentWorktrees(output, proj)).toEqual({ free: [], kept: [] });
});

test("the projects are the keys of `projects` in Claude Code's global config, and a config without them gives none", () => {
	expect(projectsOf('{"projects":{"/a":{},"/b":{}}}')).toEqual(["/a", "/b"]);
	expect(projectsOf('{"numStartups":3}')).toEqual([]);
});
