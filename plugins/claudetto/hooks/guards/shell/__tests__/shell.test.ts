import { describe, expect, test } from "claude-code/testing";

import { bashWorld } from "./bash-world";

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
		expect(seen).toHaveLength(1);
		expect(seen[0]).toContain("bun test | tail -3 && git commit -m x");
		expect(seen[0]).toContain("pipefail");
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

	test("a command that names git reaches the tool as a plain list, so the worktree guard can verify it", async ($, on) => {
		// Arrange: Claude Code refuses a git command in a worktree-isolated agent unless it parses as a plain list.
		const world = bashWorld(on);

		// Act
		await $.tool.call({ tool: "Bash", command: "git status" });
		await $.tool.call({ tool: "Bash", command: "cd sub && git log -1" });

		// Assert
		expect(world.seen).toEqual(["git status", "cd sub && git log -1"]);
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
