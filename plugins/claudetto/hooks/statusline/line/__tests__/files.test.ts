import { describe, expect, test } from "claude-code/testing";

import { branchOf, type Reader } from "../branch";
import { statusWithFiles } from "../main";
import { type LiveState, readState, statePath, writeState } from "../state";

const filesOf =
	(files: Record<string, string>): Reader =>
	(path) =>
		Promise.resolve(files[path]);

describe("state file", () => {
	test("round-trips phase, the waiting prompt, agents, tool calls and tasks", () => {
		// Arrange
		const state: LiveState = {
			phase: "working",
			waiting: { kind: "question", tool: "AskUserQuestion" },
			agents: [
				{
					id: "a",
					type: "Explore",
					description: "d",
					startedAt: 5,
					tools: 2,
					doing: "Read x"
				}
			],
			finished: [
				{
					id: "b",
					type: "Plan",
					description: "",
					startedAt: 1,
					tools: 0,
					endedAt: 4,
					end: "failed"
				}
			],
			tools: 7,
			doing: "Bash ls",
			tasks: [
				{ id: "1", subject: "s", status: "in_progress", active: "Doing s" }
			]
		};

		// Act and Assert
		expect(readState(writeState(state))).toEqual(state);
	});

	test("reads a missing, broken or foreign file as no state", () => {
		// Act and Assert
		expect(readState("")).toBeUndefined();
		expect(readState("{")).toBeUndefined();
		expect(readState('{"waitingKind":"bogus"}')?.waiting).toBeUndefined();
	});

	test("reads a file an older version wrote, with no tool count or tasks", () => {
		// Act and Assert
		expect(
			readState('{"phase":"idle","agents":[{"id":"a","startedAt":1}]}')
		).toEqual({
			phase: "idle",
			agents: [
				{ id: "a", type: "agent", description: "", startedAt: 1, tools: 0 }
			],
			finished: [],
			tools: 0,
			tasks: []
		});
	});

	test("keeps a session id from leaving the status folder", () => {
		// Act and Assert
		expect(statePath("/cfg", "../../etc/x")).toBe(
			"/cfg/claudetto/status/.._.._etc_x.json"
		);
	});
});

describe("branch", () => {
	test("reads the branch from HEAD of the folder or a parent", async () => {
		// Arrange
		const read = filesOf({ "/r/.git/HEAD": "ref: refs/heads/feat/x\n" });

		// Act and Assert
		expect(await branchOf("/r/sub/dir", read)).toBe("feat/x");
	});

	test("follows a worktree's .git file and shortens a detached hash", async () => {
		// Arrange
		const read = filesOf({
			"/w/.git": "gitdir: /r/.git/worktrees/w\n",
			"/r/.git/worktrees/w/HEAD": `${"ab12".repeat(10)}\n`
		});

		// Act and Assert
		expect(await branchOf("/w", read)).toBe("ab12ab1");
	});

	test("is undefined outside a repository", async () => {
		// Act and Assert
		expect(await branchOf("/nowhere", filesOf({}))).toBeUndefined();
	});
});

describe("status from files", () => {
	test("reads the session's state file under the config folder and the branch under the project", async () => {
		// Arrange
		const read = filesOf({
			[statePath("/cfg", "s1")]: '{"phase":"working","agents":[]}',
			"/p/.git/HEAD": "ref: refs/heads/main"
		});
		const raw = JSON.stringify({
			session_id: "s1",
			workspace: { project_dir: "/p" }
		});

		// Act
		const out = await statusWithFiles(
			raw,
			{ NO_COLOR: "1", CLAUDE_CONFIG_DIR: "/cfg" },
			0,
			read
		);

		// Assert
		expect(out).toBe("● working\n⌂ p · ⎇ main");
	});

	test("takes the theme from the nearest settings file before the global config", async () => {
		// Arrange
		const read = filesOf({
			"/p/.claude/settings.json": '{"theme":"light-ansi"}',
			"/h/.claude.json": '{"theme":"dark"}'
		});
		const raw = JSON.stringify({
			model: { display_name: "Opus 5.5" },
			workspace: { project_dir: "/p" }
		});

		// Act
		const out = await statusWithFiles(
			raw,
			{ HOME: "/h", COLORTERM: "truecolor" },
			0,
			read
		);

		// Assert: light-ansi paints the model in a palette slot, never in truecolor.
		expect(out).toContain("Opus 5.5");
		expect(out).not.toContain("38;2;");
	});

	test("adds the machine's figures the probe returns, and draws without them when it fails", async () => {
		// Arrange
		const raw = '{"model":{"display_name":"Opus 5.5"}}';
		const env = { NO_COLOR: "1" };

		// Act
		const shown = await statusWithFiles(raw, env, 0, filesOf({}), () =>
			Promise.resolve({ load: 2, cores: 8 })
		);
		const failed = await statusWithFiles(raw, env, 0, filesOf({}), () =>
			Promise.reject(new Error("ps"))
		);

		// Assert
		expect(shown).toBe("Opus 5.5\nload 2.0/8");
		expect(failed).toBe("Opus 5.5");
	});
});
