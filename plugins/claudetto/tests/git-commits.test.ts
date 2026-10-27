// Lab tests of the `work.bash-*` hooks: the pin, the undo of a created or deleted file, and the commits that git has (task 19.12).

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
	BIN,
	LOCAL,
	setConfig,
	setUrl,
	type World,
} from "./stubs/git-world.ts";
import {
	after,
	BASELINE,
	before,
	checkoutTick,
	evilVia,
	FETCHED,
	INDEX_DIFF,
	listed,
	NEW,
	OLD,
	OPEN,
	overSsh,
	REAL,
	REFS,
	remoteMoved,
	repo,
	serve,
	stub,
	TASKS,
	TICKED,
	tickUndone,
} from "./stubs/protect.ts";

/** Another write lands the pin `seed` first, and a call ticks `tasks.md` with `NEW` as a known commit that has the tick. */
const seededTick = async ($: Engine, on: On, seed: Record<string, unknown>) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN, [NEW]: TICKED });
	world.beforeSet = () =>
		world.store.set("bashKnown/session", {
			value: { commits: [NEW], remotes: {}, urls: {}, ...seed },
			version: 1,
		});
	await before($);
	world.files[TASKS] = TICKED;
	await after($, listed(TASKS));
	return world;
};

test("First Pin: a pin that another write landed first keeps the first pin, so its commit is trusted", async ($: Engine, on: On) => {
	const world = await seededTick($, on, { git: BIN.git });
	expect(world.files[TASKS]).toBe(TICKED);
});

test("Pin Without Git: a tick is undone when the pin has no `git` path", async ($: Engine, on: On) => {
	const world = await seededTick($, on, {});
	expect(world.files[TASKS]).toBe(OPEN);
});

/** A call ticks `tasks.md` and writes a new `.jscpd-baseline.json`, and `/bin/rm` ends as `rm`. */
const removeFails = async ($: Engine, on: On, rm: World["rm"]) => {
	const world = stub(on, { [TASKS]: OPEN });
	world.rm = rm;
	await before($);
	world.files[TASKS] = TICKED;
	world.files[BASELINE] = '{"clones":[]}';
	const answer = await after($, listed(TASKS, BASELINE));
	expect(world.files[TASKS]).toBe(OPEN);
	const notes = answer.additionalContext ?? [];
	const [tasks, baseline] = [
		"openspec/changes/x/tasks.md",
		".jscpd-baseline.json",
	];
	// The restored file and the file that is still there are named in separate lines.
	expect(notes.find((n) => n.includes(tasks))).not.toContain(baseline);
	expect(notes.some((n) => n.includes(baseline) && !n.includes(tasks))).toBe(
		true,
	);
};

test("Rm Rejects: when `/bin/rm` cannot run, the restored file and the created file that is still there each get a line", async ($: Engine, on: On) => {
	await expect(removeFails($, on, "reject")).resolves.toBeUndefined();
});

test("Rm Fails: a file that `/bin/rm` could not delete gets its own line, not the line of the undone files", async ($: Engine, on: On) => {
	await expect(removeFails($, on, "fail")).resolves.toBeUndefined();
});

