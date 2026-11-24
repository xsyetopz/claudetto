import { describe, expect, test } from "claude-code/testing";

import { branchOf, type Reader } from "../branch";
import { statusWithFiles } from "../main";
import { readState, statePath, writeState } from "../state";

const filesOf =
	(files: Record<string, string>): Reader =>
	(path) =>
		Promise.resolve(files[path]);

describe("state file", () => {
	test("round-trips phase, the waiting prompt and the agents", () => {
		// Arrange
		const state = {
			phase: "working" as const,
			waiting: { kind: "question" as const, tool: "AskUserQuestion" },
			agents: [{ id: "a", type: "Explore", description: "d", startedAt: 5 }]
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
		expect(out).toBe("● working\nProject: ⌂ p · ⎇ main");
	});
});
