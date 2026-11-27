import { describe, expect, test } from "claude-code/testing";

import { fieldOf } from "../../../shared/field";
import { bashWorld, contextOf } from "./world";

const failed = (text: string) => ({
	isError: true as const,
	result: `Error: ${text}`,
	text
});

describe("notes on a failed call", () => {
	test("a command that is not installed gets a note naming it and `just setup` when the recipe exists", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		world.answer = failed(
			"Exit code 127\nbash: line 1: jscpd: command not found"
		);

		// Act
		const r = await $.tool.call({ tool: "Bash", command: "jscpd src" });

		// Assert
		expect(contextOf(r)).toHaveLength(1);
		expect(contextOf(r)[0]).toContain("jscpd");
		expect(contextOf(r)[0]).toContain("just setup");
		expect(fieldOf(r, "deny")).toBeUndefined();
	});

	test("without a setup recipe the note names the command and does not send the model to `just setup`", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		world.hasSetup = false;
		world.answer = failed(
			"Exit code 127\nbash: line 1: jscpd: command not found"
		);

		// Act
		const r = await $.tool.call({ tool: "Bash", command: "jscpd src" });

		// Assert
		expect(contextOf(r)).toHaveLength(1);
		expect(contextOf(r)[0]).toContain("jscpd");
		expect(contextOf(r)[0]).not.toContain("just setup");
	});

	test("zsh's wording, a bare exit 127 and a missing word in command position all name the command", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		const named = async (command: string, text: string) => {
			world.answer = failed(text);
			return contextOf(await $.tool.call({ tool: "Bash", command }));
		};

		// Act
		const zsh = await named(
			"jscpd src",
			"Exit code 127\nzsh: command not found: jscpd"
		);
		const bare = await named(
			"FOO=1 jscpd src | head",
			"Exit code 127\nsomething odd"
		);
		const noFile = await named(
			"cd x && jscpd .",
			"Exit code 1\nzsh: jscpd: No such file or directory"
		);

		// Assert
		for (const notes of [zsh, bare, noFile]) {
			expect(notes).toHaveLength(1);
			expect(notes[0]).toContain("jscpd");
		}
	});

	test("a missing file, a missing script path and an ordinary failure get no install note", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		const notes = async (command: string, text: string) => {
			world.answer = failed(text);
			return contextOf(await $.tool.call({ tool: "Bash", command }));
		};

		// Act
		const file = await notes(
			"cat notes.md",
			"Exit code 1\ncat: notes.md: No such file or directory"
		);
		const script = await notes(
			"./run.sh",
			"Exit code 127\nbash: ./run.sh: No such file or directory"
		);
		const ordinary = await notes("bun test", "Exit code 1\n3 tests failed");

		// Assert
		expect(file).toEqual([]);
		expect(script).toEqual([]);
		expect(ordinary).toEqual([]);
	});

	test("a successful call whose output only prints 'command not found' gets no install note", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		world.answer = {
			result: {
				stdout:
					"ISSUES-part4.txt:95: zsh: echo: command not found\nlog.txt:3: bash: line 1: jscpd: command not found\n",
				stderr: ""
			}
		};

		// Act
		const r = await $.tool.call({
			tool: "Bash",
			command: "grep -n 'command not found' ISSUES-part4.txt log.txt; echo ---"
		});

		// Assert
		expect(
			contextOf(r).filter((note) => note.includes("not installed"))
		).toEqual([]);
	});

	test("a missing command hidden behind a later `; echo` still gets the install note", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		world.answer = {
			result: {
				stdout: "done\n",
				stderr: "bash: line 1: jscpd: command not found\n"
			}
		};

		// Act
		const r = await $.tool.call({
			tool: "Bash",
			command: "jscpd src; echo done"
		});

		// Assert
		expect(
			contextOf(r).some((note) => note.includes("jscpd is not installed"))
		).toBe(true);
	});

	test("a grep -c that counts zero gets a note that zero matches is not a failure", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		const notes = async (command: string, text: string) => {
			world.answer = failed(text);
			return contextOf(await $.tool.call({ tool: "Bash", command }));
		};

		// Act
		const zero = await notes("grep -c TODO src/a.ts", "Exit code 1\n0");
		const recursive = await notes("grep -rc TODO src", "Exit code 1\n0");
		const long = await notes("grep --count TODO a", "Exit code 1\n0");

		// Assert
		for (const found of [zero, recursive, long]) {
			expect(found).toHaveLength(1);
			expect(found[0]).toContain("grep -c");
		}
	});

	test("a grep that is no zero count gets no note", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		const notes = async (command: string, text: string) => {
			world.answer = failed(text);
			return contextOf(await $.tool.call({ tool: "Bash", command }));
		};

		// Act
		const error = await notes(
			"grep -c TODO a.ts",
			"Exit code 2\ngrep: a.ts: No such file or directory"
		);
		const some = await notes("grep -c TODO a.ts", "Exit code 1\n3");
		const plain = await notes("grep TODO a.ts", "Exit code 1\n0");

		// Assert
		expect(error).toEqual([]);
		expect(some).toEqual([]);
		expect(plain).toEqual([]);
	});

	test("gh pr checks with no check registered gets a note, in stderr or stdout, and is not denied", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		const run = (command: string, stdout: string, stderr: string) => {
			world.answer = { result: { stdout, stderr } };
			return $.tool.call({ tool: "Bash", command });
		};

		// Act
		const inStderr = await run(
			"gh pr checks 12 --watch",
			"",
			"no checks reported on the 'feat/x' branch"
		);
		const inStdout = await run(
			"gh pr create && gh pr checks 12 --watch",
			"no checks reported on the 'x' branch",
			""
		);

		// Assert
		for (const r of [inStderr, inStdout]) {
			expect(contextOf(r)).toHaveLength(1);
			expect(contextOf(r)[0]).toContain("gh pr checks");
			expect(fieldOf(r, "deny")).toBeUndefined();
		}
	});

	test("listed checks, another gh command, and an echo of the text get no checks note", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		const run = async (command: string, stdout: string, stderr: string) => {
			world.answer = { result: { stdout, stderr } };
			return contextOf(await $.tool.call({ tool: "Bash", command }));
		};
		const quiet = "no checks reported on the 'feat/x' branch";

		// Act
		const listed = await run("gh pr checks 12", "build\tpass\t1m", "");
		const other = await run("gh pr view 12", "", quiet);
		const echoed = await run("echo gh pr checks", "", quiet);

		// Assert
		expect(listed).toEqual([]);
		expect(other).toEqual([]);
		expect(echoed).toEqual([]);
	});

	test("a model call stopped for a missing API key gets a note to use claude -p, and is not denied", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		const run = (stderr: string) => {
			world.answer = {
				isError: true,
				text: `Exit code 2\n${stderr}`,
				result: { stdout: "", stderr }
			};
			return $.tool.call({ tool: "Bash", command: "node summarize.js" });
		};

		// Act
		const unset = await run("ANTHROPIC_API_KEY is not set");
		const missing = await run(
			"Error: Missing environment variable ANTHROPIC_API_KEY"
		);
		const header = await run(
			'{"type":"error","error":{"message":"x-api-key header is required"}}'
		);

		// Assert
		for (const r of [unset, missing, header]) {
			expect(contextOf(r).some((n) => n.includes("claude -p"))).toBe(true);
			expect(fieldOf(r, "deny")).toBeUndefined();
		}
	});

	test("output that only names the key variable, or an unrelated failure, gets no API key note", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		const run = async (stderr: string) => {
			world.answer = {
				isError: true,
				text: `Exit code 2\n${stderr}`,
				result: { stdout: "", stderr }
			};
			return contextOf(
				await $.tool.call({ tool: "Bash", command: "node summarize.js" })
			);
		};

		// Act
		const loaded = await run("ANTHROPIC_API_KEY=sk-redacted loaded");
		const summary = await run("summary: ship v2 on Friday");

		// Assert
		expect(loaded).toEqual([]);
		expect(summary).toEqual([]);
	});
});
