// The `git` facts of the `tool.check` handler: the aliases and commands of the config, and the stamp of the config files that decides when they are read again.

import { beforeEach, expect, test } from "bun:test";
import { keepOptions } from "../../../plugins/claudetto/kernel/options.ts";
import { GIT_CONFIG_FILE_MAX_BYTES } from "../../../plugins/claudetto/modules/gate/limits.ts";
import { check, fake } from "./engine-fake.ts";

// A test that needs the classifier stage turns it on, so no other test depends on a fault of the stage.
beforeEach(() => keepOptions({ classifier: "off" }));

test("Git Facts: an alias of the config is read once, and `git p` asks while `git st` runs", async () => {
	const runs: (readonly string[])[] = [];
	// The folder `/q` has its own facts: the facts of a folder stay while its configs keep their mtime.
	const $ = {
		...fake("", runs),
		session: { cwd: async () => "/q" },
		process: {
			run: async (argv: readonly string[]) => {
				runs.push(argv);
				const out = argv.includes("--get-regexp")
					? "alias.p\npush --force\0alias.st\nstatus\0"
					: "push\nstatus\n";
				return { exitCode: 0, stdout: out, stderr: "" };
			},
		},
	};

	const pushed = await check("git p", { decision: "allow" }, $);
	const status = await check("git st", { decision: "allow" }, $);

	expect(pushed.decision).toBe("ask");
	expect(status.decision).toBe("allow");
	expect(runs.filter((r) => r.includes("--get-regexp"))).toHaveLength(1);
});

test("Git Facts: a `git` that fails leaves the common commands, so `git status` runs and `git zzz` asks", async () => {
	const $ = {
		...fake(""),
		session: { cwd: async () => "/r" },
		process: {
			run: async () => ({ exitCode: 128, stdout: "", stderr: "no git" }),
		},
	};

	const known = await check("git status", { decision: "allow" }, $);
	const unknown = await check("git zzz", { decision: "allow" }, $);

	expect([known.decision, unknown.decision]).toStrictEqual(["allow", "ask"]);
});

test("Git Facts: a common verb such as `add` reads no `git` config", async () => {
	const runs: (readonly string[])[] = [];
	const $ = { ...fake("", runs), session: { cwd: async () => "/s" } };

	const v = await check("git add src/a.ts", { decision: "allow" }, $);

	expect(v.decision).toBe("allow");
	expect(runs.flat()).not.toContain("--get-regexp");
	expect(runs.flat()).not.toContain("--list-cmds=main,others");
});

test("Git Facts: the aliases are read again when an included config file changes, and not before", async () => {
	const mtimes: Record<string, number> = { "/w/.git/config": 1, "/w/inc": 1 };
	let alias = "status";
	const runs: (readonly string[])[] = [];
	const $ = {
		...fake(""),
		session: { cwd: async () => "/w" },
		fs: {
			...fake("").fs,
			stat: async (path: string) =>
				mtimes[path] === undefined
					? Promise.reject(new Error("ENOENT"))
					: { mtimeMs: mtimes[path] },
		},
		process: {
			run: async (argv: readonly string[]) => {
				runs.push(argv);
				const out = argv.includes("--get-regexp")
					? `file:.git/config\0include.path\n../inc\0file:/w/inc\0alias.p\n${alias}\0`
					: "push\nstatus\n";
				return { exitCode: 0, stdout: out, stderr: "" };
			},
		},
	};

	const before = await check("git p", { decision: "allow" }, $);
	const same = await check("git p", { decision: "allow" }, $);
	alias = "push --force";
	mtimes["/w/inc"] = 2;
	const after = await check("git p", { decision: "allow" }, $);

	expect([before.decision, same.decision, after.decision]).toStrictEqual([
		"allow",
		"allow",
		"ask",
	]);
	// The first call reads twice, because the read names an include that the stamp before it did not cover.
	expect(runs.filter((r) => r.includes("--get-regexp"))).toHaveLength(3);
});

/** A fake `$` for a repo at `dir` whose (the facts of a folder are cached, so each test has its own)  config lists `config` and whose alias `p` runs `alias()`. `files` holds the mtimes, and `texts` the files that `fs.read` finds. */
const configFake = (
	dir: string,
	config: string,
	alias: () => string,
	files: Record<string, number>,
	texts: Record<string, string>,
	runs: (readonly string[])[],
) => ({
	...fake(""),
	session: { cwd: async () => dir },
	fs: {
		stat: async (path: string) =>
			files[path] === undefined
				? Promise.reject(new Error("ENOENT"))
				: { mtimeMs: files[path] },
		read: async (path: string) =>
			texts[path] === undefined
				? Promise.reject(new Error("ENOENT"))
				: texts[path],
	},
	process: {
		run: async (argv: readonly string[]) => {
			runs.push(argv);
			const out = argv.includes("--get-regexp")
				? `${config}alias.p\n${alias()}\0`
				: "push\nstatus\n";
			return { exitCode: 0, stdout: out, stderr: "" };
		},
	},
});

