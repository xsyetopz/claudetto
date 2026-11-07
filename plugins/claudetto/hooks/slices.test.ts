import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { scanned } from "./secrets.mock.ts";

/** A fake repo at /repo: `dirty` maps an absolute path to its two-letter status, `hash` to its content hash. */
const fakeRepo = (dirty: Record<string, string> = {}) => ({
	dirty,
	hash: Object.fromEntries<string>([]),
});
type Repo = ReturnType<typeof fakeRepo>;

const answered = (stdout: string) => ({
	value: {
		exitCode: 0,
		stdout,
		stderr: "",
		isStdoutTruncated: false,
		isStderrTruncated: false,
	},
});

const gitAnswer = (repo: Repo, argv: readonly string[]) => {
	const files = argv.slice(argv.indexOf("--") + 1);
	switch (argv[1]) {
		case "status":
			return argv.includes("-z")
				? answered(
						Object.entries(repo.dirty)
							.filter(([path]) => path.startsWith("/repo/"))
							.map(([path, xy]) => `${xy} ${path.slice("/repo/".length)}\0`)
							.join(""),
					)
				: answered(
						Object.entries(repo.dirty)
							.filter(([path]) => files.includes(path))
							.map(([path, xy]) => `${xy} ${path}\n`)
							.join(""),
					);
		case "hash-object":
			return answered(files.map((f) => `${repo.hash[f] ?? "h0"}\n`).join(""));
		default:
			return answered("");
	}
};

const lab = (
	on: On,
	repo: Repo,
	commit: "allow" | "ask" | "deny" = "allow",
	runs: string[][] = [],
	answer = '{"faults":[]}',
	stopped: { block?: string } = {},
) => {
	on("process.run", (_$, e, next) => {
		if (e.argv[0] === "git") {
			runs.push([...e.argv]);
			// `git -C dir status` is `status` with the directory moved in front.
			return gitAnswer(
				repo,
				e.argv[1] === "-C" ? ["git", ...e.argv.slice(3)] : e.argv,
			);
		}
		return scanned(e) ?? next(e);
	});
	on("classic.Stop", () => stopped);
	on("session.start", () => ({ cwd: "/repo" }));
	on("tool.register", (_$, e) => ({
		value: { tool: `mcp__claudetto__${e.name}` },
	}));
	on("session.messages", () => ({ value: [] }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("prompt.submit", (_$, e) => e);
	on("clock.now", () => ({ value: 0 }));
	on("fs.exists", () => ({ value: true }));
	on("model.complete", () => ({
		value: {
			isAnswered: true,
			text: answer,
			usage: {
				input_tokens: 1,
				output_tokens: 1,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: 0,
			},
		},
	}));
	on("tool.check", (_$, e) => ({
		decision: e.tool === "Bash" ? commit : "allow",
	}));
	on("tool.call", () => ({ result: {} }));
};

const edit = ($: Engine, file_path = "/repo/src/a.ts") =>
	$.tool.call({
		tool: "Edit",
		tool_use_id: "t1",
		file_path,
		old_string: "a",
		new_string: "b",
	});

const stop = ($: Engine, active = false) =>
	$.classic.Stop({
		stop_hook_active: active,
		last_assistant_message: "Done.",
		background_tasks: [],
	});

const submit = ($: Engine) =>
	$.prompt.submit({
		text: "Fix it.",
		wait: false,
		origin: { kind: "composer" },
	});

const bash = ($: Engine, command: string) =>
	$.tool.call({ tool: "Bash", tool_use_id: "t2", command });

const A = "/repo/src/a.ts";

test("a stop with an edited file git reports changed is blocked, and the block names it", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(on, fakeRepo({ [A]: " M" }), "allow", runs);
	await edit($);
	const out = await stop($);
	expect(out.block).toContain("`src/a.ts`");
	expect(out.block).toContain("one revertable change per commit");
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
	expect((await stop($)).block).toContain("`nb/a.ipynb`");
});

test("a committed edit passes", async ($: Engine, on: On) => {
	lab(on, fakeRepo());
	await edit($);
	expect((await stop($)).block).toBeUndefined();
});

test("a stop with no write runs no git and passes", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(on, fakeRepo({ [A]: " M" }), "allow", runs);
	expect((await stop($)).block).toBeUndefined();
	expect(runs).toEqual([]);
});

test("when the permission chain denies a commit, the stop passes", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ [A]: " M" }), "deny");
	await edit($);
	expect((await stop($)).block).toBeUndefined();
});

