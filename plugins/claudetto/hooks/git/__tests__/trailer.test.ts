import type { On } from "claude-code";
import { describe, type Engine, expect, test } from "claude-code/testing";

import { inOrder } from "../../guards/__tests__/in-order";

const LINE = "Co-Authored-By: Claude <noreply@anthropic.com>";

/** Stands in for the engine's settings and env, and records each command that ran; a null env fails every read. */
const engine = (
	on: On,
	settings: Record<string, unknown>,
	env: Record<string, string> | null = {}
) => {
	const ran: string[] = [];
	on("settings.read", () => ({ value: settings }));
	on("env.get", (_$, e) => {
		if (env === null) {
			throw new Error("env unavailable");
		}
		return { value: env[e.name] };
	});
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
	on("tool.call", { tool: "Bash" }, (_$, e) => {
		if (e.tool === "Bash") {
			ran.push(e.command);
		}
		return { result: "ok" };
	});
	return ran;
};

/** Sends each command through the plugin and reports whether the Bash tool received it. */
const reached = (
	$: Engine,
	ran: string[],
	commands: readonly string[]
): Promise<boolean[]> =>
	inOrder(commands, async (command) => {
		ran.length = 0;
		await $.tool.call({ tool: "Bash", command }).catch(() => null);
		return ran.some((seen) => seen.includes(command));
	});

describe("commit trailer check", () => {
	test("a scripted commit pair that leaves the line out is refused, the dogfood case of issue #70", async ($, on) => {
		// Arrange
		const ran = engine(on, {
			includeGitInstructions: false,
			attribution: { commit: LINE }
		});
		const command = `git switch -c side\nperl -pi -e 's/a/b/' README.md\ngit commit -q -am "Retitle on side"\ngit switch -q main\ngit commit -q -am "Retitle on main"`;

		// Act
		const outcomes = await reached($, ran, [command]);

		// Assert
		expect(outcomes).toEqual([false]);
	});

	test("each commit carrying the line in a last -m or a here-document runs", async ($, on) => {
		// Arrange
		const ran = engine(on, {
			includeGitInstructions: false,
			attribution: { commit: LINE }
		});

		// Act
		const outcomes = await reached($, ran, [
			`git commit -m "Fix" -m "${LINE}"`,
			`git commit -q -am "One\n\n${LINE}" && git commit -m "Two" -m "${LINE}"`,
			`git commit -F - <<'EOF'\nFix\n\n${LINE}\nEOF`,
			`git -C repo commit -m"Fix" -m "${LINE}"`
		]);

		// Assert
		expect(outcomes).toEqual([true, true, true, true]);
	});

	test("one commit of two without the line is refused", async ($, on) => {
		// Arrange
		const ran = engine(on, {
			includeGitInstructions: false,
			attribution: { commit: LINE }
		});

		// Act
		const outcomes = await reached($, ran, [
			`git commit -m "One" -m "${LINE}"; git commit -m "Two"`
		]);

		// Assert
		expect(outcomes).toEqual([false]);
	});

	test("a commit with no message in the command, or one reusing a message, runs", async ($, on) => {
		// Arrange
		const ran = engine(on, {
			includeGitInstructions: false,
			attribution: { commit: LINE }
		});

		// Act
		const outcomes = await reached($, ran, [
			"git commit",
			"git commit -F msg.txt",
			"git commit --amend --no-edit",
			"git commit --fixup HEAD~1",
			"git commit-tree HEAD^{tree} -m x",
			"git log --grep commit -m"
		]);

		// Assert
		expect(outcomes).toEqual([true, true, true, true, true, true]);
	});

	test("every line of a multi-line attribution is required", async ($, on) => {
		// Arrange
		const ran = engine(on, {
			includeGitInstructions: false,
			attribution: { commit: "Assisted-by: X\n\nSigned-off-by: Y" }
		});

		// Act
		const outcomes = await reached($, ran, [
			`git commit -m "Fix" -m "Assisted-by: X"`,
			`git commit -m "Fix" -m "Assisted-by: X\n\nSigned-off-by: Y"`
		]);

		// Assert
		expect(outcomes).toEqual([false, true]);
	});
});

describe("commit trailer guard", () => {
	test("refuses a commit without the line before it runs and names the line to add", async ($, on) => {
		// Arrange
		const ran = engine(on, {
			includeGitInstructions: false,
			attribution: { commit: LINE }
		});

		// Act
		const result = await $.tool
			.call({ tool: "Bash", command: `git commit -am "Fix"` })
			.catch((error: unknown) => error);

		// Assert
		expect(ran).toEqual([]);
		expect(JSON.stringify(result)).toContain(LINE);
	});

	test("runs a commit that carries the line", async ($, on) => {
		// Arrange
		const ran = engine(on, {
			includeGitInstructions: false,
			attribution: { commit: LINE }
		});

		// Act
		await $.tool.call({
			tool: "Bash",
			command: `git commit -m "Fix" -m "${LINE}"`
		});

		// Assert
		expect(ran.some((command) => command.includes("git commit"))).toBe(true);
	});

	test("a failed settings read lets the commit run with the shell guards still applied", async ($, on) => {
		// Arrange
		const ran = engine(
			on,
			{ includeGitInstructions: false, attribution: { commit: LINE } },
			null
		);
		on("ui.log", () => ({ value: undefined }));
		const command = "bun test | tail -3 && git commit -m x";

		// Act
		await $.tool.call({ tool: "Bash", command });

		// Assert
		expect(ran).toHaveLength(1);
		expect(ran[0]).toContain(command);
		expect(ran[0]).toContain("pipefail");
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