test("Git Facts: an included config file that is missing at the first read is read when it appears", async () => {
	let alias = "status";
	const files: Record<string, number> = { "/g1/.git/config": 1 };
	const runs: (readonly string[])[] = [];
	const $ = configFake(
		"/g1",
		"file:.git/config\0include.path\n../inc\0includeif.gitdir:/w/.path\n../more\0",
		() => alias,
		files,
		{},
		runs,
	);

	const before = await check("git p", { decision: "allow" }, $);
	alias = "push --force";
	files["/g1/inc"] = 1;
	const after = await check("git p", { decision: "allow" }, $);
	expect([before.decision, after.decision]).toStrictEqual(["allow", "ask"]);
	// The first call reads twice, because the read names an include that the stamp before it did not cover.
	expect(runs.filter((r) => r.includes("--get-regexp"))).toHaveLength(3);
});

test("Git Facts: a config rewrite that keeps the mtime and the size (`touch -r`) reads the aliases again", async () => {
	let alias = "status";
	const files: Record<string, number> = { "/g9/.git/config": 1 };
	const texts: Record<string, string> = {
		"/g9/.git/config": "[alias] p = aaaa",
	};
	const $ = configFake(
		"/g9",
		"file:.git/config\0",
		() => alias,
		files,
		texts,
		[],
	);

	const before = await check("git p", { decision: "allow" }, $);
	alias = "push --force";
	texts["/g9/.git/config"] = "[alias] p = bbbb";
	const after = await check("git p", { decision: "allow" }, $);
	expect([before.decision, after.decision]).toStrictEqual(["allow", "ask"]);
});

test("Git Facts: a config file over the size bound is not read, and an alias verb asks", async () => {
	const files: Record<string, number> = { "/g10/.git/config": 1 };
	const reads: string[] = [];
	const base = configFake(
		"/g10",
		"file:.git/config\0",
		() => "status",
		files,
		{ "/g10/.git/config": "[alias] p = status" },
		[],
	);
	const $ = {
		...base,
		fs: {
			stat: async (path: string) => ({
				...(await base.fs.stat(path)),
				size: GIT_CONFIG_FILE_MAX_BYTES + 1,
			}),
			read: async (path: string) => {
				reads.push(path);
				return base.fs.read(path);
			},
		},
	};

	const verdict = await check("git p", { decision: "allow" }, $);

	expect(verdict.decision).toBe("ask");
	expect(reads).not.toContain("/g10/.git/config");
});

test("Git Facts: an `includeIf` on a branch reads the aliases again when `HEAD` changes, and not before", async () => {
	let alias = "status";
	const files: Record<string, number> = {
		"/g2/.git/config": 1,
		"/g2/.git/HEAD": 1,
	};
	const texts: Record<string, string> = {
		"/g2/.git/HEAD": "ref: refs/heads/main\n",
	};
	const runs: (readonly string[])[] = [];
	const $ = configFake(
		"/g2",
		"file:.git/config\0includeif.onbranch:dev.path\n../inc\0",
		() => alias,
		files,
		texts,
		runs,
	);

	const before = await check("git p", { decision: "allow" }, $);
	const same = await check("git p", { decision: "allow" }, $);
	alias = "push --force";
	texts["/g2/.git/HEAD"] = "ref: refs/heads/dev\n";
	const after = await check("git p", { decision: "allow" }, $);

	expect([before, same, after].map((v) => v.decision)).toStrictEqual([
		"allow",
		"allow",
		"ask",
	]);
	// The first call reads twice, because the read names an include that the stamp before it did not cover.
	expect(runs.filter((r) => r.includes("--get-regexp"))).toHaveLength(3);
});

