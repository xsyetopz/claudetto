import { expect, test } from "bun:test";

import {
	blockOf,
	formFault,
	lastRuns,
	untriedOrDone,
} from "../plugins/claudetto/scripts/open-items.ts";

const section = (body: string): string =>
	`Done.\n\n## What I Need From You\n\n${body}\n`;

const bashRun = (id: string, command: string): string =>
	JSON.stringify({
		type: "assistant",
		message: {
			content: [{ type: "tool_use", id, name: "Bash", input: { command } }],
		},
	});

const result = (id: string, content: string, isError: boolean): string =>
	JSON.stringify({
		type: "user",
		message: {
			content: [
				{
					type: "tool_result",
					tool_use_id: id,
					content,
					is_error: isError,
				},
			],
		},
	});

const transcript = (...rows: string[]): string => rows.join("\n");

test("one command bullet under the heading passes the form", () => {
	expect(formFault(section("- ! sudo make install"))).toBeUndefined();
});

test("a reply with no request passes", () => {
	expect(formFault("All done. Nothing is left.")).toBeUndefined();
});

test("one fenced sh block is the one item", () => {
	const body = "```sh\nsudo make install\n```";

	expect(formFault(section(body))).toBeUndefined();
});

test("a fenced sh block with a command bullet is two items", () => {
	const body = "- ! git push\n\n```sh\nsudo make install\n```";

	expect(formFault(section(body))).toContain("one");
});

test("two command bullets block", () => {
	expect(formFault(section("- ! git push\n- ! sudo make install"))).toContain(
		"one",
	);
});

test("a command bullet outside the heading blocks", () => {
	expect(formFault("Next:\n\n- ! git push\n")).toContain(
		"## What I Need From You",
	);
});

test("a bare ! line blocks", () => {
	expect(formFault(section("! git push"))).toContain("- ! <command>");
});

test("a checkbox item blocks", () => {
	expect(formFault("- [ ] decide the name\n")).toContain("[ ]");
});

test("an unticked task number is a report, not a request", () => {
	expect(formFault("- [ ] 6.2 Move the hook\n")).toBeUndefined();
});

test("a bullet that mentions a ! command in prose passes", () => {
	expect(
		formFault("- The finding says run `! git push` later.\n"),
	).toBeUndefined();
});

test("a command inside a fence that is not in the section is not a bullet", () => {
	expect(formFault("```md\n- ! git push\n- ! git pull\n```\n")).toBeUndefined();
});

test("an untried git commit bullet blocks and names the command", () => {
	const reply = section("- ! git commit -m 'x'");

	const reason = untriedOrDone(reply, transcript());

	expect(reason).toContain("`git commit -m 'x'`");
	expect(reason).toContain("Run it");
});

test("a bullet whose run was denied passes", () => {
	const rows = transcript(
		bashRun("a", "git commit -m 'x'"),
		result(
			"a",
			"Permission to use Bash with command git commit -m 'x' has been denied.",
			true,
		),
	);

	expect(untriedOrDone(section("- ! git commit -m 'x'"), rows)).toBeUndefined();
});

test("a bullet whose last run succeeded blocks", () => {
	const rows = transcript(
		bashRun("a", "git commit -m 'x'"),
		result("a", "[main 1a2b3c] x", false),
	);

	expect(untriedOrDone(section("- ! git commit -m 'x'"), rows)).toContain(
		"succeeded",
	);
});

test("a bullet whose last run failed without a denial passes", () => {
	const rows = transcript(
		bashRun("a", "sudo make install"),
		result("a", "sudo: a password is required", true),
	);

	expect(untriedOrDone(section("- ! sudo make install"), rows)).toBeUndefined();
});

test("the last run decides: a denial then a success blocks", () => {
	const rows = transcript(
		bashRun("a", "git push"),
		result("a", "The user doesn't want to proceed with this tool use.", true),
		bashRun("b", "git push"),
		result("b", "ok", false),
	);

	expect(lastRuns(rows).get("git push")).toBe("succeeded");
	expect(untriedOrDone(section("- ! git push"), rows)).toContain("succeeded");
});

test("a backtick-wrapped command matches its run", () => {
	const rows = transcript(
		bashRun("a", "git push"),
		result("a", "Permission for this action was denied by a hook.", true),
	);

	expect(untriedOrDone(section("- `! git push`"), rows)).toBeUndefined();
});

test("a fenced block needs no earlier run", () => {
	expect(
		untriedOrDone(section("```sh\nsudo make install\n```"), transcript()),
	).toBeUndefined();
});

test("a repeat stop passes, so one block is never repeated", () => {
	const input = {
		last_assistant_message: "- [ ] decide the name\n",
		stop_hook_active: true,
	};

	expect(blockOf(input, "", "")).toBeUndefined();
});

test("the switch off passes", () => {
	const input = {
		last_assistant_message: "- [ ] decide the name\n",
		stop_hook_active: false,
	};

	expect(blockOf(input, "", "false")).toBeUndefined();
	expect(blockOf(input, "", "")).toContain("[ ]");
});
