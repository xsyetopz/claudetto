// The `tool.check` handler of the `guard` slice with a fake `$` (spec `permission-gate`, task 5.1 of change `0-3-0`).
// A `$.tool.check` query of the lab gives no `decider`, so this test calls the handler and reads its verdict.
// The fake `process.run` stands for `git`, so no command runs.

import { expect, test } from "bun:test";
import { keepOptions } from "../../../plugins/claudetto/kernel/options.ts";
import {
	onCheck,
	onCheckFail,
} from "../../../plugins/claudetto/modules/gate/adapters/mod.ts";
import {
	GIT_CONFIG_FILE_MAX_BYTES,
	JEV_YES_MIN,
} from "../../../plugins/claudetto/modules/gate/limits.ts";
import { ATTEMPT_TIMEOUT_MS } from "../../../plugins/claudetto/modules/jev/limits.ts";

/** The output of `git --list-cmds=main,others` in these tests. */
const GIT_COMMANDS = "add\nclean\nrm\nstatus\n";

interface Verdict {
	decision: string;
	decider?: string;
	reason?: string;
}

/** A fake `$` of a session at `/p`, with a `git` whose `status` prints `status`, and the argv of each run in `runs`. */
const fake = (status: string, runs: (readonly string[])[] = []) => ({
	session: { cwd: async () => "/p" },
	env: { get: async (name: string) => ({ HOME: "/u", TMPDIR: "/t/" })[name] },
	fs: {
		stat: async (_path: string): Promise<{ mtimeMs: number }> =>
			Promise.reject(new Error("ENOENT")),
		read: async (_path: string): Promise<string> =>
			Promise.reject(new Error("ENOENT")),
	},
	process: {
		run: async (argv: readonly string[]) => {
			// The `git` facts of the gate: no alias, and the commands that these tests use.
			if (argv.includes("--get-regexp")) {
				return { exitCode: 1, stdout: "", stderr: "" };
			}
			if (argv.includes("--list-cmds=main,others")) {
				return { exitCode: 0, stdout: GIT_COMMANDS, stderr: "" };
			}
			runs.push(argv);
			return { exitCode: 0, stdout: status, stderr: "" };
		},
	},
});

/** Whether `f` is a function, so a test can call a handler with a fake `$` that has only the parts that the handler reads. */
const isHandler = <A extends unknown[], R>(f: unknown): f is (...a: A) => R =>
	typeof f === "function";

const check = (command: string, engine: Verdict, $: unknown = fake("")) => {
	if (!isHandler<unknown[], Promise<Verdict>>(onCheck)) {
		throw new Error("`onCheck` is not a function");
	}
	return onCheck($, { tool: "Bash", input: { command } }, async () => engine);
};

test("Local Git Loss: `git clean -fd` over an untracked file asks a person, so the dialog shows no always-allow row", async () => {
	const runs: (readonly string[])[] = [];
	const v = await check(
		"git clean -fd",
		{ decision: "allow" },
		fake("?? notes.md\n", runs),
	);
	expect(v).toMatchObject({ decision: "ask", decider: "person" });
	expect(runs).toStrictEqual([
		["git", "-C", "/p", "status", "--porcelain", "--untracked-files=all", "--"],
	]);
});

test("Committed File: a clean `status` and a found file give `allow` over the ask of the mode", async () => {
	expect(await check("rm src/old.ts", { decision: "ask" })).toStrictEqual({
		decision: "allow",
	});
});

test("a `deny` of the engine stays", async () => {
	const deny = { decision: "deny", reason: "rule" };
	expect(await check("ls", deny)).toBe(deny);
});

test("the temp folder of `TMPDIR` loses its last slash", async () => {
	expect((await check("rm -rf $TMPDIR/x", { decision: "ask" })).decision).toBe(
		"allow",
	);
});

