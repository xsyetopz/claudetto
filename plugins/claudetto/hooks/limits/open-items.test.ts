import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { scanner } from "../secrets.mock.ts";
import { ASK_FORM } from "../texts.ts";
import { lab, off, said, stop, withUse } from "./open-items.mock.ts";

test("prose that mentions a remaining budget passes", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"Remaining budget is fine.\n- edited a.ts\n- edited b.ts",
	);

	expect(out.block).toBeUndefined();
});

test("a done task item passes", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, "- [x] add the test");

	expect(out.block).toBeUndefined();
});

test("a blocker word in an open item is no blocker", async ($: Engine, on: On) => {
	lab(on);

	const permission = await stop($, "- [ ] add the permission check to gate.ts");
	const approval = await stop($, "- [ ] write the approval test");

	expect(permission.block).toContain("add the permission check to gate.ts");
	expect(approval.block).toContain("write the approval test");
});

test("open items block under any heading or none", async ($: Engine, on: On) => {
	lab(on);

	const open = await stop($, "## Open\n- [ ] wire the hook");
	const need = await stop($, "## What I Need From You\n- [ ] pick a name");
	const bare = await stop($, "- [ ] run it");

	expect(open.block).toContain("wire the hook");
	expect(need.block).toContain("pick a name");
	expect(bare.block).toContain("run it");
});

test("a plain bullet under an Open heading is no task item", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, "## Open\n- wire the hook");

	expect(out.block).toBeUndefined();
});

test("a plain bullet that gives a `! command` passes, a paid run included", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"## What I Need From You\n- paid eval: approve it with `! bun run paid-eval`",
	);

	expect(out.block).toBeUndefined();
});

test("a `! command` in a checkbox item blocks and asks for a plain bullet", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, "## What I Need From You\n- [ ] ! gh auth login");

	expect(out.block).toContain("- [ ] ! gh auth login");
	expect(out.block).toContain("with no checkbox");
});

test("a checkbox item is a question, and the block names each item", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"- [ ] Tell me where the repo is\n- [ ] give me the ID\n- [ ] enable Bash",
	);

	expect(out.block).toContain(
		ASK_FORM(["Tell me where the repo is", "give me the ID", "enable Bash"]),
	);
});

test("a refused call in the turn, a host-denied Glob or Grep included, excuses no item", async ($: Engine, on: On) => {
	lab(on, withUse({ tool: "Glob", isError: true }));

	const out = await stop($, "- [ ] push to origin");

	expect(out.block).toContain("- [ ] push to origin");
});

test("an open AskUserQuestion is the blocker of an open item", async ($: Engine, on: On) => {
	lab(on, withUse({ tool: "AskUserQuestion" }));

	const out = await stop($, "- [ ] pick a name");

	expect(out.block).toBeUndefined();
});

test("the second Stop of a continued turn passes", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, "- [ ] add the test", true);

	expect(out.block).toBeUndefined();
});

test("a block of another hook stands and adds nothing", async ($: Engine, on: On) => {
	scanner(on);
	on("classic.Stop", () => ({ block: "tests are red" }));
	on("session.messages", () => ({ value: [said("user", "go")] }));
	on("tool.call", () => ({ result: {} }));
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
	await $.tool.call({
		tool: "Edit",
		tool_use_id: "t1",
		file_path: "/p/a.ts",
		old_string: "a",
		new_string: "b",
	});

	const out = await stop($, "- [ ] add the test");

	expect(out.block).toBe("tests are red");
});

test(
	"openItemsCheckEnabled false blocks nothing",
	off(),
	async ($: Engine, on: On) => {
		lab(on);

		const out = await stop($, "- [ ] add the test");

		expect(out.block).toBeUndefined();
	},
);

const INCIDENT =
	"Done items 1-3.\n\n## What I Need From You\n- [ ] Send what the empty message was meant to say.";

test("the recorded incident reply, in the form the output style prescribes, blocks", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, INCIDENT);

	expect(out.block).toContain("Send what the empty message was meant to say");
});

test("a What I Need From You bullet with a ! command passes", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"## What I Need From You\n- Log in: `! gh auth login`. Send back the account name. Meanwhile I write the tests.",
	);

	expect(out.block).toBeUndefined();
});

test("an item is listed by its text alone, whatever the bullet, indent, spacing, or trailing blanks", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"  - [ ] a\n10. [ ] b\n2) [ ] c\n-  [ ]  d\n- [ ] e  \nsee - [ ] f\n1x [ ] g\n1: [ ] h",
	);

	for (const item of ["a", "b", "c", "d", "e"]) {
		expect(out.block).toContain(`\n- [ ] ${item}\n`);
	}
	for (const item of ["f", "g", "h"]) {
		expect(out.block).not.toContain(`- [ ] ${item}\n`);
	}
});

test("a `!` makes a bullet a command at its start, after a space, a backtick, or a paren, with spaces after it", async ($: Engine, on: On) => {
	lab(on);

	const excused = await Promise.all(
		[
			"! gh auth login",
			"log in with ! gh auth login",
			"run `!  gh auth login`",
			"run (! gh auth login)",
		].map((item) => stop($, `## What I Need From You\n- ${item}`)),
	);
	const blocked = await Promise.all(
		["fix this! Then retry", "run `!gh auth login`"].map((item) =>
			stop($, `- [ ] ${item}`),
		),
	);

	for (const out of excused) {
		expect(out.block).toBeUndefined();
	}
	expect(blocked[0]?.block).toContain("fix this! Then retry");
	expect(blocked[1]?.block).toContain("run `!gh auth login`");
});

test("a question of an earlier turn excuses nothing", async ($: Engine, on: On) => {
	lab(on, withUse({ tool: "AskUserQuestion" }), said("user", "go on"));

	const awaited = await stop($, "- [ ] push");
	expect(awaited.block).toContain("\n- [ ] push\n");
});

test("a turn is counted from the last message with text, so a tool result or a reply does not restart it", async ($: Engine, on: On) => {
	lab(on, withUse({ tool: "AskUserQuestion" }), said("user", ""));
	const awaited2 = await stop($, "- [ ] push");
	expect(awaited2.block).toBeUndefined();
});

test("a reply of the assistant does not restart the turn either", async ($: Engine, on: On) => {
	lab(on, withUse({ tool: "AskUserQuestion" }), said("assistant", "ok"));

	const awaited3 = await stop($, "- [ ] push");
	expect(awaited3.block).toBeUndefined();
});

test("a call that worked, or a question that was answered, is no blocker", async ($: Engine, on: On) => {
	lab(
		on,
		withUse({ tool: "Edit" }),
		withUse({ tool: "Bash" }),
		withUse({ tool: "AskUserQuestion", text: "yes" }),
	);

	const awaited4 = await stop($, "- [ ] push");
	expect(awaited4.block).toContain("\n- [ ] push\n");
});

test("a question that is open excuses an item", async ($: Engine, on: On) => {
	lab(on, withUse({ tool: "Read" }), withUse({ tool: "AskUserQuestion" }));
	const awaited5 = await stop($, "- [ ] push");
	expect(awaited5.block).toBeUndefined();
});
