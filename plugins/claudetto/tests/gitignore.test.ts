// Lab tests of the `.gitignore` step of the `session.sweep` hook (the user, 2026-10-26): at `session.start`, a project with `.git` gets the entry `/.claude/claudetto/` in `.gitignore` when no entry covers the folder.
// The file is self-contained, because a lab test cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { ran } from "./stubs/process.ts";
import { byCode } from "./stubs/sort.ts";

type Fault = "" | "mkdir" | "mv" | "throws" | "target-appears";

/** The answer of a stubbed `/bin/mkdir`, `/bin/mv`, or other process on `files`: a `/bin/mv` run moves the keys of `files` under its source, and `fault` makes one step fail. */
const runProcess = (
	argv: readonly string[],
	files: Record<string, string>,
	fault: Fault,
) => {
	const [bin, from, to] = argv;
	if (fault === "throws") {
		throw new Error("spawn failed");
	}
	if (fault === "target-appears" && bin === "/bin/mkdir") {
		files["/p/.claude/claudetto/new.md"] = "new";
	}
	if (fault === bin?.replace("/bin/", "")) {
		return ran("", 1);
	}
	if (bin === "/bin/mv" && from !== undefined && to !== undefined) {
		for (const path of Object.keys(files)) {
			if (path === from || path.startsWith(`${from}/`)) {
				files[to + path.slice(from.length)] = files[path] ?? "";
				delete files[path];
			}
		}
	}
	return ran("", bin === "/bin/mkdir" || bin === "/bin/mv" ? 0 : 128);
};

/** Stubs a project `/p` with the files `files`, and gives the texts that `fs.write` got for each path and the argv of each process run. A `/bin/mv` run moves the keys of `files` under its source. */
const stub = (on: On, files: Record<string, string>, fault: Fault = "") => {
	const writes: Record<string, string> = {};
	const runs: (readonly string[])[] = [];
	const order: string[] = [];
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("env.get", () => ({ value: undefined }));
	on("session.id", () => ({ value: "s1" }));
	on("session.root", () => ({ value: "/p" }));
	on("settings.read", () => ({ value: {} }));
	on("fs.stat", (_$, e) => {
		if (e.path in files) {
			return { value: { kind: "file", size: 0, mtimeMs: 0, isLink: false } };
		}
		if (Object.keys(files).some((path) => path.startsWith(`${e.path}/`))) {
			return { value: { kind: "dir", size: 0, mtimeMs: 0, isLink: false } };
		}
		return { deny: "ENOENT" };
	});
	on("fs.exists", (_$, e) => ({
		value: Object.keys(files).some(
			(path) => path === e.path || path.startsWith(`${e.path}/`),
		),
	}));
	on("fs.read", (_$, e) =>
		e.path in files ? { value: files[e.path] ?? "" } : { deny: "ENOENT" },
	);
	on("fs.write", (_$, e) => {
		writes[e.path] = e.text;
		order.push(`write ${e.path}`);
		return { value: undefined };
	});
	on("process.run", (_$, e) => {
		runs.push(e.argv);
		order.push(e.argv.join(" "));
		return runProcess(e.argv, files, fault);
	});
	on("ui.log", () => ({ value: undefined }));
	return { writes, files, runs, order };
};

const start = ($: Engine) =>
	$.session.start({ cwd: "/p", surface: "terminal", isInteractive: true });

test("Gitignore Created: a project with `.git` and no `.gitignore` gets one with `/.claude/claudetto/`", async ($: Engine, on: On) => {
	const { writes } = stub(on, { "/p/.git": "" });
	await start($);
	expect(writes["/p/.gitignore"]?.split("\n")).toContain("/.claude/claudetto/");
});

test("Gitignore Appended: the lines of the user stay, and `/.claude/claudetto/` comes after them", async ($: Engine, on: On) => {
	const { writes } = stub(on, {
		"/p/.git": "",
		"/p/.gitignore": "node_modules/\n",
	});
	await start($);
	const text = writes["/p/.gitignore"] ?? "";
	expect(text.startsWith("node_modules/\n")).toBe(true);
	expect(text.split("\n")).toContain("/.claude/claudetto/");
});

for (const entry of [
	".claude/claudetto",
	".claude/claudetto/",
	"/.claude/claudetto",
	"/.claude/claudetto/",
	"/.claude/claudetto/**",
	"**/.claude/claudetto/",
	".claude",
	".claude/",
	"/.claude/",
	"/.claude/**",
	"**/.claude/",
]) {
	test(`Gitignore Kept: the entry \`${entry}\` already covers the folder, so no write`, async ($: Engine, on: On) => {
		const { writes } = stub(on, {
			"/p/.git": "",
			"/p/.gitignore": `x\n${entry}\n`,
		});
		await start($);
		expect(writes["/p/.gitignore"]).toBeUndefined();
	});
}