test("Gate Fails Closed: the error handler asks a person, and the reason names the `guard` gate", () => {
	if (!isHandler<[], Verdict>(onCheckFail)) {
		throw new Error("`onCheckFail` is not a function");
	}
	const v = onCheckFail();
	expect(v).toMatchObject({ decision: "ask", decider: "person" });
	expect(v.reason).toContain("`guard`");
});

// "Jev before a Person" (task 5.1a, 10.15): a fake `$.http.fetch` answers for the TypeSafe API, and `git` prints an untracked `notes.md`.
interface Reply {
	status: number;
	ok: boolean;
	headers: object;
	text: string;
}
interface Fetch {
	url: string;
	init?: { headers?: Record<string, string>; body?: string } | undefined;
}

/** A reply of the API with the `noul` answer `q`, or the `status` with no answer. */
const answerOf =
	(noul: number, status = 200) =>
	async (): Promise<Reply> => ({
		status,
		ok: status === 200,
		headers: {},
		text: JSON.stringify({ answers: { q: { type: "noul", noul } } }),
	});

/** A fake `$` with the key `key`, whose `git` prints an untracked `notes.md`, whose `http.fetch` gives `jev`, and whose `clock.sleep` waits for an abort. */
const jevFake = (
	key: string | undefined,
	jev: () => Promise<Reply>,
	runs: (readonly string[])[] = [],
	fetches: Fetch[] = [],
) => ({
	...fake("?? notes.md\n", runs),
	env: {
		get: async (name: string) =>
			({ HOME: "/u", TMPDIR: "/t/", TYPESAFE_API_KEY: key })[name],
	},
	http: {
		fetch: async (url: string, init?: Fetch["init"]) => {
			fetches.push({ url, init });
			return jev();
		},
	},
	clock: {
		sleep: (_ms: number, options?: { signal?: AbortSignal }) =>
			new Promise<void>((_resolve, reject) =>
				options?.signal?.addEventListener("abort", () =>
					reject(new Error("aborted")),
				),
			),
	},
});

const sure = answerOf(0.93);

test("Jev Is Sure: a confident yes allows the `git` loss, and the reason carries the `P(yes)` value", async () => {
	keepOptions({ decide: "jev" });
	const runs: (readonly string[])[] = [];
	const fetches: Fetch[] = [];
	const v = await check(
		"git clean -fd",
		{ decision: "ask" },
		jevFake("k", sure, runs, fetches),
	);
	const { reason, ...rest } = v;
	expect(rest).toStrictEqual({ decision: "allow" });
	expect(reason).toContain("0.93");
	expect(runs.every((r) => r[0] === "git")).toBe(true);
	expect(fetches).toHaveLength(1);
	expect(fetches[0]?.url).toBe("https://api.typesafe.ai/v1/systemone");
	expect(fetches[0]?.init?.headers?.["authorization"]).toBe("Bearer k");
	const body = JSON.parse(fetches[0]?.init?.body ?? "{}");
	expect(body.state).toContain("git clean -fd");
	expect(body.questions.q.type).toBe("noul");
	expect(fetches[0]?.init?.body).not.toContain('"k"');
});

// The floor is `JEV_YES_MIN` of 0.8, above the 0.7 of `primitives-noul.md`, because a false yes loses files (the user, 2026-10-23: "follow typesafe's guidelines/best practices").
test("Jev Is Sure: a yes at `JEV_YES_MIN` allows the call", async () => {
	keepOptions({ decide: "jev" });
	const v = await check(
		"git clean -fd",
		{ decision: "ask" },
		jevFake("k", answerOf(JEV_YES_MIN)),
	);
	expect(v).toMatchObject({ decision: "allow" });
});

