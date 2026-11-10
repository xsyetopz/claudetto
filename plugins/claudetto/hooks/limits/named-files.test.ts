import type { On } from "claude-code";
import {
	type Engine,
	expect,
	test as labTest,
	type TestBody,
} from "claude-code/testing";

import { scanner } from "../secrets.mock.ts";
import { namedPaths, userCommands } from "./named-files.ts";

// This file tests the file check alone: the command-form check would block its bare `! <command>` replies first.
const test = (name: string, run: TestBody) => {
	labTest(name, { options: { openItemsCheckEnabled: false } }, run);
};

const INCIDENT = "Run the dump:\n- [ ] `! bun /tmp/probe-cmds-scripts/dump.ts`";

const lab = (on: On, present: readonly string[] = []) => {
	scanner(on);
	on("classic.Stop", () => ({}));
	on("classic.SubagentStop", () => ({}));
	on("session.messages", () => ({ value: [] }));
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("env.get", () => ({ value: "/home/u" }));
	on("fs.exists", (_$, e) => ({ value: present.includes(e.path) }));
};

const stop = ($: Engine, reply: string) =>
	$.classic.Stop({
		stop_hook_active: false,
		last_assistant_message: reply,
		background_tasks: [],
	});

test("the incident text with the file missing blocks and names the path", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, INCIDENT);

	expect(out.block).toContain("/tmp/probe-cmds-scripts/dump.ts");
	expect(out.block).toContain("bun /tmp/probe-cmds-scripts/dump.ts");
});

test("the incident text with the file present passes", async ($: Engine, on: On) => {
	lab(on, ["/tmp/probe-cmds-scripts/dump.ts"]);

	const awaited = await stop($, INCIDENT);
	expect(awaited.block).toBeUndefined();
});

test("a path the command makes passes while absent", async ($: Engine, on: On) => {
	lab(on);

	const mkdir = await stop($, "`! mkdir -p /tmp/x`");
	const cp = await stop($, "```\n! cp /tmp/a /tmp/b\n```");
	const clone = await stop($, "`! git clone https://h/r.git /tmp/r`");

	expect(mkdir.block).toBeUndefined();
	expect(cp.block).toContain("/tmp/a");
	expect(cp.block).not.toContain("- `/tmp/b`");
	expect(clone.block).toBeUndefined();
});

test("a redirect target passes and a relative path is left alone", async ($: Engine, on: On) => {
	lab(on);

	const redirect = await stop($, "`! echo hi > /tmp/out.txt`");
	const relative = await stop($, "`! bun scripts/dump.ts`");

	expect(redirect.block).toBeUndefined();
	expect(relative.block).toBeUndefined();
});

test("a ~/ path is read under HOME", async ($: Engine, on: On) => {
	lab(on, ["/home/u/a.ts"]);

	const here = await stop($, "`! bun ~/a.ts`");
	const gone = await stop($, "`! bun ~/b.ts`");

	expect(here.block).toBeUndefined();
	expect(gone.block).toContain("~/b.ts");
});

test("a command not marked with `!` is not checked", async ($: Engine, on: On) => {
	lab(on);

	const awaited2 = await stop($, "See `/tmp/none.ts`.");
	expect(awaited2.block).toBeUndefined();
});

test("a subagent's final report with a missing file is blocked", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.classic.SubagentStop({
		stop_hook_active: false,
		last_assistant_message: INCIDENT,
		agent_id: "a1",
		agent_type: "general-purpose",
		agent_transcript_path: "/tmp/t.jsonl",
	});

	expect(out.block).toContain("/tmp/probe-cmds-scripts/dump.ts");
});

test("touch and mv make their paths, and a mv still reads its source", async ($: Engine, on: On) => {
	lab(on);

	const touch = await stop($, "`! touch /tmp/x`");
	const mv = await stop($, "`! mv /tmp/a /tmp/b`");

	expect(touch.block).toBeUndefined();
	expect(mv.block).toContain("- `/tmp/a` in `! mv /tmp/a /tmp/b`");
	expect(mv.block).not.toContain("- `/tmp/b`");
});

test("only the last operand of a cp is made, however many come before it, and a flag after it is no operand", async ($: Engine, on: On) => {
	lab(on);

	const many = await stop($, "`! cp /tmp/a /tmp/b /tmp/dir`");
	const flagged = await stop($, "`! cp /tmp/a /tmp/b -v`");

	expect(many.block).toContain("- `/tmp/a` in");
	expect(many.block).toContain("- `/tmp/b` in");
	expect(many.block).not.toContain("- `/tmp/dir`");
	expect(flagged.block).toContain("- `/tmp/a` in");
	expect(flagged.block).not.toContain("- `/tmp/b`");
});

test("a git command other than clone reads its last operand, and clone is git's alone", async ($: Engine, on: On) => {
	lab(on);

	const add = await stop($, "`! git add /tmp/x`");
	const other = await stop($, "`! ls clone /tmp/x`");

	expect(add.block).toContain("- `/tmp/x` in `! git add /tmp/x`");
	expect(other.block).toContain("- `/tmp/x` in `! ls clone /tmp/x`");
});

test("a fence opens at the line start, indented or not, and not after text", async ($: Engine, on: On) => {
	lab(on);

	const indented = await stop($, "  ```\n! cat /tmp/a\n  ```");
	const mid = await stop($, "Text ```a``` then\n! cat /tmp/a");

	expect(indented.block).toContain("- `/tmp/a` in `! cat /tmp/a`");
	expect(mid.block).toBeUndefined();
});

test("a `!` step starts its line, with one or more spaces after it, and trims its span", async ($: Engine, on: On) => {
	lab(on);

	const spaced = await stop($, "`!   cat /tmp/a`");
	const padded = await stop($, "`  ! cat /tmp/b `");
	const fencedPad = await stop($, "```\n  ! cat /tmp/c\n```");
	const later = await stop($, "```\necho hi ! cat /tmp/d\n```");
	const broken = await stop($, "```\n! cat /tmp/e\rx\n```");

	expect(spaced.block).toContain("- `/tmp/a` in `! cat /tmp/a`");
	expect(padded.block).toContain("- `/tmp/b` in `! cat /tmp/b`");
	expect(fencedPad.block).toContain("- `/tmp/c` in `! cat /tmp/c`");
	expect(later.block).toBeUndefined();
	expect(broken.block).toBeUndefined();
});

test("userCommands gives the commands of the steps and nothing for text without one", () => {
	expect(
		userCommands("`! a b` and `plain` and ``\n```\n! c\nnot one\n```"),
	).toEqual(["a b", "c"]);
	expect(userCommands("no step here")).toEqual([]);
	expect(userCommands("```\n```")).toEqual([]);
});

test("namedPaths pairs each read path with its command", () => {
	expect(namedPaths("`! cat /a ~/b rel`")).toEqual([
		{ path: "/a", command: "cat /a ~/b rel" },
		{ path: "~/b", command: "cat /a ~/b rel" },
	]);
});
