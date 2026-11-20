import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { guardCommand } from "../../guards/shell/shell";
import { lacksTrailer, trailerLines } from "../trailer";

const LINE = "Co-Authored-By: Claude <noreply@anthropic.com>";

/** Stands in for the engine's settings and env, and records each command that ran; a null env fails every read. */
const engine = (on: On, settings: Record<string, unknown>, env: Record<string, string> | null = {}) => {
	const ran: string[] = [];
	on("settings.read", () => ({ value: settings }) as never);
	on("env.get", (_$, e) => {
		if (env === null) throw new Error("env unavailable");
		return { value: env[e.name] } as never;
	});
	on("process.run", () => ({ value: { exitCode: 0, stdout: "", stderr: "", isStdoutTruncated: false, isStderrTruncated: false } }) as never);
	on("tool.check", () => ({ decision: "allow" }) as never);
	on("tool.call", { tool: "Bash" }, (_$, e) => {
		if (e.tool === "Bash") ran.push(e.command);
		return { result: "ok" } as never;
	});
	return ran;
};

describe("commit trailer check", () => {
	test("a scripted commit pair that leaves the line out is caught, the dogfood case of issue #70", () => {
		// Arrange
		const command = `git switch -c side\nperl -pi -e 's/a/b/' README.md\ngit commit -q -am "Retitle on side"\ngit switch -q main\ngit commit -q -am "Retitle on main"`;

		// Act
		const lacks = lacksTrailer(command, [LINE]);

		// Assert
		expect(lacks).toBe(true);
	});

	test("each commit carrying the line in a last -m or a here-document passes", () => {
		// Arrange
		const commands = [
			`git commit -m "Fix" -m "${LINE}"`,
			`git commit -q -am "One\n\n${LINE}" && git commit -m "Two" -m "${LINE}"`,
			`git commit -F - <<'EOF'\nFix\n\n${LINE}\nEOF`,
			`git -C repo commit -m"Fix" -m "${LINE}"`,
		];

		// Act
		const lacks = commands.map((command) => lacksTrailer(command, [LINE]));

		// Assert
		expect(lacks).toEqual([false, false, false, false]);
	});

	test("one commit of two without the line is caught", () => {
		// Act
		const lacks = lacksTrailer(`git commit -m "One" -m "${LINE}"; git commit -m "Two"`, [LINE]);

		// Assert
		expect(lacks).toBe(true);
	});

	test("a commit with no message in the command, or one reusing a message, is let through", () => {
		// Arrange
		const commands = ["git commit", "git commit -F msg.txt", "git commit --amend --no-edit", "git commit --fixup HEAD~1", "git commit-tree HEAD^{tree} -m x", "git log --grep commit -m"];

		// Act
		const lacks = commands.map((command) => lacksTrailer(command, [LINE]));

		// Assert
		expect(lacks).toEqual([false, false, false, false, false, false]);
	});

	test("every line of a multi-line attribution is required", () => {
		// Arrange
		const lines = trailerLines({ commit: "Assisted-by: X\n\nSigned-off-by: Y" });

		// Act
		const lacks = lacksTrailer(`git commit -m "Fix" -m "Assisted-by: X"`, lines);

		// Assert
		expect(lines).toEqual(["Assisted-by: X", "Signed-off-by: Y"]);
		expect(lacks).toBe(true);
	});
});

describe("commit trailer guard", () => {
	test("refuses a commit without the line before it runs and names the line to add", async ($, on) => {
		// Arrange
		const ran = engine(on, { includeGitInstructions: false, attribution: { commit: LINE } });

		// Act
		const result = await $.tool.call({ tool: "Bash", command: `git commit -am "Fix"` }).catch((error: unknown) => error);

		// Assert
		expect(ran).toEqual([]);
		expect(JSON.stringify(result)).toContain(`-m \\"${LINE}\\"`);
	});

	test("runs a commit that carries the line", async ($, on) => {
		// Arrange
		const ran = engine(on, { includeGitInstructions: false, attribution: { commit: LINE } });

		// Act
		await $.tool.call({ tool: "Bash", command: `git commit -m "Fix" -m "${LINE}"` });

		// Assert
		expect(ran.some((command) => command.includes("git commit"))).toBe(true);
	});

	test("a failed settings read lets the commit run with the shell guards still applied", async ($, on) => {
		// Arrange
		const ran = engine(on, { includeGitInstructions: false, attribution: { commit: LINE } }, null);
		on("ui.log", () => ({ value: undefined }) as never);
		const command = "bun test | tail -3 && git commit -m x";

		// Act
		await $.tool.call({ tool: "Bash", command });

		// Assert
		expect(ran).toEqual([guardCommand(command, 30)]);
	});

	test("leaves commits alone when the builtin git block is on", async ($, on) => {
		// Arrange
		const ran = engine(on, { attribution: { commit: LINE } });

		// Act
		await $.tool.call({ tool: "Bash", command: `git commit -am "Fix"` });

		// Assert
		expect(ran.some((command) => command.includes("git commit"))).toBe(true);
	});
});