for (const [name, key, decide, jev] of [
	["a yes under the bound", "k", "jev", answerOf(0.79)],
	["a no", "k", "jev", answerOf(0.05)],
	["a failed call", "k", "jev", answerOf(0.9, 500)],
	[
		"a call that throws",
		"k",
		"jev",
		() => Promise.reject(new Error("timeout")),
	],
	["no key", undefined, "jev", sure],
	["the option `off`", "k", "off", sure],
] as const) {
	test(`Jev Is Not Sure: ${name} asks a person, so the dialog shows no always-allow row`, async () => {
		keepOptions({ decide });
		const v = await check(
			"git clean -fd",
			{ decision: "allow" },
			jevFake(key, jev),
		);
		expect(v).toMatchObject({ decision: "ask", decider: "person" });
		expect(v).not.toHaveProperty("jev");
	});
}

test("Timeout: a call that never answers ends at `ATTEMPT_TIMEOUT_MS` with no retry, and a person decides", async () => {
	keepOptions({ decide: "jev" });
	const slept: number[] = [];
	const fetches: Fetch[] = [];
	const $ = {
		...jevFake("k", () => new Promise<Reply>(() => undefined), [], fetches),
		clock: {
			sleep: async (ms: number) => {
				slept.push(ms);
			},
		},
	};
	const v = await check("git clean -fd", { decision: "allow" }, $);
	expect(v).toMatchObject({ decision: "ask", decider: "person" });
	expect(slept).toStrictEqual([ATTEMPT_TIMEOUT_MS]);
	expect(fetches).toHaveLength(1);
});

test("an `ask` that is not a loss, such as a forced push, goes to a person and not to Jev", async () => {
	keepOptions({ decide: "jev" });
	const fetches: Fetch[] = [];
	const v = await check(
		"git push --force",
		{ decision: "allow" },
		jevFake("k", sure, [], fetches),
	);
	expect(v).toMatchObject({ decision: "ask", decider: "person" });
	expect(fetches).toEqual([]);
});

// Task 5.2: each `ask` goes to the log of the session, and a log that cannot be written changes no verdict.
/** `$` with an in-memory file system in `files`, the session `s1`, and the time 0. */
const withLog = <T extends { session: object; clock?: object; fs: object }>(
	$: T,
	files: Map<string, string>,
	write = async (path: string, text: string) => {
		files.set(path, text);
	},
) => ({
	...$,
	session: { ...$.session, id: async () => "s1" },
	clock: { ...$.clock, now: async () => 0 },
	fs: {
		...$.fs,
		exists: async (path: string) => files.has(path),
		read: async (path: string) => files.get(path) ?? "",
		write,
	},
});

const LOG = "/t/claudetto/gate/s1.jsonl";
const lines = (files: Map<string, string>) =>
	(files.get(LOG) ?? "")
		.split("\n")
		.filter(Boolean)
		.map((l) => JSON.parse(l));

test("Gate Log: two checks at the same time keep both lines, each with its reason and `person`", async () => {
	keepOptions({ decide: "off" });
	const files = new Map<string, string>();
	const $ = withLog(fake("?? notes.md\n"), files);
	await Promise.all([
		check("git clean -fd", { decision: "allow" }, $),
		check("git clean -fd .", { decision: "allow" }, $),
	]);
	const got = lines(files);
	expect(got.map((l) => l.target).sort()).toStrictEqual([
		"git clean -fd",
		"git clean -fd .",
	]);
	expect(
		got.every(
			(l) =>
				l.decider === "person" &&
				l.tool === "Bash" &&
				l.reason.includes("git clean"),
		),
	).toBe(true);
	expect(got[0].at).toBe("1970-01-01T00:00:00.000Z");
});

test("Gate Log: an `ask` that Jev allows has the decider `jev`", async () => {
	keepOptions({ decide: "jev" });
	const files = new Map<string, string>();
	await check(
		"git clean -fd",
		{ decision: "ask" },
		withLog(jevFake("k", sure), files),
	);
	expect(lines(files).map((l) => l.decider)).toStrictEqual(["jev"]);
});

test("Gate Log: an `allow` writes no line", async () => {
	const files = new Map<string, string>();
	await check("ls", { decision: "allow" }, withLog(fake(""), files));
	expect(files.size).toBe(0);
});

