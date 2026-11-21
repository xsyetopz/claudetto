import { describe, expect, test } from "claude-code/testing";

import { helpNote, helpNotes, newHelpState } from "../help";

describe("REQ-REPLY-149 help before flags", () => {
	test("notes flags of a subcommand with no help read", () => {
		// Arrange
		const state = newHelpState();

		// Act
		const notes = helpNotes("gh pr checks --watch --interval 20", state);

		// Assert
		expect(notes).toEqual([helpNote("gh pr checks")]);
	});

	test("notes once per CLI and subcommand", () => {
		// Arrange
		const state = newHelpState();
		helpNotes("gh pr merge --merge", state);

		// Act
		const again = helpNotes("gh pr merge --squash", state);
		const other = helpNotes("gh pr create --fill", state);

		// Assert
		expect(again).toEqual([]);
		expect(other).toEqual([helpNote("gh pr create")]);
	});

	test("a help read of the same subcommand silences the note", () => {
		// Arrange
		const forms = [
			"gh pr merge --help",
			"gh pr merge -h",
			"gh help pr merge",
			"man gh-pr-merge"
		];

		for (const form of forms) {
			// Act
			const state = newHelpState();
			helpNotes(form, state);

			// Assert
			expect(helpNotes("gh pr merge --merge", state)).toEqual([]);
		}
	});

	test("help and use in one command count in order", () => {
		// Arrange
		const state = newHelpState();

		// Act
		const notes = helpNotes(
			"git commit --help | head -5 && git commit --amend",
			state
		);

		// Assert
		expect(notes).toEqual([]);
	});

	test("man of the CLI covers its subcommands", () => {
		// Arrange
		const state = newHelpState();
		helpNotes("man git", state);

		// Act
		const notes = helpNotes("git rebase --onto a b", state);

		// Assert
		expect(notes).toEqual([]);
	});

	test("a help read of another subcommand does not cover this one", () => {
		// Arrange
		const state = newHelpState();
		helpNotes("git commit --help", state);

		// Act
		const notes = helpNotes("git -C repo push --force-with-lease", state);

		// Assert
		expect(notes).toEqual([helpNote("git push")]);
	});

	test("a call with no flags and CLIs of one-word depth", () => {
		// Arrange
		const state = newHelpState();

		// Act
		const plain = helpNotes("gh pr list", state);
		const just = helpNotes("just --list", state);
		const bun = helpNotes("FOO=1 bun build --minify src/a.ts", state);

		// Assert
		expect(plain).toEqual([]);
		expect(just).toEqual([helpNote("just")]);
		expect(bun).toEqual([helpNote("bun build")]);
	});

	test("exempt POSIX tools and quoted dashes get no note", () => {
		// Arrange
		const state = newHelpState();

		// Act
		const notes = helpNotes(
			'ls -la && grep -rn foo . | head -5; rm -rf x; echo "--flag" && git rebase -i "-x"',
			state
		);

		// Assert
		expect(notes).toEqual([helpNote("git rebase")]);
	});

	test("common subcommands and tools get no note, rare ones do", () => {
		// Arrange
		const state = newHelpState();

		// Act
		const common = helpNotes(
			'git status -s && git commit -am "x" && git log --oneline -5 && git -C r diff --stat && curl -sS u | jq -r .a && bun test --bail && tar -xzf a.tgz',
			state
		);
		const rare = helpNotes(
			"git rebase --onto a b && git worktree add -b x y && git push --force-with-lease && gh pr merge --merge && docker run --rm x",
			state
		);

		// Assert
		expect(common).toEqual([]);
		expect(rare).toEqual([
			helpNote("git rebase"),
			helpNote("git worktree"),
			helpNote("git push"),
			helpNote("gh pr merge"),
			helpNote("docker run")
		]);
	});

	test("each note stays within 200 characters", () => {
		expect(helpNote("claude plugin validate").length).toBeLessThanOrEqual(200);
	});

	test("the hook adds the note as context and only once", async ($, on) => {
		// Arrange
		// The plugin registers its own hooks; these stubs stand in for the tool and the engine.
		on("process.run", () => ({
			value: {
				exitCode: 0,
				stdout: "",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		}));
		on("tool.check", () => ({ decision: "allow" }));
		on("env.get", () => ({ value: undefined }));
		on("settings.read", () => ({ value: {} }));
		on("ui.log", () => ({ value: undefined }));
		on("tool.call", { tool: "Bash" }, () => ({ result: "ok" }));

		// Act
		const first = await $.tool.call({
			tool: "Bash",
			command: "gh pr merge --merge"
		});
		const second = await $.tool.call({
			tool: "Bash",
			command: "gh pr merge --squash"
		});

		// Assert
		expect(JSON.stringify(first)).toContain(helpNote("gh pr merge"));
		expect(JSON.stringify(second)).not.toContain("no `gh pr merge --help`");
	});
});
