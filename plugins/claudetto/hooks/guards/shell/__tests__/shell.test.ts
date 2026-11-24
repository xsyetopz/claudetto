import { describe, expect, test } from "claude-code/testing";

import { guardCommand } from "../shell";

describe("shell guard", () => {
	test("a Bash call reaches the tool with every guard applied", async ($, on) => {
		// Arrange: the plugin registers its own hooks; this stub stands in for the tool.
		on("process.run", () => ({
			value: {
				exitCode: 0,
				stdout: "System-wide memory free percentage: 50%\n",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		}));
		on("tool.check", () => ({ decision: "allow" }));
		// The commit trailer guard reads these on every commit; unset, the builtin git block is on and it stands aside.
		on("env.get", () => ({ value: undefined }));
		on("settings.read", () => ({ value: {} }));
		const seen: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") {
				seen.push(e.command);
			}
			return { result: "ok" };
		});

		// Act
		await $.tool.call({
			tool: "Bash",
			command: "bun test | tail -3 && git commit -m x"
		});

		// Assert
		expect(seen).toEqual([
			guardCommand("bun test | tail -3 && git commit -m x", 30)
		]);
	});

	test("a command that needs approval reaches the tool as the model wrote it", async ($, on) => {
		// Arrange
		// The guard's own query carries no call ID; the engine's check of the call does.
		on("tool.check", (_$, e) => ({
			decision: e.tool_use_id === undefined ? "ask" : "allow"
		}));
		on("process.run", () => ({
			value: {
				exitCode: 0,
				stdout: "System-wide memory free percentage: 50%\n",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		}));
		const seen: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") {
				seen.push(e.command);
			}
			return { result: "ok" };
		});

		// Act
		await $.tool.call({ tool: "Bash", command: "curl -s example.com" });

		// Assert
		expect(seen).toEqual(["curl -s example.com"]);
	});

	test("a command that names git gets no stdin line and no watchdog, so the worktree guard can verify it", () => {
		// Arrange: Claude Code refuses a git command in a worktree-isolated agent unless it parses as a plain list with no interpreter ahead of git.

		// Act and Assert
		expect(guardCommand("git status", 30)).toBe("git status");
		expect(guardCommand("cd sub && git log -1", 30)).toBe(
			"cd sub && git log -1"
		);
		expect(guardCommand("git commit -m x", 30)).toBe(
			"set -o pipefail\ngit commit -m x"
		);
	});

	test("a limit of 0 leaves the watchdog out", () => {
		// Act and Assert
		expect(guardCommand("ls", 0)).toBe("exec </dev/null\nls");
	});

	test("a wrapped command holds no brace group, so Claude Code can split it and a hook's `if` rule filters", () => {
		// Act
		const wrapped = guardCommand("sed -n 1p f", 30);

		// Assert: a brace group makes the parser give up, and a hook then runs for every call.
		expect(wrapped).not.toMatch(/^\s*\{|\}\s*(?:<|$)/mu);
		expect(wrapped).toEndWith("\nsed -n 1p f");
		expect(wrapped).not.toContain("(exit");
	});

	test("a deny of a PreToolUse hook stands over the remembered allow", async ($, on) => {
		// Arrange: the stub beneath the guard answers as the engine does for a denying hook.
		on("tool.check", (_$, e) =>
			e.tool_use_id === undefined
				? { decision: "allow" }
				: { decision: "deny", reason: "no", hook: "PreToolUse" }
		);
		on("process.run", () => ({
			value: {
				exitCode: 0,
				stdout: "System-wide memory free percentage: 50%\n",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		}));
		// Act
		const r = await $.tool.call({ tool: "Bash", command: "ls" });

		// Assert: the engine refuses the wrapped call and names the hook.
		expect(r).toMatchObject({ isError: true });
		expect(r.text).toContain("PreToolUse hook");
	});
});
