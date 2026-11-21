import { describe, expect, test } from "claude-code/testing";

import { fieldOf, stringsOf } from "../../../shared/field";
import { NOTE_LIMIT, shellNotes } from "../notes";

const bash = { isBackground: false, isZsh: false };
const background = { isBackground: true, isZsh: false };
const zsh = { isBackground: false, isZsh: true };

describe("shell notes", () => {
	test("a background command ending in `; echo` without $? hides the exit code", () => {
		// Arrange
		const hidden = "sleep 5; echo done";
		const shown = 'sleep 5; echo "exit=$?"';

		// Act and Assert
		expect(shellNotes(hidden, background)).toHaveLength(1);
		expect(shellNotes(shown, background)).toEqual([]);
		expect(shellNotes(hidden, bash)).not.toContain(
			expect.stringContaining("background")
		);
	});

	test("a check piped into a filter suggests pipefail, and pipefail silences it", () => {
		// Arrange
		const piped = "bun test 2>&1 | tail -5";
		const safe = "set -o pipefail; bun test 2>&1 | tail -5";

		// Act
		const notes = shellNotes(piped, bash);

		// Assert
		expect(notes).toHaveLength(1);
		expect(notes[0]).toContain("pipefail");
		expect(shellNotes(safe, bash)).toEqual([]);
	});

	test("a check chained by `;` suggests &&, and `&&` or a trailing $? echo stay quiet", () => {
		// Arrange and Act
		const chained = shellNotes("just lint; git status", bash);

		// Assert
		expect(chained).toHaveLength(1);
		expect(chained[0]).toContain("&&");
		expect(shellNotes("just lint && git status", bash)).toEqual([]);
		expect(shellNotes('just lint; echo "exit=$?"', bash)).toEqual([]);
		expect(shellNotes('git commit -m "fix test"; git status', bash)).toEqual(
			[]
		);
	});

	test("an unquoted zsh variable holding spaces names the split form and an array", () => {
		// Arrange
		const command = 'files="a.ts b.ts"; wc -l $files';
		// An escaped template: a plain string with a dollar-brace reads as a broken template to lint.
		const split = `\${=files}`;

		// Act
		const notes = shellNotes(command, zsh);

		// Assert
		expect(notes).toHaveLength(1);
		expect(notes[0]).toContain(split);
		expect(shellNotes(command, bash)).toEqual([]);
		expect(shellNotes(`files="a.ts b.ts"; wc -l ${split}`, zsh)).toEqual([]);
		expect(shellNotes('files="a.ts b.ts"; wc -l "$files"', zsh)).toEqual([]);
	});

	test("each note stays within the length limit", () => {
		// Arrange
		const command = 'x="a b"; just test | tail; just lint; ls $x; echo done';

		// Act
		const notes = [
			...shellNotes(command, { isBackground: true, isZsh: true }),
			...shellNotes("just lint; ls", bash)
		];

		// Assert
		expect(notes.length).toBeGreaterThan(1);
		for (const note of notes) {
			expect(note.length).toBeLessThanOrEqual(NOTE_LIMIT);
		}
	});

	test("a Bash call through the plugin carries the note beside its result", async ($, on) => {
		// Arrange
		// The memory guard reads free memory through process.run on every Bash call.
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
		on("tool.call", { tool: "Bash" }, () => ({ result: "ok" }));

		// Act
		const r = await $.tool.call({
			tool: "Bash",
			command: "bun test 2>&1 | tail -3"
		});

		// Assert
		const context = stringsOf(fieldOf(r, "context")) ?? [];
		expect(context.some((line) => line.includes("pipefail"))).toBe(true);
	});
});
