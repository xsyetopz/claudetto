import { describe, expect, test } from "claude-code/testing";

import { fieldOf } from "../../../shared/field";
import { bashWorld, contextOf } from "./world";

describe("notes on a command that hides its failure", () => {
	test("a check piped into a filter gets a pipefail note, and pipefail silences it", async ($, on) => {
		// Arrange
		bashWorld(on);

		// Act
		const piped = await $.tool.call({
			tool: "Bash",
			command: "bun test 2>&1 | tail -5"
		});
		const safe = await $.tool.call({
			tool: "Bash",
			command: "set -o pipefail; bun test 2>&1 | tail -5"
		});

		// Assert
		expect(contextOf(piped)).toHaveLength(1);
		expect(contextOf(piped)[0]).toContain("pipefail");
		expect(contextOf(safe)).toEqual([]);
	});

	test("a check chained by a semicolon gets an && note, and && or a status echo stay quiet", async ($, on) => {
		// Arrange
		bashWorld(on);
		const run = (command: string) => $.tool.call({ tool: "Bash", command });

		// Act
		const chained = await run("just lint; git status");

		// Assert
		expect(contextOf(chained)).toHaveLength(1);
		expect(contextOf(chained)[0]).toContain("&&");
		expect(contextOf(await run("just lint && git status"))).toEqual([]);
		expect(contextOf(await run('just lint; echo "exit=$?"'))).toEqual([]);
		expect(
			contextOf(await run('git commit -m "fix test"; git status'))
		).toEqual([]);
	});

	test("a commit chained by a semicolon to another commit or a push gets an && note", async ($, on) => {
		// Arrange
		bashWorld(on);
		const run = (command: string) => $.tool.call({ tool: "Bash", command });

		// Act
		const commits = await run(
			'git commit -qm "fix: a" >/dev/null 2>&1; git add b && git commit -qm "chore: b"'
		);
		const push = await run('git commit -m "fix: a"; git push');

		// Assert
		expect(contextOf(commits)).toHaveLength(1);
		expect(contextOf(commits)[0]).toContain("&&");
		expect(contextOf(push)).toHaveLength(1);
		expect(contextOf(await run('git commit -m "fix: a" && git push'))).toEqual(
			[]
		);
	});

	test("a background command ending in an echo gets a note that a foreground one does not", async ($, on) => {
		// Arrange
		bashWorld(on);
		const run = (command: string, background: boolean) =>
			$.tool.call({
				tool: "Bash",
				command,
				run_in_background: background
			});

		// Act
		const hidden = await run("sleep 5; echo done", true);
		const printed = await run('sleep 5; echo "exit=$?"', true);
		const shown = await run("sleep 5; rc=$?; echo done; exit $rc", true);
		const foreground = await run("sleep 5; echo done", false);

		// Assert
		expect(contextOf(hidden).some((n) => n.includes("exit $rc"))).toBe(true);
		expect(contextOf(printed).some((n) => n.includes("exit $rc"))).toBe(true);
		expect(contextOf(shown)).toEqual([]);
		expect(contextOf(foreground)).toEqual([]);
	});

	test("under zsh an unquoted variable holding spaces names the split form; under bash it stays quiet", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		const split = `\${=files}`;
		const run = (command: string) => $.tool.call({ tool: "Bash", command });

		// Act
		world.shell = "/bin/zsh";
		const unquoted = await run('files="a.ts b.ts"; wc -l $files');
		const quoted = await run('files="a.ts b.ts"; wc -l "$files"');
		const splitForm = await run(`files="a.ts b.ts"; wc -l ${split}`);
		world.shell = "/bin/bash";
		const bash = await run('files="a.ts b.ts"; wc -l $files');

		// Assert
		expect(contextOf(unquoted)).toHaveLength(1);
		expect(contextOf(unquoted)[0]).toContain(split);
		expect(contextOf(quoted)).toEqual([]);
		expect(contextOf(splitForm)).toEqual([]);
		expect(contextOf(bash)).toEqual([]);
	});

	test("the command reaches the tool and the result is kept beside the note", async ($, on) => {
		// Arrange
		const world = bashWorld(on);
		world.answer = { result: "ok" };

		// Act
		const r = await $.tool.call({
			tool: "Bash",
			command: "bun test 2>&1 | tail -3"
		});

		// Assert
		expect(r.result).toBe("ok");
		expect(fieldOf(r, "deny")).toBeUndefined();
		expect(world.seen).toHaveLength(1);
	});
});
