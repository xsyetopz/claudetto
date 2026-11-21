import { describe, expect, test } from "claude-code/testing";

import { fieldOf, stringsOf } from "../../../shared/field";
import { type BashAnswer, hasNoChecks, NO_CHECKS_NOTE } from "../missing";
import { NOTE_LIMIT } from "../notes";

describe("gh pr checks with no check registered", () => {
	const quiet: BashAnswer = {
		text: undefined,
		stdout: "",
		stderr: "no checks reported on the 'feat/x' branch"
	};

	test("the note fits the limit and denies nothing", () => {
		expect(NO_CHECKS_NOTE.length).toBeLessThanOrEqual(NOTE_LIMIT);
	});

	test("gh pr checks with no checks reported is matched, in stderr or stdout", () => {
		expect(hasNoChecks("gh pr checks 12 --watch", quiet)).toBe(true);
		expect(
			hasNoChecks("gh pr create && gh pr checks 12 --watch", {
				...quiet,
				stderr: undefined,
				stdout: "no checks reported on the 'x' branch"
			})
		).toBe(true);
	});

	test("listed checks and other commands give nothing", () => {
		expect(
			hasNoChecks("gh pr checks 12", {
				text: undefined,
				stdout: "build\tpass\t1m",
				stderr: undefined
			})
		).toBe(false);
		expect(hasNoChecks("gh pr view 12", quiet)).toBe(false);
		expect(hasNoChecks("echo gh pr checks", quiet)).toBe(false);
	});
});

describe("gh pr checks through the plugin", () => {
	test("no checks reported adds the note and never denies", async ($, on) => {
		// Arrange
		on("process.run", () => ({
			value: {
				exitCode: 0,
				stdout: "System-wide memory free percentage: 50%\n",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		}));
		on("ui.log", () => ({ value: undefined }));
		on("tool.check", () => ({ decision: "allow" }));
		on("tool.call", { tool: "Bash" }, () => ({
			result: {
				stdout: "",
				stderr: "no checks reported on the 'feat/x' branch"
			}
		}));

		// Act
		const r = await $.tool.call({
			tool: "Bash",
			command: "gh pr checks 12 --watch"
		});

		// Assert
		const context = stringsOf(fieldOf(r, "context")) ?? [];
		expect(context).toContain(NO_CHECKS_NOTE);
		expect(fieldOf(r, "deny")).toBeUndefined();
	});

	test("listed checks add no note", async ($, on) => {
		// Arrange
		on("process.run", () => ({
			value: {
				exitCode: 0,
				stdout: "System-wide memory free percentage: 50%\n",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		}));
		on("ui.log", () => ({ value: undefined }));
		on("tool.check", () => ({ decision: "allow" }));
		on("tool.call", { tool: "Bash" }, () => ({
			result: { stdout: "build\tpass\t1m", stderr: "" }
		}));

		// Act
		const r = await $.tool.call({
			tool: "Bash",
			command: "gh pr checks 12 --watch"
		});

		// Assert
		const context = stringsOf(fieldOf(r, "context")) ?? [];
		expect(context).not.toContain(NO_CHECKS_NOTE);
	});

	test("another command printing the text adds no note", async ($, on) => {
		// Arrange
		on("process.run", () => ({
			value: {
				exitCode: 0,
				stdout: "System-wide memory free percentage: 50%\n",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		}));
		on("ui.log", () => ({ value: undefined }));
		on("tool.check", () => ({ decision: "allow" }));
		on("tool.call", { tool: "Bash" }, () => ({
			result: {
				stdout: "",
				stderr: "no checks reported on the 'feat/x' branch"
			}
		}));

		// Act
		const r = await $.tool.call({ tool: "Bash", command: "gh pr view 12" });

		// Assert
		const context = stringsOf(fieldOf(r, "context")) ?? [];
		expect(context).not.toContain(NO_CHECKS_NOTE);
	});
});
