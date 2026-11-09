import type { On, PluginOptions, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { scanner } from "../secrets.mock.ts";
import { commandForm, openItems } from "./open-items.ts";

const said = (role: SessionMessage["role"], text: string): SessionMessage => ({
	role,
	text,
	toolUses: [],
});

const withUse = (use: {
	tool: string;
	isError?: true;
	text?: string;
}): SessionMessage => ({
	role: "assistant",
	text: "",
	toolUses: [{ tool_use_id: "t1", input: {}, ...use }],
});

let tools: string[] = ["AskUserQuestion"];
let listed = 0;

const lab = (on: On, ...turn: SessionMessage[]): void => {
	scanner(on);
	on("classic.Stop", () => ({}));
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("session.start", () => ({ cwd: "/repo" }));
	on("session.messages", () => ({ value: [said("user", "go"), ...turn] }));
	listed = 0;
	on("tool.list", () => {
		listed += 1;
		return {
			value: tools.map((name) => ({ name, description: "", mcp: false })),
		};
	});
};

const stop = (
	$: Engine,
	reply: string,
	stopHookActive = false,
): Promise<{ block?: string }> =>
	$.classic.Stop({
		stop_hook_active: stopHookActive,
		last_assistant_message: reply,
		background_tasks: [],
	});

const off = (): { options: PluginOptions } => ({
	options: { openItemsCheckEnabled: false },
});

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
	const need = await stop($, "## What I Need from You\n- [ ] pick a name");
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

test("an open item that gives a `! command` passes, a paid run included", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"## What I Need from You\n- [ ] paid eval: approve it with `! bun run paid-eval`",
	);

	expect(out.block).toBeUndefined();
});

test("an item without a ! command is a question: the block says to ask it and delete the item", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"- [ ] Tell me where the repo is\n- [ ] give me the ID\n- [ ] enable Bash",
	);

	expect(out.block).toContain("A checklist item without `! ` is a question");
	expect(out.block).toContain("Ask each with AskUserQuestion and delete it");
	for (const item of [
		"Tell me where the repo is",
		"give me the ID",
		"enable Bash",
	]) {
		expect(out.block).toContain(`- [ ] ${item}`);
	}
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
	"Done items 1-3.\n\n## What I Need from You\n- [ ] Send what the empty message was meant to say.";

test("the recorded incident reply, in the form the output style prescribes, blocks", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, INCIDENT);

	expect(out.block).toContain("Send what the empty message was meant to say");
});

