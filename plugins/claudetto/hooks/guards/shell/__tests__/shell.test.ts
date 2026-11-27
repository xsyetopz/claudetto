import { describe, expect, test, type TestBody } from "claude-code/testing";

import { bashWorld } from "./world";

type Dollar = Parameters<TestBody>[0];
type Mocks = Parameters<TestBody>[1];

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

	test("a command that reads stdin reaches the tool with stdin at /dev/null, so it ends at EOF", async ($, on) => {
		// Arrange
		const world = bashWorld(on);

		// Act
		await $.tool.call({ tool: "Bash", command: "wc -l" });

		// Assert
		expect(world.seen).toHaveLength(1);
		const [run = ""] = world.seen;
		expect(run.indexOf("</dev/null")).toBeGreaterThanOrEqual(0);
		expect(run.indexOf("</dev/null")).toBeLessThan(run.indexOf("wc -l"));
	});

	test("a Gradle or Maven run reaches the tool with the sandbox proxy handed to the JVM; other commands get none", async ($, on) => {
		// Arrange
		const world = bashWorld(on);

		// Act
		await $.tool.call({ tool: "Bash", command: "./gradlew build" });
		await $.tool.call({ tool: "Bash", command: "CI=1 mvn -q package" });
		await $.tool.call({ tool: "Bash", command: "bun test" });

		// Assert
		const [gradle = "", maven = "", other = ""] = world.seen;
		for (const run of [gradle, maven]) {
			expect(run).toContain("GRADLE_OPTS");
			expect(run).toContain("MAVEN_ARGS");
			expect(run).toContain("HTTPS_PROXY");
		}
		expect(other).toContain("bun test");
		expect(other).not.toContain("GRADLE_OPTS");
		expect(other).not.toContain("MAVEN_ARGS");
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

	const FULL = "7e2d3626b0b3318cce4646f93662990a4999e7de";

	/** The command a `gh run list --commit 7e2d3626b` call reaches the Bash tool as; `resolves` says whether git finds the commit. */
	const ranAs = async (
		$: Dollar,
		on: Mocks,
		resolves: boolean
	): Promise<string | undefined> => {
		on("process.run", () => ({
			value: {
				exitCode: resolves ? 0 : 1,
				stdout: resolves ? `${FULL}\n` : "",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		}));
		on("tool.check", () => ({ decision: "allow" }));
		const seen: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") {
				seen.push(e.command);
			}
			return { result: "ok" };
		});
		await $.tool.call({
			tool: "Bash",
			command: "gh run list --commit 7e2d3626b -L 1"
		});
		return seen[0];
	};

	test("GUARDS-090 a gh run list filter on a short commit SHA reaches the tool with the full SHA", async ($, on) => {
		// Act
		const command = await ranAs($, on, true);

		// Assert
		expect(command).toContain(`gh run list --commit ${FULL} -L 1`);
	});

	test("GUARDS-090 a short SHA git does not resolve reaches the tool as written", async ($, on) => {
		// Act
		const command = await ranAs($, on, false);

		// Assert
		expect(command).toContain("gh run list --commit 7e2d3626b -L 1");
	});
});
