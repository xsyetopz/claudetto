import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { commandForm, openItems } from "./open-items";
import { lab, stop } from "./open-items.mock";

test("openItems of an empty or blank reply finds nothing", () => {
	const turn = { asking: false };

	expect(openItems("", turn)).toEqual([]);
	expect(openItems("\n  \n", turn)).toEqual([]);
});

test("a numbered task line copied from a task list is no question, and an unnumbered item still is", () => {
	const turn = { asking: false };
	const reply = [
		"- [ ] 9.31 C33 (R38, R43): replies apologize. Add one typed question per fault.",
		"- [ ] 10.21 Run `just check` and `just verify`.",
		"- [ ] Which region should I use?",
		"- [ ] 3 retries or 5?",
	].join("\n");

	expect(openItems(reply, turn)).toEqual([
		"Which region should I use?",
		"3 retries or 5?",
	]);
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

test("a task item that quotes a ! <command> step in backticks is no command for the user", () => {
	const task = '- [ ] 9.22 no "Budget" line follows a `! ` command.';

	expect(commandForm(task).stray).toEqual([]);
	expect(commandForm("- [ ] `! gh auth login`").stray).toEqual([
		"- [ ] `! gh auth login`",
	]);
});

test("a question item names AskUserQuestion, with no tool.list call", async ($: Engine, on: On) => {
	const tools = lab(on);

	const out = await stop($, "- [ ] Which region should I use?");

	expect(out.block).toContain("Ask each with AskUserQuestion and");
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

test("a finding bullet that mentions a ! <command> step is no second command bullet", async ($: Engine, on: On) => {
	lab(on);
	const finding =
		"- **Cause:** Claude Code refuses to check a path that starts with `/\\`, and the gate turned that refusal into a permission dialog. The Stop hook had the same fault: such a pattern in a `! <command>` step made it lose every check, and it now skips the word.";
	const command = "- ! bun /tmp/claude-501/probe-ghenv/run.ts";

	const out = await stop(
		$,
		`Fixed.\n\n${finding}\n\n## What I Need From You\n${command}`,
	);

	expect(out.block).toBeUndefined();
	expect(commandForm(`${finding}\n${command}`).several).toEqual([]);
	expect(
		commandForm("- `! gh auth login`\n- ! gh auth login").several,
	).toHaveLength(2);
});

test("a command block of a continued turn passes", async ($: Engine, on: On) => {
	lab(on);

	const awaited8 = await stop($, "! gh auth login", true);
	expect(awaited8.block).toBeUndefined();
});
