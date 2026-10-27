// Lab tests of the edit ledger (spec `session-hygiene`, "Edit Ledger").
// The ledger is a file in the temp folder, and the stub keeps all files in one map, so two sessions share it.
// The file is self-contained, because a lab test cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { ran } from "./stubs/process.ts";
import { stubStore } from "./stubs/store.ts";

const NOW = 1_000_000;
const LEDGER_KEY = /^ledger:proj-[0-9a-f]{16}$/;

/** The world of a test: the content of each file (`null` for a missing file), and the modification time of each. */
interface World {
	files: Record<string, string | null>;
	mtimes: Record<string, number>;
	/** The id of the session that the hooks see now. */
	session: string;
	/** What `git status --porcelain -z` prints. */
	status: string;
	/** The private store of the plugin, shared by the sessions. */
	kv: Map<string, unknown>;
}

/** Stubs the files, the session, the clock, and `git`. The classic hook stands for the settings hooks beneath. */
const stub = (on: On, init: Partial<World> = {}): World => {
	const world: World = {
		files: {},
		mtimes: {},
		session: "s1",
		status: "",
		kv: new Map(),
		...init,
	};
	stubStore(on, world.kv);
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

/** The stored ledger lines, by the one ledger key of the store. */
const stored = (world: World): Record<string, unknown>[] => {
	const key = [...world.kv.keys()].find((k) => LEDGER_KEY.test(k));
	const lines = key === undefined ? [] : world.kv.get(key);
	return Array.isArray(lines) ? lines : [];
};

/** Whether a stored line has each field of `fields`. */
const holds = (world: World, fields: Record<string, string>): boolean =>
	stored(world).some((l) =>
		Object.entries(fields).every(([k, v]) => l[k] === v),
	);

test("Two Sessions: the ledger is one store key of the project, and it keeps the line of session A after an edit of session B", async ($: Engine, on: On) => {
	const world = stub(on, { files: { "/proj/b.ts": "one\n" }, session: "A" });
	await edit($, "/proj/b.ts");
	world.session = "B";
	await edit($, "/proj/c.ts");
	expect(holds(world, { path: "/proj/b.ts", session: "A" })).toBe(true);
	expect(Object.keys(world.files).some((p) => p.includes("/claudetto/"))).toBe(
		false,
	);
});

test("the ledger line of a subagent edit names that agent", async ($: Engine, on: On) => {
	const world = stub(on, { files: { "/proj/b.ts": "one\n" } });
	await edit($, "/proj/b.ts", { id: "sub1", type: "claudetto:Hephaestus" });
	expect(
		holds(world, {
			path: "/proj/b.ts",
			agent: "claudetto:Hephaestus",
		}),
	).toBe(true);
});

test("a tool other than `Edit` and `Write` adds no entry", async ($: Engine, on: On) => {
	const world = stub(on, { files: { "/proj/a.ts": "one\n" } });
	await $.classic.PostToolUse({
		tool_name: "Grep",
		tool_input: { pattern: "one" },
		tool_response: {},
		tool_use_id: "t2",
	});
	expect(stored(world)).toStrictEqual([]);
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
	expect(stored(world).map((l) => l["path"])).toStrictEqual(["/proj/new.ts"]);
});

test("Intent: an `Edit` is in the ledger with the hash of its result before it runs", async ($: Engine, on: On) => {
	const world = stub(on, { files: { "/proj/i.ts": "a b a\n" }, session: "s1" });
	await $.tool.call({
		tool: "Edit",
		tool_use_id: "t9",
		file_path: "/proj/i.ts",
		old_string: "b",
		new_string: "c",
	});
	expect(holds(world, { path: "/proj/i.ts", via: "edit" })).toBe(true);
	expect(world.files["/proj/i.ts"]).toBe("a b a\n");
});
