import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { SLICE_COMMIT } from "../../texts.ts";
import { A, edit, fakeRepo, lab, stop } from "./slices.mock.ts";

test("a stop with an edited file git reports changed is blocked, and the block names it and keeps the answer in the last message", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(on, fakeRepo({ [A]: " M" }), "allow", runs);
	await edit($);
	const out = await stop($);
	expect(out.block).toBe(SLICE_COMMIT(["src/a.ts"], []));
	expect(runs).toContainEqual([
		"git",
		"-C",
		"/repo/src",
		"status",
		"--porcelain",
		"--",
		A,
	]);
});

test("a stop with a notebook NotebookEdit changed is blocked, and the block names it", async ($: Engine, on: On) => {
	const nb = "/repo/nb/a.ipynb";
	lab(on, fakeRepo({ [nb]: " M" }));
	await $.tool.call({
		tool: "NotebookEdit",
		tool_use_id: "t3",
		notebook_path: nb,
		new_source: "x = 1",
	});
	const awaited = await stop($);
	expect(awaited.block).toContain("`nb/a.ipynb`");
});

test("a committed edit passes", async ($: Engine, on: On) => {
	lab(on, fakeRepo());
	await edit($);
	const awaited2 = await stop($);
	expect(awaited2.block).toBeUndefined();
});

test("a stop with no write asks git only for its worktree list and passes", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(on, fakeRepo({ [A]: " M" }), "allow", runs);
	const awaited3 = await stop($);
	expect(awaited3.block).toBeUndefined();
	expect(runs).toEqual([["git", "worktree", "list", "--porcelain"]]);
});

test("when the permission chain denies a commit, the stop passes", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ [A]: " M" }), "deny");
	await edit($);
	const awaited4 = await stop($);
	expect(awaited4.block).toBeUndefined();
});

test("a commit that needs an answer blocks the stop in a session that has someone to answer", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ [A]: " M" }), "ask");
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: true });
	await edit($);
	const awaited5 = await stop($);
	expect(awaited5.block).toContain("`src/a.ts`");
});

test("a commit that needs an answer lets the stop pass in a headless session", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ [A]: " M" }), "ask");
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: false });
	await edit($);
	const awaited6 = await stop($);
	expect(awaited6.block).toBeUndefined();
});

test("a stop the hook already continued passes", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ [A]: " M" }));
	await edit($);
	const awaited7 = await stop($, true);
	expect(awaited7.block).toBeUndefined();
});

test("a no-commit constraint from the user, through the ledger, lets the stop pass", async ($: Engine, on: On) => {
	lab(
		on,
		fakeRepo({ [A]: " M" }),
		"allow",
		[],
		'{"restricts_1":{"answer":"yes","evidence":"do not commit"},"rule_1":{"answer":"no-commit","evidence":"do not commit"}}',
	);
	await $.prompt.submit({
		text: "Fix it, but do not commit.",
		wait: false,
		origin: { kind: "composer" },
	});
	await edit($);
	const awaited8 = await stop($);
	expect(awaited8.block).toBeUndefined();
});

test("a stop another check blocked keeps that block", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ [A]: " M" }), "allow", [], undefined, {
		block: "Other check.",
	});
	await edit($);
	const awaited9 = await stop($);
	expect(awaited9.block).toBe("Other check.");
});

test("a file that a subagent wrote in its own worktree under the cwd is no slice of this session", async ($: Engine, on: On) => {
	const nested = "/repo/.claude/worktrees/agent-1/src/a.ts";
	lab(on, fakeRepo({ [nested]: " M" }));
	await edit($, nested);
	const awaited10 = await stop($);
	expect(awaited10.block).toBeUndefined();
});

test("a file in another repo that an Edit wrote is blocked and named", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ "/other/z.ts": " M" }));
	await edit($, "/other/z.ts");
	const awaited11 = await stop($);
	expect(awaited11.block).toContain("z.ts");
});