test("Gate Log: a write that fails keeps the `ask` for a person", async () => {
	keepOptions({ decide: "off" });
	const $ = withLog(fake("?? notes.md\n"), new Map(), async () => {
		throw new Error("disk full");
	});
	expect(await check("git clean -fd", { decision: "allow" }, $)).toMatchObject({
		decision: "ask",
		decider: "person",
	});
});

test("Gate Log: an `ask` at red writes one line with its reason and `person`", async () => {
	const files = new Map<string, string>();
	const logged = withLog(fake(""), files);
	const $ = {
		...logged,
		session: {
			...logged.session,
			usage: async () => ({
				rateLimits: [{ kind: "five_hour", percentUsed: 95 }],
			}),
		},
	};
	const v = await check("just sandbox", { decision: "allow" }, $);
	expect(v).toMatchObject({ decision: "ask", decider: "person" });
	expect(lines(files)).toMatchObject([
		{ tool: "Bash", reason: v.reason, decider: "person" },
	]);
});

test("User Edit in the Tree: `git add -A` asks when a changed file has no ledger line, and runs once the ledger holds its hash", async () => {
	keepOptions({ decide: "off" });
	const HASH_X = "af63f54c86021707";
	const entry = `${JSON.stringify({ path: "/p/a.ts", hash: HASH_X, session: "s2", agent: "main" })}\n`;
	const stdoutOf = (argv: readonly string[]) => {
		if (argv.includes("--list-cmds=main,others")) {
			return GIT_COMMANDS;
		}
		return argv.includes("rev-parse") ? "/p\n" : " M a.ts\0";
	};
	const git = async (argv: readonly string[]) => ({
		exitCode: argv.includes("--get-regexp") ? 1 : 0,
		stdout: stdoutOf(argv),
		stderr: "",
	});
	const tree = (ledger: string | null) => ({
		...fake(""),
		process: { run: git },
		session: { cwd: async () => "/p", root: async () => "/p" },
		fs: {
			stat: async () => Promise.reject(new Error("ENOENT")),
			exists: async (path: string) =>
				path.includes("/ledger/") && ledger !== null,
			read: async (path: string) =>
				path.includes("/ledger/") ? (ledger ?? "") : "x",
		},
	});
	const unknown = await check("git add -A", { decision: "allow" }, tree(null));
	const known = await check("git add -A", { decision: "allow" }, tree(entry));
	expect([unknown.decision, known.decision]).toStrictEqual(["ask", "allow"]);
});

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

/** A fake `$` of a project at `dir` whose `find` lists `names`. */
const listing = (dir: string, names: string) => ({
	...fake(""),
	clock: { now: async () => 0 },
	session: { cwd: async () => dir, root: async () => dir },
	process: {
		run: async (argv: readonly string[]) =>
			argv[0] === "find"
				? { exitCode: 0, stdout: names, stderr: "" }
				: { exitCode: 1, stdout: "", stderr: "" },
	},
});

test("Env File: a `cat` of a name from a substitution asks only when the project has an env file", async () => {
	const command = "cat $(printf x)";
	const sample = `${["/e3/", "env", "example"].join(".")}\n`;

	const none = await check(command, { decision: "allow" }, listing("/e1", ""));
	const some = await check(
		command,
		{ decision: "allow" },
		listing("/e2", "/e2/sub/.env\n"),
	);
	const example = await check(
		command,
		{ decision: "allow" },
		listing("/e3", sample),
	);

	expect([none, some, example].map((v) => v.decision)).toStrictEqual([
		"allow",
		"ask",
		"allow",
	]);
});

test("Env File: a `find` that fails counts as an env file, so the `cat` asks", async () => {
	const $ = {
		...listing("/e4", ""),
		process: { run: async () => ({ exitCode: 2, stdout: "", stderr: "" }) },
	};

	const v = await check("cat $(printf x)", { decision: "allow" }, $);

	expect(v.decision).toBe("ask");
});

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