/** A repo with an `ssh` remote and `origin/main` at `OLD`. */
const sshRepo = (on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main\n${OLD} refs/remotes/origin/main`, {
		[FETCHED]: TICKED,
	});
	overSsh(world);
	return world;
};

/** `core.sshCommand` is a script with its own repo. */
const evilConfig = (world: World) => {
	setConfig(world, LOCAL, "core.sshcommand", "evil");
	evilVia(world, "evil");
};

/** The call moves `origin/main` to `FETCHED` and ticks `tasks.md`. */
const moveAndTick = (world: World, $: Engine) => {
	world.git[REFS] =
		`${OLD} refs/heads/main\n${FETCHED} refs/remotes/origin/main`;
	world.files[TASKS] = TICKED;
	return after($, listed(TASKS));
};

test("Config Before First Call: a tick is undone when the config was changed after `session.start` and before the first `Bash` call", async ($: Engine, on: On) => {
	const world = sshRepo(on);
	await $.session.start({
		cwd: "/p",
		surface: "terminal",
		isInteractive: true,
	});
	await new Promise((resolve) => setTimeout(resolve, 20)); // The pin does not hold the start.
	evilConfig(world);
	await before($);
	await moveAndTick(world, $);
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Config Line: the undo of a tick that a changed config made untrusted gets a second line", async ($: Engine, on: On) => {
	const world = sshRepo(on);
	await before($);
	evilConfig(world);
	const answer = await moveAndTick(world, $);
	expect(answer.additionalContext ?? []).toHaveLength(2);
});

test("Local Remote: a tick from a remote with a path as URL is undone, as the call can write the path", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main\n${OLD} refs/remotes/origin/main`, {
		[FETCHED]: TICKED,
	});
	setUrl(world, "origin", "/srv/repo.git");
	serve(world, "/srv/repo.git", OLD);
	await before($);
	world.git[REFS] =
		`${OLD} refs/heads/main\n${FETCHED} refs/remotes/origin/main`;
	serve(world, "/srv/repo.git", FETCHED);
	world.files[TASKS] = TICKED;
	await after($, listed(TASKS));
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Own Commit: a tick that the call wrote and committed is undone, as the new `HEAD` is not from before", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN });
	await before($);
	world.git[REFS] = `${NEW} refs/heads/main`;
	world.git["rev-parse HEAD"] = `${NEW}\n`;
	world.blobs[NEW] = TICKED;
	await expect(tickUndone($, world)).resolves.toBeUndefined();
});

test("No Git Match: a tick that no commit from before has is undone", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main\n${NEW} refs/heads/other`, {
		[OLD]: OPEN,
		[NEW]: OPEN,
	});
	await before($);
	world.files[TASKS] = TICKED;
	await after($, listed(TASKS));
	expect(world.files[TASKS]).toBe(OPEN);
});

test("No Repo: a tick with no git repo is undone", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	await before($);
	world.files[TASKS] = TICKED;
	await after($, listed(TASKS));
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Deleted File: a call that deletes a `tasks.md` gets it written back, and the line names `Edit`", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	await before($);
	delete world.files[TASKS];
	const answer = await after($, listed(TASKS));
	expect(world.files[TASKS]).toBe(OPEN);
	expect((answer.additionalContext ?? []).join("\n")).toContain("`Edit`");
});

test("Session Commit: a tick from a ref that an earlier call of the session moved is undone in a later call", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN });
	await before($, "t1");
	world.git[REFS] = `${NEW} refs/heads/main`;
	await after($, undefined, "t1");
	world.blobs[NEW] = TICKED;
	await before($, "t2");
	world.files[TASKS] = TICKED;
	await after($, listed(TASKS), "t2");
	expect(world.files[TASKS]).toBe(OPEN);
});

/** More refs than `GIT_COMMITS_MAX` (200), none with the blob. */
const manyRefs = () =>
	Array.from(
		{ length: 250 },
		(_, i) => `${i.toString(16).padStart(40, "0")} refs/tags/t${i}`,
	).join("\n");

/** More than 200 refs with none of the blob, and the tick in the commit `NEW`, which `where` makes known: `"stash"` or `"HEAD"`. The call ticks `tasks.md`. */
const manyRefsTick = async ($: Engine, on: On, where: "stash" | "HEAD") => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, manyRefs(), {});
	if (where === "stash") {
		world.git["stash list --format=%H"] = `${NEW}\n`;
	} else {
		world.git["rev-parse HEAD"] = `${NEW}\n`;
	}
	world.blobs[NEW] = TICKED;
	await before($);
	world.files[TASKS] = TICKED;
	await after($, listed(TASKS));
	return world.files[TASKS];
};

test("Many Refs, Stash: a tick that `git stash pop` brings stays with more than 200 refs", async ($: Engine, on: On) => {
	expect(await manyRefsTick($, on, "stash")).toBe(TICKED);
});

test("Many Refs, HEAD: a tick that `git checkout` of the detached `HEAD` brings stays with more than 200 refs", async ($: Engine, on: On) => {
	expect(await manyRefsTick($, on, "HEAD")).toBe(TICKED);
});

test("Deleted File Not Listed: a deleted `tasks.md` that the diff does not list is written back", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN, "/p/src/a.ts": "one\n" });
	await before($);
	delete world.files[TASKS];
	const answer = await after($, listed("/p/src/a.ts"));
	expect(world.files[TASKS]).toBe(OPEN);
	expect((answer.additionalContext ?? []).join("\n")).toContain("`Edit`");
});

test("Pulled New File: a `tasks.md` that `git checkout` of a branch from before brings new stays", async ($: Engine, on: On) => {
	await expect(checkoutTick($, on)).resolves.toBeUndefined();
});

test("Written New File: a ticked `tasks.md` that the call wrote and no commit from before has is deleted, also in a repo", async ($: Engine, on: On) => {
	const world = stub(on, {});
	repo(world, `${OLD} refs/heads/main\n${NEW} refs/heads/other`, {
		[OLD]: OPEN,
	});
	await before($);
	world.files[TASKS] = TICKED;
	const answer = await after($, listed(TASKS));
	expect(TASKS in world.files).toBe(false);
	expect((answer.additionalContext ?? []).join("\n")).toContain("`Edit`");
});

test("One Lookup: the commits repeat in the refs, and one git call looks up the blob in the distinct ones", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main\n${manyRefs()}`, {});
	world.git["stash list --format=%H"] = `${OLD}\n`;
	await before($);
	world.files[TASKS] = TICKED;
	await after($, listed(TASKS));
	const lines = world.lookups
		.join("")
		.split("\n")
		.filter((l) => l !== "");
	expect(world.lookups).toHaveLength(1);
	expect(new Set(lines).size).toBe(lines.length);
	expect(lines.length).toBeLessThanOrEqual(200);
	expect(world.runs.filter((r) => r.includes("show"))).toStrictEqual([]);
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Replaced Remote Commit: a tick whose blob only a `git replace` of a fetched commit gives is undone", async ($: Engine, on: On) => {
	const world = await remoteMoved($, on, (w) => {
		serve(w, REAL, FETCHED);
		w.blobs[FETCHED] = OPEN;
		w.replaced[FETCHED] = NEW;
		w.blobs[NEW] = TICKED;
	});
	expect(world.files[TASKS]).toBe(OPEN);
});

