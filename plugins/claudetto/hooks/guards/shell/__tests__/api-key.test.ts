import { describe, expect, test } from "claude-code/testing";

import { fieldOf, stringsOf } from "../../../shared/field";
import { API_KEY_NOTE, type BashAnswer, needsApiKey } from "../missing";
import { NOTE_LIMIT } from "../notes";

const answer = (stderr: string): BashAnswer => ({
	text: undefined,
	stdout: "",
	stderr
});

describe("a model call that lacks an API key", () => {
	test("the note fits the limit and names claude -p", () => {
		// Assert
		expect(API_KEY_NOTE.length).toBeLessThanOrEqual(NOTE_LIMIT);
		expect(API_KEY_NOTE).toContain("claude -p");
	});

	test("a script or the API reporting the missing key is matched", () => {
		// Act and Assert
		expect(needsApiKey(answer("ANTHROPIC_API_KEY is not set"))).toBe(true);
		expect(
			needsApiKey(
				answer("Error: Missing environment variable ANTHROPIC_API_KEY")
			)
		).toBe(true);
		expect(
			needsApiKey(
				answer(
					'{"type":"error","error":{"message":"x-api-key header is required"}}'
				)
			)
		).toBe(true);
	});

	test("output that only names the variable is not matched", () => {
		// Act and Assert
		expect(needsApiKey(answer("ANTHROPIC_API_KEY=sk-redacted loaded"))).toBe(
			false
		);
		expect(needsApiKey(answer("summary: ship v2 on Friday"))).toBe(false);
	});
});

describe("a missing API key through the plugin", () => {
	test("the failed call gets the note and is not denied", async ($, on) => {
		// Arrange
		on("process.run", () => ({
			value: {
				exitCode: 0,
				stdout: "",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		}));
		on("ui.log", () => ({ value: undefined }));
		on("tool.check", () => ({ decision: "allow" }));
		on("tool.call", { tool: "Bash" }, () => ({
			isError: true,
			text: "Exit code 2\nANTHROPIC_API_KEY is not set",
			result: { stdout: "", stderr: "ANTHROPIC_API_KEY is not set" }
		}));

		// Act
		const r = await $.tool.call({ tool: "Bash", command: "node summarize.js" });

		// Assert
		const context = stringsOf(fieldOf(r, "context")) ?? [];
		expect(context).toContain(API_KEY_NOTE);
		expect(fieldOf(r, "deny")).toBeUndefined();
	});
});
