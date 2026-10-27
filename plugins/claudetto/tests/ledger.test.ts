// Lab tests of the edit ledger (spec `session-hygiene`, "Edit Ledger" and "Who Changed a File").
// The ledger is a file in the temp folder, and the stub keeps all files in one map, so two sessions share it.
// The file is self-contained, because a lab test cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { ran } from "./stubs/process.ts";

const NOW = 1_000_000;
const LEDGER_NAME = /\/proj-|\/proj\.|-[0-9a-f]{16}\.jsonl$/;

/** The world of a test: the content of each file (`null` for a missing file), and the modification time of each. */
interface World {
	files: Record<string, string | null>;
	mtimes: Record<string, number>;
	/** The id of the session that the hooks see now. */
	session: string;
	/** What `git status --porcelain -z` prints. */
	status: string;
}

/** Stubs the files, the session, the clock, and `git`. The two classic hooks stand for the settings hooks beneath. */
const stub = (on: On, init: Partial<World> = {}): World => {
	const world: World = {
		files: {},
		mtimes: {},
		session: "s1",
		status: "",
		...init,
	};
	on("classic.UserPromptSubmit", () => ({}));
	on("classic.PostToolUse", () => ({}));
	on("tool.call", () => ({ result: "ok" }));
	on("fs.read", (_$, e) => {
		const text = world.files[e.path];
		return typeof text === "string" ? { value: text } : { deny: "ENOENT" };
	});
	on("fs.exists", (_$, e) => ({
		value: typeof world.files[e.path] === "string",
	}));
	on("fs.write", (_$, e) => {
		world.files[e.path] = e.text;
		return { value: undefined };
	});
	on("fs.stat", (_$, e) =>
		world.files[e.path] === undefined
			? { deny: "ENOENT" }
			: {
					value: {
						kind: "file",
						size: 0,
						mtimeMs: world.mtimes[e.path] ?? 0,
						isLink: false,
					},
				},
	);
	on("session.id", () => ({ value: world.session }));
	on("session.root", () => ({ value: "/proj" }));
	on("session.cwd", () => ({ value: "/proj" }));
	on("env.get", (_$, e) => ({
		value: e.name === "TMPDIR" ? "/tmp" : undefined,
	}));
	on("clock.now", () => ({ value: NOW }));
	on("process.run", (_$, e) =>
		ran(e.argv.includes("rev-parse") ? "/proj\n" : world.status),
	);
	return world;
};

const edit = ($: Engine, path: string, agent?: { id: string; type: string }) =>
	$.classic.PostToolUse({
		tool_name: "Edit",
		tool_input: { file_path: path },
		tool_response: {},
		tool_use_id: "t1",
		...(agent ? { agent_id: agent.id, agent_type: agent.type } : {}),
	});

const prompt = ($: Engine) => $.classic.UserPromptSubmit({ prompt: "go on" });

const gitStatus = ($: Engine) =>
	$.tool.call({ tool: "Bash", command: "git status" });

test("Mine: an edit that nothing else changes adds no line at the next turn", async ($: Engine, on: On) => {
	stub(on, { files: { "/proj/a.ts": "const a = 1;\n" } });
	await edit($, "/proj/a.ts");
	expect((await prompt($)).additionalContext ?? []).toStrictEqual([]);
});

test("Changed After: a rewrite after the edit adds one line that names the file, and only one time", async ($: Engine, on: On) => {
	const world = stub(on, { files: { "/proj/a.ts": "const a = 1;\n" } });
	await edit($, "/proj/a.ts");
	world.files["/proj/a.ts"] = "const a = 1\n";
	const lines = (await prompt($)).additionalContext ?? [];
	expect(lines.length).toBe(1);
	expect(lines[0]).toContain("`/proj/a.ts`");
	expect(lines[0]?.split("\n").length).toBe(1);
	expect((await prompt($)).additionalContext ?? []).toStrictEqual([]);
	world.files["/proj/a.ts"] = "const a = 2;\n";
	expect(((await prompt($)).additionalContext ?? []).length).toBe(1);
});

