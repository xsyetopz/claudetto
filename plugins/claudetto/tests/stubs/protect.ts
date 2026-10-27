// The stubs and the repo helpers of the `protect` lab tests: the engine hooks, the `Bash` call, and a repo with a remote.

import type { On } from "claude-code";
import { type Engine, expect } from "claude-code/testing";
import { listing } from "./files.ts";
import {
	BIN,
	fakeGitRun,
	gitRun,
	LOCAL,
	real,
	rmRun,
	setConfig,
	setUrl,
	type World,
} from "./git-world.ts";
import { ran } from "./process.ts";

export const TASKS = "/p/openspec/changes/x/tasks.md";
export const OPEN = "- [ ] 1.1 first\n- [ ] 1.2 second\n";
export const TICKED = "- [x] 1.1 first\n- [ ] 1.2 second\n";
export const GOAL = "/p/.claude/claudetto/goal.json";
export const BASELINE = "/p/.jscpd-baseline.json";
/** Stubs the files in `files`, the state, and `process.run`, which stands for the `rm` of a created file, and for `git`. */
export const stub = (on: On, files: Record<string, string>): World => {
	const world: World = {
		files: { ...files },
		runs: [],
		git: {},
		blobs: {},
		replaced: {},
		lookups: [],
		readOnly: false,
		env: { HOME: "/home/u" },
		servers: {},
		bin: { ...BIN },
		fakeGit: undefined,
		rm: "ok",
		store: new Map(),
		beforeSet: undefined,
	};
	on("tool.call", () => ({ result: "ok" }));
	on("classic.PostToolUse", () => ({}));
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("session.root", () => ({ value: "/p" }));
	on("session.cwd", () => ({ value: "/p" }));
	on("session.id", () => ({ value: "s1" }));
	on("env.get", (_$, e) => ({ value: world.env[e.name] }));
	on("env.set", (_$, e) => {
		world.env[e.name] = e.value ?? "";
		return { value: {} };
	});
	on("clock.now", () => ({ value: 0 }));
	on("state.get", (_$, e) => ({
		value: {
			...(world.store.get(`${e.key}/${e.id}`) ?? {
				value: undefined,
				version: 0,
			}),
		},
	}));
	on("state.set", (_$, e) => {
		const key = `${e.key}/${e.id}`;
		if (key === "bashKnown/session") {
			const race = world.beforeSet;
			world.beforeSet = undefined;
			race?.();
		}
		const held = world.store.get(key) ?? { value: undefined, version: 0 };
		if (e.ifVersion !== undefined && e.ifVersion !== held.version) {
			return { value: { isSet: false, version: held.version } };
		}
		world.store.set(key, { value: e.value, version: held.version + 1 });
		return { value: { isSet: true, version: held.version + 1 } };
	});
	on("fs.list", (_$, e) => ({
		value: listing(Object.keys(world.files), e.path),
	}));
	on("fs.exists", (_$, e) => ({ value: e.path in world.files }));
	on("fs.read", (_$, e) => {
		const text = world.files[e.path];
		return text === undefined ? { deny: "ENOENT" } : { value: text };
	});
	on("fs.write", (_$, e) => {
		if (world.readOnly) {
			return { deny: "EROFS" };
		}
		world.files[e.path] = e.text;
		return { value: undefined };
	});
	on("fs.stat", (_$, e) =>
		e.path in world.files || e.path === "/p"
			? {
					value: {
						kind: e.path === "/p" ? "dir" : "file",
						size: 0,
						mtimeMs: 0,
						isLink: false,
						realPath: real(e.path),
					},
				}
			: { deny: "ENOENT" },
	);
	on("process.run", (_$, e) => {
		world.runs.push([...e.argv]);
		const file = e.argv[0] === "git" ? world.bin.git : e.argv[0];
		if (file !== undefined && file === world.fakeGit) {
			return fakeGitRun(e.argv, e.init?.stdin);
		}
		if (e.argv[0]?.endsWith("git")) {
			return gitRun(world, e.argv, e.init?.stdin);
		}
		if (e.argv[0]?.endsWith("sh")) {
			return ran(`ssh=${world.bin.ssh}\ngit=${world.bin.git}\n`);
		}
		if (e.argv[0]?.endsWith("rm")) {
			return rmRun(world, e.argv);
		}
		return ran("");
	});
	return world;
};

/** The call `t1`: `$.tool.call` raises `classic.PreToolUse`, and the stub of `tool.call` stands for core. */
export const before = ($: Engine, id = "t1") =>
	$.tool.call({ tool: "Bash", tool_use_id: id, command: "x" });

