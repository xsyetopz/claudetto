import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { lab, stop } from "./open-items.mock.ts";
import { commandForm, openItems } from "./open-items.ts";

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
	expect(commandForm("- ! gh auth login").stray).toEqual([]);
	expect(commandForm("- [ ] ! gh auth login").stray).toEqual([
		"- [ ] ! gh auth login",
	]);
});

test("a question item names the claudetto ask tool, with no tool.list call", async ($: Engine, on: On) => {
	const tools = lab(on);

	const out = await stop($, "- [ ] Which region should I use?");

	expect(out.block).toContain(
		"Ask each with mcp__claudetto__ask-user-question and",
	);
	expect(out.block).toContain("Which region should I use?");
	expect(tools.listed()).toBe(0);
});

test("a headless session, where no ask reaches anyone, gets no ask block for a question item and still gets the command block", async ($: Engine, on: On) => {
	lab(on);
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: false });

	const awaited6 = await stop($, "- [ ] Which region should I use?");
	expect(awaited6.block).toBeUndefined();
	const awaited7 = await stop($, "You need to run `gh auth login` first.");
	expect(awaited7.block).toBeDefined();
});

test("a reply already in form gets no block", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"Wrote the unit file.\n\n## What I Need From You\n- ! sudo systemctl enable foo",
	);
	const plain = await stop($, "Wrote the unit file. Tests pass.");

	expect(out.block).toBeUndefined();
	expect(plain.block).toBeUndefined();
});

test("a command outside an item blocks: a ! line, a sudo code block, sudo in prose", async ($: Engine, on: On) => {
	lab(on);

	const bang = await stop($, "Run this:\n\n! gh auth login");
	const code = await stop($, "Install:\n```sh\nsudo apt install jq\n```");
	const prose = await stop($, "You need to run sudo systemctl restart foo.");

	expect(bang.block).toContain("`- ! <command>` bullet");
	expect(bang.block).toContain("! gh auth login");
	expect(code.block).toContain("sudo apt install jq");
	expect(prose.block).toContain("sudo systemctl restart foo");
});

test("items with a ! command and no heading block", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, "- ! gh auth login");

	expect(out.block).toContain("## What I Need From You");
});

test("the form passes: one command in an item under the heading, no question in the text", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"Wrote the unit file.\n\n## What I Need From You\n- ! sudo systemctl enable foo",
	);

	expect(out.block).toBeUndefined();
});

test("two ! command items block once, naming both, and keep the one the work needs first", async ($: Engine, on: On) => {
	const tools = lab(on);

	const out = await stop(
		$,
		"Wrote the unit file.\n\n## What I Need From You\n- ! sudo systemctl enable foo\n- ! gh auth login",
	);

	expect(out.block).toContain("! sudo systemctl enable foo");
	expect(out.block).toContain("! gh auth login");
	expect(out.block).toContain("needs first");
	expect(out.block).toContain("later reply");
	expect(tools.listed()).toBe(0);
});

test("a command block of a continued turn passes", async ($: Engine, on: On) => {
	lab(on);

	const awaited8 = await stop($, "! gh auth login", true);
	expect(awaited8.block).toBeUndefined();
});