test("Two Sessions: session B reads the entry of session A, and A still gets the line for its file", async ($: Engine, on: On) => {
	const world = stub(on, {
		files: { "/proj/b.ts": "one\n" },
		session: "A",
	});
	await edit($, "/proj/b.ts");
	const ledger = Object.entries(world.files).find(([path]) =>
		path.startsWith("/tmp/claudetto/ledger/"),
	);
	expect(ledger?.[0]).toMatch(LEDGER_NAME);
	expect(ledger?.[1]).toContain('"path":"/proj/b.ts"');
	expect(ledger?.[1]).toContain('"session":"A"');
	world.session = "B";
	await edit($, "/proj/c.ts");
	expect(Object.values(world.files).join("")).toContain('"session":"A"');
	world.session = "A";
	world.files["/proj/b.ts"] = "two\n";
	const lines = (await prompt($)).additionalContext ?? [];
	expect(lines.length).toBe(1);
	expect(lines[0]).toContain("`/proj/b.ts`");
});

test("a file that the agent edited again is its own again", async ($: Engine, on: On) => {
	const world = stub(on, { files: { "/proj/a.ts": "one\n" } });
	await edit($, "/proj/a.ts");
	world.files["/proj/a.ts"] = "two\n";
	await edit($, "/proj/a.ts");
	expect((await prompt($)).additionalContext ?? []).toStrictEqual([]);
});

test("the ledger holds the edits of a subagent, and the line names that agent", async ($: Engine, on: On) => {
	const world = stub(on, { files: { "/proj/b.ts": "one\n" } });
	await edit($, "/proj/b.ts", { id: "sub1", type: "claudetto:Hephaestus" });
	world.files["/proj/b.ts"] = "two\n";
	const lines = (await prompt($)).additionalContext ?? [];
	expect(lines.length).toBe(1);
	expect(lines[0]).toContain("`claudetto:Hephaestus`");
});

test("a tool other than `Edit` and `Write` adds no entry", async ($: Engine, on: On) => {
	const world = stub(on, { files: { "/proj/a.ts": "one\n" } });
	await $.classic.PostToolUse({
		tool_name: "Grep",
		tool_input: { pattern: "one" },
		tool_response: {},
		tool_use_id: "t2",
	});
	world.files["/proj/a.ts"] = "two\n";
	expect((await prompt($)).additionalContext ?? []).toStrictEqual([]);
});

test("a `Bash` call puts the files that it changed in the ledger, and skips a file that is older than the call", async ($: Engine, on: On) => {
	const world = stub(on, {
		files: { "/proj/new.ts": "one\n", "/proj/old.ts": "one\n" },
		mtimes: { "/proj/new.ts": NOW - 500, "/proj/old.ts": NOW - 3_600_000 },
		status: " M new.ts\0 M old.ts\0",
	});
	await $.classic.PostToolUse({
		tool_name: "Bash",
		tool_input: { command: "sed -i s/a/b/ new.ts" },
		tool_response: {},
		tool_use_id: "t3",
		duration_ms: 200,
	});
	world.files["/proj/new.ts"] = "two\n";
	world.files["/proj/old.ts"] = "two\n";
	const lines = (await prompt($)).additionalContext ?? [];
	expect(lines.length).toBe(1);
	expect(lines[0]).toContain("`/proj/new.ts`");
	expect(lines[0]).not.toContain("old.ts");
});

test("User Edit: `git status` names a file that no ledger line holds as a change of the user", async ($: Engine, on: On) => {
	const file = ".github/workflows/commitlint.yml";
	stub(on, {
		files: { [`/proj/${file}`]: "name: commitlint\n" },
		status: ` M ${file}\0`,
	});
	const context = ((await gitStatus($)).context ?? []).join("\n");
	expect(context).toContain(
		`- The user: \`${file}\``.replace(file, `/proj/${file}`),
	);
});

test("Other Session: `git status` of session B names a file that session A wrote as a change of session A", async ($: Engine, on: On) => {
	const world = stub(on, {
		files: { "/proj/src/x.ts": "export {};\n" },
		session: "A",
		status: " M src/x.ts\0",
	});
	await edit($, "/proj/src/x.ts");
	world.session = "B";
	const context = ((await gitStatus($)).context ?? []).join("\n");
	expect(context).toContain("- Another Claude session: `/proj/src/x.ts`");
	expect(context).toContain("session `A`");
	expect(context).not.toContain("- The user");
});

test("a command other than `git status` and `git diff` adds no context", async ($: Engine, on: On) => {
	stub(on, { files: { "/proj/a.ts": "one\n" }, status: " M a.ts\0" });
	const answer = await $.tool.call({ tool: "Bash", command: "ls" });
	expect(answer.context ?? []).toStrictEqual([]);
});