for (const old of [
	".claude/*\n!.claude/claudetto/\n",
	"!.claude/claudetto/\n",
	"!.claude/\n",
]) {
	test(`Un-ignored On Purpose: with ${JSON.stringify(old)}, \`.gitignore\` is not written`, async ($: Engine, on: On) => {
		const { writes } = stub(on, { "/p/.git": "", "/p/.gitignore": old });
		await start($);
		expect(writes["/p/.gitignore"]).toBeUndefined();
	});
}

test("Parent Folder Ignored: with the line `.claude/`, `.gitignore` is not written", async ($: Engine, on: On) => {
	const { writes } = stub(on, { "/p/.git": "", "/p/.gitignore": ".claude/\n" });
	await start($);
	expect(writes["/p/.gitignore"]).toBeUndefined();
});

test("Old Entry Only: `/.claude/claudetto/` is appended, and the line `/.claudetto/` stays", async ($: Engine, on: On) => {
	const { writes } = stub(on, {
		"/p/.git": "",
		"/p/.gitignore": "/.claudetto/\n",
	});
	await start($);
	const lines = writes["/p/.gitignore"]?.split("\n") ?? [];
	expect(lines).toContain("/.claudetto/");
	expect(lines).toContain("/.claude/claudetto/");
});

test("Gitignore No Git: a folder with no `.git` gets no `.gitignore`", async ($: Engine, on: On) => {
	const { writes } = stub(on, {});
	await start($);
	expect(writes["/p/.gitignore"]).toBeUndefined();
});

test("Old Folder Only: `.claudetto/` moves to `.claude/claudetto/` with `/bin/mkdir` and `/bin/mv`", async ($: Engine, on: On) => {
	const { files, runs } = stub(on, { "/p/.claudetto/handoffs/h.md": "old" });
	await start($);
	expect(files["/p/.claude/claudetto/handoffs/h.md"]).toBe("old");
	expect(files["/p/.claudetto/handoffs/h.md"]).toBeUndefined();
	expect(runs).toContainEqual(["/bin/mkdir", "-p", "/p/.claude"]);
	expect(runs).toContainEqual([
		"/bin/mv",
		"/p/.claudetto",
		"/p/.claude/claudetto",
	]);
});

test("Both Folders: nothing moves", async ($: Engine, on: On) => {
	const { files, runs } = stub(on, {
		"/p/.claudetto/handoffs/h.md": "old",
		"/p/.claude/claudetto/handoffs/g.md": "new",
	});
	await start($);
	expect(Object.keys(files).sort(byCode)).toEqual([
		"/p/.claude/claudetto/handoffs/g.md",
		"/p/.claudetto/handoffs/h.md",
	]);
	expect(runs.some((r) => r[0] === "/bin/mv")).toBe(false);
});

test("New Folder Only: nothing moves", async ($: Engine, on: On) => {
	const { runs } = stub(on, { "/p/.claude/claudetto/goal.json": "null" });
	await start($);
	expect(runs.some((r) => r[0] === "/bin/mv")).toBe(false);
});

test("Old Path Is A File: nothing moves", async ($: Engine, on: On) => {
	const { files, runs } = stub(on, { "/p/.claudetto": "file" });
	await start($);
	expect(files["/p/.claudetto"]).toBe("file");
	expect(runs.some((r) => r[0] === "/bin/mkdir" || r[0] === "/bin/mv")).toBe(
		false,
	);
});

for (const fault of ["mkdir", "mv", "throws"] as const) {
	test(`Move Fails: with a failed ${fault}, \`.claudetto\` stays and \`session.start\` passes`, async ($: Engine, on: On) => {
		const { files, writes } = stub(
			on,
			{ "/p/.git": "", "/p/.claudetto/h.md": "old" },
			fault,
		);
		await start($);
		expect(files["/p/.claudetto/h.md"]).toBe("old");
		expect(writes["/p/.gitignore"]?.split("\n")).toContain(
			"/.claude/claudetto/",
		);
	});
}

test("Target Appears: a target that exists before `/bin/mv` is not nested into", async ($: Engine, on: On) => {
	const { files, runs } = stub(
		on,
		{ "/p/.claudetto/h.md": "old" },
		"target-appears",
	);
	await start($);
	expect(runs.some((r) => r[0] === "/bin/mv")).toBe(false);
	expect(files["/p/.claudetto/h.md"]).toBe("old");
});

test("Move Before Ignore: `/bin/mv` runs before `.gitignore` is written", async ($: Engine, on: On) => {
	const { order } = stub(on, {
		"/p/.git": "",
		"/p/.claudetto/h.md": "old",
	});
	await start($);
	const mv = order.findIndex((o) => o.startsWith("/bin/mv "));
	const write = order.indexOf("write /p/.gitignore");
	expect(mv).toBeGreaterThanOrEqual(0);
	expect(write).toBeGreaterThan(mv);
});