test("Replaced Commit: a tick whose blob only a `git replace` of a known commit gives is undone", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN, [NEW]: TICKED });
	await before($);
	world.replaced[OLD] = NEW;
	await expect(tickUndone($, world)).resolves.toBeUndefined();
});

/** The text of `tasks.md` after a call wrote `tree` while the branch `other`, which is from before, has `blob`. */
const treeAgainst = async ($: Engine, on: On, blob: string, tree: string) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main\n${NEW} refs/heads/other`, {
		[NEW]: blob,
	});
	await before($);
	world.files[TASKS] = tree;
	await after($, listed(TASKS));
	return world.files[TASKS];
};

const CRLF = TICKED.replaceAll("\n", "\r\n");

test("CRLF Work Tree: a tick that `git checkout` brings as `\\r\\n` text of an LF blob stays", async ($: Engine, on: On) => {
	expect(await treeAgainst($, on, TICKED, CRLF)).toBe(CRLF);
});

test("CRLF Blob: a tick as `\\n` text of a blob with `\\r\\n` is undone, because a checkout never turns `\\r\\n` of a blob into `\\n`", async ($: Engine, on: On) => {
	expect(await treeAgainst($, on, CRLF, TICKED)).toBe(OPEN);
});

test("CRLF Tick: a tick written as `\\r\\n` text that no commit has is undone", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN });
	await before($);
	world.files[TASKS] = TICKED.replaceAll("\n", "\r\n");
	await after($, listed(TASKS));
	expect(world.files[TASKS]).toBe(OPEN);
});

/** The file is tracked at `OLD`, the call deletes it, `HEAD` is `head` after the call, and `git diff-index --cached` lists `staged`: empty when the index is `head`, as after `git checkout`. */
const deleteAt = async (
	$: Engine,
	on: On,
	head: string,
	staged: string,
	change: (world: World) => void = () => undefined,
) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main\n${NEW} refs/heads/before`, {
		[OLD]: OPEN,
	});
	await before($);
	world.git["rev-parse HEAD"] = `${head}\n`;
	world.git[INDEX_DIFF] = staged;
	change(world);
	delete world.files[TASKS];
	await after($, listed(TASKS));
	return world.files;
};