test("a What I Need from You item with a ! command passes", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"## What I Need from You\n- [ ] Log in: `! gh auth login`. Send back the account name. Meanwhile I write the tests.",
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

test("a `!` excuses an item at its start, after a space, a backtick, or a paren, with spaces after it", async ($: Engine, on: On) => {
	lab(on);

	const excused = await Promise.all(
		[
			"! gh auth login",
			"log in with ! gh auth login",
			"run `!  gh auth login`",
			"run (! gh auth login)",
		].map((item) => stop($, `## What I Need from You\n- [ ] ${item}`)),
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

	expect((await stop($, "- [ ] push")).block).toContain("\n- [ ] push\n");
});

test("a turn is counted from the last message with text, so a tool result or a reply does not restart it", async ($: Engine, on: On) => {
	lab(on, withUse({ tool: "AskUserQuestion" }), said("user", ""));
	expect((await stop($, "- [ ] push")).block).toBeUndefined();
});

test("a reply of the assistant does not restart the turn either", async ($: Engine, on: On) => {
	lab(on, withUse({ tool: "AskUserQuestion" }), said("assistant", "ok"));

	expect((await stop($, "- [ ] push")).block).toBeUndefined();
});

test("a call that worked, or a question that was answered, is no blocker", async ($: Engine, on: On) => {
	lab(
		on,
		withUse({ tool: "Edit" }),
		withUse({ tool: "Bash" }),
		withUse({ tool: "AskUserQuestion", text: "yes" }),
	);

	expect((await stop($, "- [ ] push")).block).toContain("\n- [ ] push\n");
});

test("a question that is open excuses an item", async ($: Engine, on: On) => {
	lab(on, withUse({ tool: "Read" }), withUse({ tool: "AskUserQuestion" }));
	expect((await stop($, "- [ ] push")).block).toBeUndefined();
});

test("openItems of an empty or blank reply finds nothing", () => {
	const turn = { asking: false };

	expect(openItems("", turn)).toEqual([]);
	expect(openItems("\n  \n", turn)).toEqual([]);
});

test("a backtick command the reply asks the user to run without ! is stray", () => {
	expect(
		commandForm("You need to run `gh auth login` first.").stray,
	).toHaveLength(1);
	expect(commandForm("Run `bun dev` to start it.").stray).toEqual([]);
	expect(commandForm("- [ ] ! gh auth login").stray).toEqual([]);
});

test("a question item names AskUserQuestion, or the mcp tool when the session lists it", async ($: Engine, on: On) => {
	lab(on);
	const plain = await stop($, "- [ ] Which region should I use?");
	tools = ["AskUserQuestion", "mcp__claudetto__ask-user-question"];
	const mcp = await stop($, "- [ ] Which region should I use?");
	tools = ["AskUserQuestion"];

	expect(plain.block).toContain("Ask each with AskUserQuestion and");
	expect(plain.block).toContain("Which region should I use?");
	expect(mcp.block).toContain(
		"Ask each with mcp__claudetto__ask-user-question and",
	);
});

test("a headless session, which has no AskUserQuestion, gets no ask block for a question item and still gets the command block", async ($: Engine, on: On) => {
	lab(on);
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: false });

	expect((await stop($, "- [ ] Which region should I use?")).block).toBeUndefined();
	expect((await stop($, "You need to run `gh auth login` first.")).block).toBeDefined();
});

test("a reply already in form costs nothing: no block and no tool.list call", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"Wrote the unit file.\n\n## What I Need from You\n- [ ] ! sudo systemctl enable foo",
	);
	const plain = await stop($, "Wrote the unit file. Tests pass.");

	expect(out.block).toBeUndefined();
	expect(plain.block).toBeUndefined();
	expect(listed).toBe(0);
});

test("a command outside an item blocks: a ! line, a sudo code block, sudo in prose", async ($: Engine, on: On) => {
	lab(on);

	const bang = await stop($, "Run this:\n\n! gh auth login");
	const code = await stop($, "Install:\n```sh\nsudo apt install jq\n```");
	const prose = await stop($, "You need to run sudo systemctl restart foo.");

	expect(bang.block).toContain("`- [ ] ! <command>` item");
	expect(bang.block).toContain("! gh auth login");
	expect(code.block).toContain("sudo apt install jq");
	expect(prose.block).toContain("sudo systemctl restart foo");
});

test("items with a ! command and no heading block", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, "- [ ] ! gh auth login");

	expect(out.block).toContain("## What I Need from You");
});

test("the form passes: one command in an item under the heading, no question in the text", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"Wrote the unit file.\n\n## What I Need from You\n- [ ] ! sudo systemctl enable foo",
	);

	expect(out.block).toBeUndefined();
});

test("two ! command items block once, naming both, and keep the one the work needs first", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"Wrote the unit file.\n\n## What I Need from You\n- [ ] ! sudo systemctl enable foo\n- [ ] ! gh auth login",
	);

	expect(out.block).toContain("! sudo systemctl enable foo");
	expect(out.block).toContain("! gh auth login");
	expect(out.block).toContain("needs first");
	expect(out.block).toContain("later reply");
	expect(listed).toBe(0);
});

test("a command block of a continued turn passes", async ($: Engine, on: On) => {
	lab(on);

	expect((await stop($, "! gh auth login", true)).block).toBeUndefined();
});