/** The `PostToolUse` of the `Bash` call `t1` with the field `diff` in `tool_response`. */
export const after = ($: Engine, diff?: unknown, id = "t1") =>
	$.classic.PostToolUse({
		tool_name: "Bash",
		tool_input: { command: "x" },
		tool_response: diff === undefined ? {} : { bashEditDiff: diff },
		tool_use_id: id,
	});

export const listed = (...paths: string[]) => ({
	files: paths.map((filePath) => ({ filePath, hunks: [] })),
	moreFiles: 0,
	changedFiles: paths.map(real),
});

export const UNAVAILABLE = { files: [], moreFiles: 0, unavailable: true };
export const REFS = "for-each-ref --format=%(objectname) %(refname)";
export const OLD = "a".repeat(40);
export const NEW = "b".repeat(40);
export const FETCHED = "c".repeat(40);
export const REAL = "https://example.com/real.git";
export const ELSEWHERE = "https://example.net/other.git";
export const INDEX_DIFF = "diff-index --cached --name-only HEAD --";

/** The server at `url` has `sha` at the branch `main`. */
export const serve = (world: World, url: string, sha: string) => {
	world.servers[url] = { "refs/heads/main": sha };
};

/** A repo with the branch `main` at `OLD` before the call, and the remote `origin` at `REAL`; `blobs` is the `tasks.md` of each commit. */
export const repo = (
	world: World,
	refs: string,
	blobs: Record<string, string>,
) => {
	world.git[REFS] = refs;
	setUrl(world, "origin", REAL);
	serve(world, REAL, OLD);
	world.git["rev-parse HEAD"] = `${OLD}\n`;
	world.git["stash list --format=%H"] = "";
	world.files["/p/.git"] = "gitdir: /p/.git-dir\n";
	Object.assign(world.blobs, blobs);
};
/** The call moves `origin/main` to `FETCHED` and ticks `tasks.md`. `setup` sets the config before the first call. `change` sets what the call did to the remote: the server, the config, or the refs. */
export const remoteMoved = async (
	$: Engine,
	on: On,
	change: (world: World) => void,
	setup: (world: World) => void = () => undefined,
) => {
	const world = stub(on, { [TASKS]: OPEN });
	repo(world, `${OLD} refs/heads/main\n${OLD} refs/remotes/origin/main`, {
		[FETCHED]: TICKED,
	});
	setup(world);
	await before($);
	world.git[REFS] =
		`${OLD} refs/heads/main\n${FETCHED} refs/remotes/origin/main`;
	change(world);
	world.files[TASKS] = TICKED;
	await after($, listed(TASKS));
	return world;
};
export const GH = "https://h.invalid/x/y";
export const SSH_URL = "git@h.invalid:x/y.git";

/** `origin` is `gh:x/y`, which `url.https://h.invalid/.insteadOf=gh:` turns into `GH`. */
export const aliased = (world: World) => {
	setUrl(world, "origin", "gh:x/y");
	setConfig(world, LOCAL, "url.https://h.invalid/.insteadof", "gh:");
	serve(world, GH, OLD);
};

/** `origin` is the `ssh` URL `SSH_URL`, and the server there has `OLD`. */
export const overSsh = (world: World) => {
	setUrl(world, "origin", SSH_URL);
	serve(world, SSH_URL, OLD);
};

/** The call makes the server `via` a command have `FETCHED`: its own repo. */
export const evilVia = (world: World, command: string) => {
	world.servers[`via:${command}`] = { "refs/heads/main": FETCHED };
};

/** The call ticks `tasks.md`, and the tick must be written back with a line that names `Edit`. */
export const tickUndone = async ($: Engine, world: World) => {
	world.files[TASKS] = TICKED;
	const answer = await after($, listed(TASKS));
	expect(world.files[TASKS]).toBe(OPEN);
	expect((answer.additionalContext ?? []).join("\n")).toContain("`Edit`");
};

/** The call ticks `tasks.md` (`before` is its text, or `undefined` for a new file) and `git checkout` of a branch from before brings the tick. The file stays. */
export const checkoutTick = async ($: Engine, on: On, before_?: string) => {
	const world = stub(on, before_ === undefined ? {} : { [TASKS]: before_ });
	repo(world, `${OLD} refs/heads/main\n${NEW} refs/heads/other`, {
		[NEW]: TICKED,
	});
	await before($);
	world.files[TASKS] = TICKED;
	const answer = await after($, listed(TASKS));
	expect(world.files[TASKS]).toBe(TICKED);
	expect(answer.additionalContext ?? []).toStrictEqual([]);
};
