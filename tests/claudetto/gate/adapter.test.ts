// The `tool.check` handler of the `guard` slice with a fake `$`: the basic verdicts, the gate log, the ledger of user edits, and the env-file scan (spec `permission-gate`, task 5.1 of change `0-3-0`).
// A `$.tool.check` query of the lab gives no `decider`, so this test calls the handler and reads its verdict.
// The fake `process.run` stands for `git`, so no command runs.

import { beforeEach, expect, test } from "bun:test";
import { keepOptions } from "../../../plugins/claudetto/kernel/options.ts";
import {
	onCheck,
	onCheckFail,
} from "../../../plugins/claudetto/modules/gate/adapters/mod.ts";
import {
	check,
	fake,
	GIT_COMMANDS,
	isHandler,
	jevFake,
	sure,
	type Verdict,
} from "./engine-fake.ts";

// A test that needs the classifier stage turns it on, so no other test depends on a fault of the stage.
beforeEach(() => keepOptions({ classifier: "off" }));

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

test("Wrong Tool: `onCheck` denies `cat a.txt` with the tool to use, and allows `git log | grep x`", async () => {
	const wrong = await check("cat a.txt", { decision: "allow" });
	const right = await check("git log | grep x", { decision: "allow" });

	expect(wrong.decision).toBe("deny");
	expect(wrong.reason).toContain("`Read`");
	expect(right.decision).toBe("allow");
});

test("Wrong Tool: a `Monitor` of `tail -f a.log` is not denied", async () => {
	if (!isHandler<unknown[], Promise<Verdict>>(onCheck)) {
		throw new Error("`onCheck` is not a function");
	}

	const v = await onCheck(
		fake(""),
		{ tool: "Monitor", input: { command: "tail -f a.log" } },
		async () => ({ decision: "allow" }),
	);

	expect(v.decision).toBe("allow");
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
	keepOptions({ decide: "off", classifier: "off" });
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
		"git clean -fdx",
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
	keepOptions({ decide: "off", classifier: "off" });
	const $ = withLog(fake("?? notes.md\n"), new Map(), async () => {
		throw new Error("disk full");
	});
	expect(
		await check("git clean -fd src", { decision: "allow" }, $),
	).toMatchObject({
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
	keepOptions({ decide: "off", classifier: "off" });
	const HASH_X = "af63f54c86021707";
	const entry = [
		{
			path: "/p/a.ts",
			hash: HASH_X,
			session: "s2",
			agent: "main",
			via: "edit",
		},
	];
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
	const tree = (ledger: unknown) => ({
		...fake(""),
		process: { run: git },
		session: { cwd: async () => "/p", root: async () => "/p" },
		store: { get: async () => ledger ?? undefined },
		fs: {
			stat: async () => Promise.reject(new Error("ENOENT")),
			exists: async () => false,
			read: async () => "x",
		},
	});
	const unknown = await check("git add -A", { decision: "allow" }, tree(null));
	const known = await check("git add -A", { decision: "allow" }, tree(entry));
	expect([unknown.decision, known.decision]).toStrictEqual(["ask", "allow"]);
});

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
