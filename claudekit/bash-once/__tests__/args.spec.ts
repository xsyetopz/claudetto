import { describe, expect, test } from "bun:test";
import { parseArgs, settingsWithHook, toolResultOf } from "../args.ts";

describe("parseArgs", () => {
	test("reads the command and inline `--settings` JSON", () => {
		const parsed = parseArgs(["echo hi", "--settings", '{"a":1}']);

		expect(parsed).toEqual({ command: "echo hi", settings: '{"a":1}' });
	});

	test("reads a settings file path as the second word and a `--hook` command", () => {
		const parsed = parseArgs(["ls", "s.json", "--hook", "bun h.ts"]);

		expect(parsed).toEqual({ command: "ls", file: "s.json", hook: "bun h.ts" });
	});

	test("rejects a call without a command", () => {
		expect(() => parseArgs([])).toThrow("`COMMAND`");
	});

	test("rejects a flag without its value", () => {
		expect(() => parseArgs(["ls", "--hook"])).toThrow("`--hook`");
	});
});

describe("settingsWithHook", () => {
	test("adds a `PreToolUse` hook for `Bash` and keeps the other hooks", () => {
		const out = settingsWithHook(
			{ hooks: { PreToolUse: [{ matcher: "Edit", hooks: [] }] } },
			"bun h.ts",
		);

		expect(out).toEqual({
			hooks: {
				PreToolUse: [
					{ matcher: "Edit", hooks: [] },
					{
						matcher: "Bash",
						hooks: [{ type: "command", command: "bun h.ts" }],
					},
				],
			},
		});
	});
});

describe("toolResultOf", () => {
	test("returns the `tool_result` content of the last message", () => {
		const body = JSON.stringify({
			messages: [
				{ role: "user", content: "x" },
				{ role: "user", content: [{ type: "tool_result", content: "hi\n" }] },
			],
		});

		expect(toolResultOf(body)).toBe("hi\n");
	});

	test("says so when the body has no result", () => {
		expect(toolResultOf(undefined)).toBe("no result");
		expect(toolResultOf("{}")).toBe("no result");
	});
});