test("Switched Branch: a `tasks.md` gone with `git checkout` of a branch from before that lacks it is not written back", async ($: Engine, on: On) => {
	const files = await deleteAt($, on, NEW, "");
	expect(TASKS in files).toBe(false);
});

test("Removed File: a `tasks.md` that a call deletes with `HEAD` as it was, in a repo, is written back", async ($: Engine, on: On) => {
	const files = await deleteAt($, on, OLD, "");
	expect(files[TASKS]).toBe(OPEN);
});

test("Own Commit Delete: a `tasks.md` deleted and committed by the call is written back, as the new `HEAD` is not from before", async ($: Engine, on: On) => {
	const files = await deleteAt($, on, FETCHED, "");
	expect(files[TASKS]).toBe(OPEN);
});

test("Moved HEAD Delete: a `tasks.md` deleted with `git symbolic-ref`, `git update-ref --no-deref HEAD`, or `git reset --soft` to a commit from before is written back, as the index still differs from the new `HEAD`", async ($: Engine, on: On) => {
	const files = await deleteAt($, on, NEW, "openspec/changes/x/tasks.md\n");
	expect(files[TASKS]).toBe(OPEN);
});

test("Index Unreadable: a `tasks.md` deleted with a new `HEAD` is written back when git cannot compare the index", async ($: Engine, on: On) => {
	const files = await deleteAt($, on, NEW, "", (w) => {
		delete w.git[INDEX_DIFF];
	});
	expect(files[TASKS]).toBe(OPEN);
});

/** The call deletes `tasks.md` and `git pull` moves `origin/main` and `HEAD` to `FETCHED`, which lacks it. `change` sets what the call did to the remote. */
const pulledDelete = ($: Engine, on: On, change: (world: World) => void) =>
	deleteAt($, on, FETCHED, "", (w) => {
		w.git[REFS] = `${OLD} refs/heads/main\n${FETCHED} refs/remotes/origin/main`;
		change(w);
	});

test("Pulled Delete: a `tasks.md` that `git pull` removes, with a `HEAD` that the remote has, is not written back", async ($: Engine, on: On) => {
	const files = await pulledDelete($, on, (w) => serve(w, REAL, FETCHED));
	expect(TASKS in files).toBe(false);
});

test("Pulled Delete, Own Url: a `tasks.md` is written back when the new `HEAD` came from a URL that the call set", async ($: Engine, on: On) => {
	const files = await pulledDelete($, on, (w) => {
		setUrl(w, "origin", "/tmp/x");
		serve(w, "/tmp/x", FETCHED);
	});
	expect(files[TASKS]).toBe(OPEN);
});

/** The `additionalContext` lines of the `PostToolUse` of each call in `ids`, in order. */
const postLines = async ($: Engine, ids: string[]) =>
	await Array.fromAsync(ids, async (id) => {
		await before($, id);
		return ((await after($, undefined, id)).additionalContext ?? []).length;
	});

test("No Commits Notice: when git gives no commits at the first call, the result of that call gets one line, and a later call gets none", async ($: Engine, on: On) => {
	stub(on, { [TASKS]: OPEN });
	expect(await postLines($, ["t1", "t2", "t3"])).toStrictEqual([1, 0, 0]);
});

test("Commits Known: when git gives the commits at the first call, no call gets a line", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN });
	expect(await postLines($, ["t1", "t2"])).toStrictEqual([0, 0]);
});

test("Lost Notice: when the undo throws, the line for no commits is not lost for the session", async ($: Engine, on: On) => {
	const world = stub(on, { [TASKS]: OPEN });
	await before($, "t1");
	world.readOnly = true;
	world.files[TASKS] = TICKED;
	await after($, listed(TASKS), "t1");
	expect(await postLines($, ["t2"])).toStrictEqual([1]);
});
