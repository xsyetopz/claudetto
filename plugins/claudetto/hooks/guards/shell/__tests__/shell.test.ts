import { describe, expect, test } from "claude-code/testing";

import { guardCommand } from "./shell";

describe("shell guard", () => {
	test("a Bash call reaches the tool with every guard applied", async ($, on) => {
		// Arrange: the plugin registers its own hooks; this stub stands in for the tool.
		on("process.run", () => ({ value: { exitCode: 0, stdout: "System-wide memory free percentage: 50%\n", stderr: "", isStdoutTruncated: false, isStderrTruncated: false } }));
		on("tool.check", () => ({ decision: "allow" }) as never);
		const seen: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") seen.push(e.command);
			return { result: "ok" } as never;
		});

		// Act
		await $.tool.call({ tool: "Bash", command: "bun test | tail -3 && git commit -m x" });

		// Assert
		expect(seen).toEqual([guardCommand("bun test | tail -3 && git commit -m x", 30)]);
	});

	test("a command that needs approval reaches the tool as the model wrote it", async ($, on) => {
		// Arrange
		// The guard's own query carries no call ID; the engine's check of the call does.
		on("tool.check", (_$, e) => ({ decision: e.tool_use_id === undefined ? "ask" : "allow" }) as never);
		on("process.run", () => ({ value: { exitCode: 0, stdout: "System-wide memory free percentage: 50%\n", stderr: "", isStdoutTruncated: false, isStderrTruncated: false } }));
		const seen: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") seen.push(e.command);
			return { result: "ok" } as never;
		});

		// Act
		await $.tool.call({ tool: "Bash", command: "curl -s example.com" });

		// Assert
		expect(seen).toEqual(["curl -s example.com"]);
	});

	test("a command that names git gets no stdin group and no watchdog, so the worktree guard can verify it", () => {
		// Arrange: Claude Code refuses a git command in a worktree-isolated agent unless it parses as a plain list with no interpreter ahead of git.

		// Act and Assert
		expect(guardCommand("git status", 30)).toBe("git status");
		expect(guardCommand("cd sub && git log -1", 30)).toBe("cd sub && git log -1");
		expect(guardCommand("git commit -m x", 30)).toBe("set -o pipefail\ngit commit -m x");
	});

	test("a limit of 0 leaves the watchdog out", () => {
		// Act and Assert
		expect(guardCommand("ls", 0)).toBe("{ ls\n} </dev/null");
	});
});