test("a commit that needs an answer blocks the stop in a session that has someone to answer", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ [A]: " M" }), "ask");
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: true });
	await edit($);
	expect((await stop($)).block).toContain("`src/a.ts`");
});

test("a commit that needs an answer lets the stop pass in a headless session", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ [A]: " M" }), "ask");
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: false });
	await edit($);
	expect((await stop($)).block).toBeUndefined();
});

test("a stop the hook already continued passes", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ [A]: " M" }));
	await edit($);
	expect((await stop($, true)).block).toBeUndefined();
});

test("a no-commit constraint from the user, through the ledger, lets the stop pass", async ($: Engine, on: On) => {
	lab(
		on,
		fakeRepo({ [A]: " M" }),
		"allow",
		[],
		'{"kind":"task","constraints":[{"text":"Do not commit.","rule":"no-commit"}]}',
	);
	await $.prompt.submit({
		text: "Fix it, but do not commit.",
		wait: false,
		origin: { kind: "composer" },
	});
	await edit($);
	expect((await stop($)).block).toBeUndefined();
});

test("a stop another check blocked keeps that block", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ [A]: " M" }), "allow", [], undefined, {
		block: "Other check.",
	});
	await edit($);
	expect((await stop($)).block).toBe("Other check.");
});

test("a file changed through Bash, such as sed -i, is blocked and named", async ($: Engine, on: On) => {
	const repo = fakeRepo();
	lab(on, repo);
	await submit($);
	repo.dirty["/repo/src/b.ts"] = " M";
	repo.hash["/repo/src/b.ts"] = "h1";
	await bash($, "sed -i s/a/b/ src/b.ts");
	expect((await stop($)).block).toContain("`src/b.ts`");
});

test("the plugin's saved test output is not listed among the files to commit", async ($: Engine, on: On) => {
	const repo = fakeRepo({ [A]: " M" });
	lab(on, repo);
	await submit($);
	repo.dirty["/repo/.claude/claudetto/output/output-t1.txt"] = "??";
	await bash($, "bun test");
	await edit($);
	const out = await stop($);
	expect(out.block).toContain("`src/a.ts`");
	expect(out.block).not.toContain("claudetto/output");
});

test("a file in another repo that an Edit wrote is blocked and named", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ "/other/z.ts": " M" }));
	await edit($, "/other/z.ts");
	expect((await stop($)).block).toContain("z.ts");
});

test("a file another hand changed after the agent wrote it is left alone", async ($: Engine, on: On) => {
	const repo = fakeRepo({ [A]: " M" });
	lab(on, repo);
	await edit($);
	repo.hash[A] = "user";
	expect((await stop($)).block).toBeUndefined();
});

test("a file dirty before the session and not moved is left alone", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ [A]: " M" }));
	await submit($);
	await bash($, "ls");
	expect((await stop($)).block).toBeUndefined();
});

test("a file dirty before the session that Bash then changes is blocked", async ($: Engine, on: On) => {
	const repo = fakeRepo({ [A]: " M" });
	lab(on, repo);
	await submit($);
	repo.hash[A] = "h1";
	await bash($, "sed -i s/a/b/ src/a.ts");
	expect((await stop($)).block).toContain("`src/a.ts`");
});

test("a user edit after the agent shows in the next prompt's context once, marked as the agent's file", async ($: Engine, on: On) => {
	const repo = fakeRepo({ [A]: " M" });
	lab(on, repo);
	await submit($);
	await edit($);
	repo.hash[A] = "user";
	const first = (await submit($)).context?.join("\n") ?? "";
	expect(first).toContain(
		"changed by someone else: `src/a.ts` (you last wrote it)",
	);
	expect((await submit($)).context ?? []).toEqual([]);
});

test("a changed file the agent never wrote shows in the context", async ($: Engine, on: On) => {
	const repo = fakeRepo();
	lab(on, repo);
	await submit($);
	repo.dirty["/repo/README.md"] = " M";
	repo.hash["/repo/README.md"] = "u";
	expect(((await submit($)).context ?? []).join("\n")).toContain(
		"changed by someone else: `README.md`.",
	);
});

test("no change, and a file dirty since before the session, add no context", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ [A]: " M" }));
	await submit($);
	expect((await submit($)).context ?? []).toEqual([]);
});

test("the agent's own Bash edit is not listed as someone else's", async ($: Engine, on: On) => {
	const repo = fakeRepo();
	lab(on, repo);
	await submit($);
	repo.dirty[A] = " M";
	repo.hash[A] = "h1";
	await bash($, "sed -i s/a/b/ src/a.ts");
	expect((await submit($)).context ?? []).toEqual([]);
});
