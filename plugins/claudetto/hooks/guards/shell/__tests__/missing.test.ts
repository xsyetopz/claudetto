import { describe, expect, test } from "claude-code/testing";

import { fieldOf, stringsOf } from "../../../shared/field";
import {
	type BashAnswer,
	GREP_COUNT_NOTE,
	isZeroCount,
	missingCommand,
	missingNote
} from "../missing";
import { NOTE_LIMIT } from "../notes";

const failed = (text: string): BashAnswer => ({
	text,
	stdout: undefined,
	stderr: undefined
});

describe("missing command", () => {
	test("bash and zsh 'command not found' name the command", () => {
		// Arrange
		const bash = failed(
			"Exit code 127\nbash: line 1: jscpd: command not found"
		);
		const zsh = failed("Exit code 127\nzsh: command not found: jscpd");

		// Act and Assert
		expect(missingCommand("jscpd src", bash)).toBe("jscpd");
		expect(missingCommand("jscpd src", zsh)).toBe("jscpd");
	});

	test("exit 127 with no named command falls back to the command word", () => {
		// Arrange
		const answer = failed("Exit code 127\nsomething odd");

		// Act
		const name = missingCommand("FOO=1 jscpd src | head", answer);

		// Assert
		expect(name).toBe("jscpd");
	});

	test("'No such file or directory' counts only for a word in command position", () => {
		// Arrange
		const asCommand = failed(
			"Exit code 1\nzsh: jscpd: No such file or directory"
		);
		const asArgument = failed(
			"Exit code 1\ncat: notes.md: No such file or directory"
		);

		// Act and Assert
		expect(missingCommand("cd x && jscpd .", asCommand)).toBe("jscpd");
		expect(missingCommand("cat notes.md", asArgument)).toBeUndefined();
	});

	test("a missing script path is a file problem, not an install", () => {
		// Arrange
		const answer = failed(
			"Exit code 127\nbash: ./run.sh: No such file or directory"
		);

		// Act
		const name = missingCommand("./run.sh", answer);

		// Assert
		expect(name).toBeUndefined();
	});

	test("a failure that is not a missing command gives nothing", () => {
		// Arrange
		const answer = failed("Exit code 1\n3 tests failed");

		// Act and Assert
		expect(missingCommand("bun test", answer)).toBeUndefined();
	});

	test("the note says install, rerun and keep the check, within the limit", () => {
		// Arrange and Act
		const withSetup = missingNote("jscpd", true);
		const without = missingNote("jscpd", false);

		// Assert
		expect(withSetup).toContain("just setup");
		expect(withSetup).toContain("Keep the check");
		expect(without).toContain("package manager");
		expect(without).not.toContain("just setup");
		expect(withSetup.length).toBeLessThanOrEqual(NOTE_LIMIT);
		expect(without.length).toBeLessThanOrEqual(NOTE_LIMIT);
		expect(GREP_COUNT_NOTE.length).toBeLessThanOrEqual(NOTE_LIMIT);
	});
});

describe("grep -c zero count", () => {
	test("exit 1 with the single line 0 is a zero count", () => {
		// Arrange
		const answer = failed("Exit code 1\n0");

		// Act and Assert
		expect(isZeroCount("grep -c TODO src/a.ts", answer)).toBe(true);
		expect(isZeroCount("grep -rc TODO src", answer)).toBe(true);
		expect(isZeroCount("grep --count TODO a", answer)).toBe(true);
	});

	test("a non-zero count, another exit code, or a grep without -c gives nothing", () => {
		// Arrange
		const failure = failed(
			"Exit code 2\ngrep: a.ts: No such file or directory"
		);

		// Act and Assert
		expect(isZeroCount("grep -c TODO a.ts", failure)).toBe(false);
		expect(isZeroCount("grep -c TODO a.ts", failed("Exit code 1\n3"))).toBe(
			false
		);
		expect(isZeroCount("grep TODO a.ts", failed("Exit code 1\n0"))).toBe(false);
		expect(
			isZeroCount("grep -c TODO a.ts", {
				text: undefined,
				stdout: "0",
				stderr: undefined
			})
		).toBe(false);
	});
});

describe("missing command through the plugin", () => {
	test("a Bash exit 127 carries the install note, with `just setup` when the recipe exists", async ($, on) => {
		// Arrange
		on("process.run", (_$, e) => ({
			value: {
				exitCode: 0,
				stdout:
					e.argv[0] === "memory_pressure"
						? "System-wide memory free percentage: 50%\n"
						: "setup:\n",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		}));
		on("ui.log", () => ({ value: undefined }));
		on("tool.check", () => ({ decision: "allow" }));
		on("tool.call", { tool: "Bash" }, () => ({
			isError: true,
			result: "Error: Exit code 127",
			text: "Exit code 127\nbash: line 1: jscpd: command not found"
		}));

		// Act
		const r = await $.tool.call({ tool: "Bash", command: "jscpd src" });

		// Assert
		const context = stringsOf(fieldOf(r, "context")) ?? [];
		expect(context).toEqual([missingNote("jscpd", true)]);
	});

	test("without a setup recipe the note names the system package manager", async ($, on) => {
		// Arrange
		on("process.run", (_$, e) => ({
			value: {
				exitCode: e.argv[0] === "just" ? 1 : 0,
				stdout:
					e.argv[0] === "memory_pressure"
						? "System-wide memory free percentage: 50%\n"
						: "",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		}));
		on("ui.log", () => ({ value: undefined }));
		on("tool.check", () => ({ decision: "allow" }));
		on("tool.call", { tool: "Bash" }, () => ({
			isError: true,
			result: "Error: Exit code 127",
			text: "Exit code 127\nbash: line 1: jscpd: command not found"
		}));

		// Act
		const r = await $.tool.call({ tool: "Bash", command: "jscpd src" });

		// Assert
		const context = stringsOf(fieldOf(r, "context")) ?? [];
		expect(context).toEqual([missingNote("jscpd", false)]);
	});

	test("a grep -c zero count carries the zero-matches note", async ($, on) => {
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
			isError: true,
			result: "Error: Exit code 1",
			text: "Exit code 1\n0"
		}));

		// Act
		const r = await $.tool.call({
			tool: "Bash",
			command: "grep -c TODO src/a.ts"
		});

		// Assert
		const context = stringsOf(fieldOf(r, "context")) ?? [];
		expect(context).toEqual([GREP_COUNT_NOTE]);
	});
});