test("Git Facts: an `includeIf` on a branch reads the `HEAD` file of a worktree", async () => {
	let alias = "status";
	const files: Record<string, number> = {
		"/g3/.git/config": 1,
		"/r/.git/worktrees/w/HEAD": 1,
	};
	const texts: Record<string, string> = {
		"/g3/.git": "gitdir: /r/.git/worktrees/w\n",
		"/r/.git/worktrees/w/HEAD": "ref: refs/heads/main\n",
	};
	const runs: (readonly string[])[] = [];
	const $ = configFake(
		"/g3",
		"file:.git/config\0includeif.onbranch:dev.path\n../inc\0",
		() => alias,
		files,
		texts,
		runs,
	);

	const before = await check("git p", { decision: "allow" }, $);
	alias = "push --force";
	texts["/r/.git/worktrees/w/HEAD"] = "ref: refs/heads/dev\n";
	const after = await check("git p", { decision: "allow" }, $);

	expect([before.decision, after.decision]).toStrictEqual(["allow", "ask"]);
});

test("Git Facts: a config with no branch include reads no `HEAD` file", async () => {
	const reads: string[] = [];
	const runs: (readonly string[])[] = [];
	const $ = configFake(
		"/g4",
		"file:.git/config\0include.path\n../inc\0",
		() => "status",
		{ "/g4/.git/config": 1 },
		{},
		runs,
	);
	const read = $.fs.read;
	$.fs.read = async (path: string) => {
		reads.push(path);
		return read(path);
	};

	await check("git p", { decision: "allow" }, $);
	await check("git p", { decision: "allow" }, $);

	expect(reads.filter((path) => path.endsWith("/HEAD"))).toStrictEqual([]);
});

test("Git Facts: an included config file that changes during the read is read again at the next call", async () => {
	let alias = "status";
	const files: Record<string, number> = { "/g5/.git/config": 1, "/g5/inc": 1 };
	const runs: (readonly string[])[] = [];
	const $ = configFake(
		"/g5",
		"file:.git/config\0include.path\n../inc\0",
		() => alias,
		files,
		{},
		runs,
	);
	const run = $.process.run;
	$.process.run = async (argv: readonly string[]) => {
		const out = await run(argv);
		// A write by another process during the second read, which has the include in its stamp.
		if (
			argv.includes("--get-regexp") &&
			runs.filter((r) => r.includes("--get-regexp")).length === 2
		) {
			alias = "push --force";
			files["/g5/inc"] = 2;
		}
		return out;
	};

	const first = await check("git p", { decision: "allow" }, $);
	const second = await check("git p", { decision: "allow" }, $);

	expect(first.decision).toBe("allow");
	expect(second.decision).toBe("ask");
});

for (const [name, path] of [
	["`/etc/gitconfig`", "/etc/gitconfig"],
	["the XDG config file", "/u/.config/git/config"],
	["`config.worktree`", "/g6/.git/config.worktree"],
] as const) {
	test(`Git Facts: ${name} that is missing at the first read is read when it appears`, async () => {
		let alias = "status";
		const files: Record<string, number> = { "/g6/.git/config": 1 };
		const runs: (readonly string[])[] = [];
		const $ = configFake(
			"/g6",
			"file:.git/config\0",
			() => alias,
			files,
			{},
			runs,
		);

		const before = await check("git p", { decision: "allow" }, $);
		alias = "push --force";
		files[path] = 1;
		const after = await check("git p", { decision: "allow" }, $);

		expect([before.decision, after.decision]).toStrictEqual(["allow", "ask"]);
	});
}
// Task 20.2: the config of the repo is stamped in the git folder that `git` names, not in `cwd/.git`.
for (const [name, cwd, gitDir, texts, config] of [
	["a subfolder", "/g8/sub", "/g8/.git", {}, "/g8/.git/config"],
	[
		"a linked worktree",
		"/g9",
		"/r/.git/worktrees/w",
		{ "/r/.git/worktrees/w/commondir": "../..\n" },
		"/r/.git/config",
	],
] as const) {
	test(`Git Facts: the alias is read again when the config file of the repo changes, for ${name}`, async () => {
		let alias = "status";
		const files: Record<string, number> = { [config]: 1 };
		const runs: (readonly string[])[] = [];
		const base = configFake(cwd, "", () => alias, files, texts, runs);
		const $ = {
			...base,
			process: {
				run: async (argv: readonly string[]) =>
					argv.includes("rev-parse")
						? { exitCode: 0, stdout: `${gitDir}\n`, stderr: "" }
						: base.process.run(argv),
			},
		};

		const before = await check("git p", { decision: "allow" }, $);
		alias = "push --force";
		files[config] = 2;
		const after = await check("git p", { decision: "allow" }, $);

		expect([before.decision, after.decision]).toStrictEqual(["allow", "ask"]);
	});
}
