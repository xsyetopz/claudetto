// Lab tests of the `work.bash-*` hooks (task 19.12 of change `redesign-0-4-0`): a `Bash` call that changes a protected file is undone, and a tick that git brought stays.
// The protected files are the boxes of a `tasks.md`, the plan and spec files, `.claude/claudetto/goal.json`, and `.jscpd-baseline.json`. The stubs are in `stubs/protect.ts`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { setUrl } from "./stubs/git-world.ts";
import {
	after,
	BASELINE,
	before,
	checkoutTick,
	ELSEWHERE,
	FETCHED,
	GOAL,
	listed,
	OLD,
	OPEN,
	REAL,
	REFS,
	remoteMoved,
	repo,
	serve,
	stub,
	TASKS,
	TICKED,
	tickUndone,
	UNAVAILABLE,
} from "./stubs/protect.ts";

test("Tick Undone: a `Bash` tick of a `tasks.md` is written back, and the line names `Edit`", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	await before($);
	await expect(tickUndone($, world)).resolves.toBeUndefined();
});

test("Other Write: a `Bash` write of a file that is not protected stays", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN, "/p/src/a.ts": "one\n" });
	repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN });
	await before($);
	world.files["/p/src/a.ts"] = "two\n";
	const answer = await after($, listed("/p/src/a.ts"));
	expect(world.files["/p/src/a.ts"]).toBe("two\n");
	expect(answer.additionalContext ?? []).toStrictEqual([]);
});

test("Text Change: a `Bash` change of a `tasks.md` that leaves each box as it was stays", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN });
	await before($);
	world.files[TASKS] = "- [ ] 1.1 first, changed\n- [ ] 1.2 second\n";
	const answer = await after($, listed(TASKS));
	expect(world.files[TASKS]).toContain("changed");
	expect(answer.additionalContext ?? []).toStrictEqual([]);
});

test("Unavailable Field: with `unavailable` in the field, the hashes find the tick and it is undone", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN, [GOAL]: '{"check":"just check"}' });
	await before($);
	world.files[TASKS] = TICKED;
	const answer = await after($, UNAVAILABLE);
	expect(world.files[TASKS]).toBe(OPEN);
	expect((answer.additionalContext ?? []).join("\n")).toContain("`Edit`");
});

test("Missing Field: with no field, the hashes find a changed baseline and it is written back", async ($: Engine, on: On) => {
	const world = stub(on, { [BASELINE]: '{"clones":[]}' });
	await before($);
	world.files[BASELINE] = '{"clones":["a"]}';
	await after($);
	expect(world.files[BASELINE]).toBe('{"clones":[]}');
});

test("Created File: a protected file that the call created is deleted", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	await before($);
	world.files[GOAL] = '{"check":"true"}';
	await after($, listed(GOAL));
	expect(GOAL in world.files).toBe(false);
});

test("Plan File: a changed plan file is written back", async ($: Engine, on: On) => {
	const plan = "/p/openspec/changes/x/design.md";
	const world = stub(on, { [plan]: "one\n" });
	await before($);
	world.files[plan] = "two\n";
	await after($, UNAVAILABLE);
	expect(world.files[plan]).toBe("one\n");
});

test("Field Switch: `session.start` turns on `bashEditDiff` with the env var", async ($: Engine, on: On) => {
	const world = stub(on, {});
	await $.session.start({
		cwd: "/p",
		surface: "terminal",
		isInteractive: true,
	});
	expect(world.env["CLAUDE_CODE_BASH_EDIT_DIFF"]).toBe("1");
});
test("Git Checkout: a tick that `git checkout` of a branch from before brings stays", async ($: Engine, on: On) => {
	await expect(checkoutTick($, on, OPEN)).resolves.toBeUndefined();
});

test("Git Pull: a tick from a commit that a remote-tracking ref got in the call stays", async ($: Engine, on: On) => {
	const world = await remoteMoved($, on, (w) => serve(w, REAL, FETCHED));
	expect(world.files[TASKS]).toBe(TICKED);
});

test("Update Ref: a tick from a remote-tracking ref that the call moved with `update-ref` is undone, as the remote has another sha", async ($: Engine, on: On) => {
	const world = await remoteMoved($, on, (w) => serve(w, REAL, OLD));
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Remote Url Changed: a tick from a ref that the call fetched from its own URL, set with `git config remote.origin.url`, is undone", async ($: Engine, on: On) => {
	const world = await remoteMoved($, on, (w) => {
		setUrl(w, "origin", "/tmp/x");
		serve(w, "/tmp/x", FETCHED);
	});
	expect(world.files[TASKS]).toBe(OPEN);
});

test("New Remote: a tick from a ref of a remote that the call added is undone, as the remote had no URL at the first call", async ($: Engine, on: On) => {
	const world = await remoteMoved($, on, (w) => {
		setUrl(w, "evil", ELSEWHERE);
		serve(w, ELSEWHERE, FETCHED);
		w.git[REFS] = `${OLD} refs/heads/main\n${FETCHED} refs/remotes/evil/main`;
	});
	expect(world.files[TASKS]).toBe(OPEN);
});

const ARCHIVED = "/p/openspec/changes/archive/2026-10-27-x/tasks.md";

test("Archive Move: a change folder moved into the archive with the same text is not written back", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN });
	await before($);
	delete world.files[TASKS];
	world.files[ARCHIVED] = OPEN;
	const answer = await after($, listed(TASKS));
	expect(TASKS in world.files).toBe(false);
	expect(answer.additionalContext ?? []).toStrictEqual([]);
});

test("Archive Tick: a moved `tasks.md` with a box ticked on the way is written back", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	await before($);
	delete world.files[TASKS];
	world.files[ARCHIVED] = TICKED;
	await after($, listed(TASKS));
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Duplicate Delete: a delete of a copy whose text is in the archive is not written back", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN, [ARCHIVED]: OPEN });
	await before($);
	delete world.files[TASKS];
	await after($, listed(TASKS));
	expect(TASKS in world.files).toBe(false);
});

test("Plain Delete: a delete with no copy of the text is written back", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN, [ARCHIVED]: TICKED });
	await before($);
	delete world.files[TASKS];
	await after($, listed(TASKS));
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Other Folder Move: a plan file moved to another change folder with the same text is not written back", async ($: Engine, on: On) => {
	const plan = "/p/openspec/changes/x/design.md";
	const world = stub(on, { [plan]: "one\n" });
	await before($);
	delete world.files[plan];
	world.files["/p/openspec/changes/y/design.md"] = "one\n";
	await after($, UNAVAILABLE);
	expect(plan in world.files).toBe(false);
});
