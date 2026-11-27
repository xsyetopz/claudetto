import { describe, expect, test } from "claude-code/testing";

import type { Reader } from "../branch";
import { statusWithFiles } from "../main";
import { EMPTY_STATE, type LiveState, statePath, writeState } from "../state";

const filesOf =
	(files: Record<string, string>): Reader =>
	(path) =>
		Promise.resolve(files[path]);

/** Draws the status line for a session with the given files, as the status line script does. */
const draw = (
	files: Record<string, string>,
	session: Record<string, unknown> = {}
) =>
	statusWithFiles(
		JSON.stringify({
			session_id: "s1",
			workspace: { project_dir: "/p" },
			...session
		}),
		{ NO_COLOR: "1", CLAUDE_CONFIG_DIR: "/cfg" },
		0,
		filesOf({ [statePath("/cfg", "s1")]: writeState(EMPTY_STATE), ...files })
	);

describe("state file", () => {
	test("a session whose hooks wrote no state file, one without claudetto loaded, draws nothing", async () => {
		// Arrange
		const raw = JSON.stringify({
			session_id: "s1",
			model: { display_name: "Opus 5.5" },
			workspace: { project_dir: "/p" }
		});
		const read = filesOf({ "/p/.git/HEAD": "ref: refs/heads/main" });

		// Act
		const out = await statusWithFiles(
			raw,
			{ NO_COLOR: "1", CLAUDE_CONFIG_DIR: "/cfg" },
			0,
			read
		);

		// Assert
		expect(out).toBe("");
	});

	test("a state file the hooks wrote shows the waiting prompt and tasks", async () => {
		// Arrange
		const state: LiveState = {
			phase: "working",
			waiting: { kind: "question", tool: "AskUserQuestion" },
			tools: 7,
			tasks: [
				{ id: "1", subject: "s", status: "in_progress", active: "Doing s" }
			]
		};

		// Act
		const out = await draw({ [statePath("/cfg", "s1")]: writeState(state) });

		// Assert
		expect(out).toContain("waiting on you: an answer");
		expect(out).toContain("Doing s");
	});

	test("a compaction window below the model's limit is the window the context bar fills", async () => {
		// Arrange
		const state: LiveState = { ...EMPTY_STATE, window: 300_000 };
		const usage = {
			context_window: { used_percentage: 6, context_window_size: 1_000_000 }
		};

		// Act
		const capped = await draw(
			{ [statePath("/cfg", "s1")]: writeState(state) },
			usage
		);
		const plain = await draw({}, usage);

		// Assert
		expect(capped).toContain("20% 60k/300k");
		expect(plain).toContain("6% 60k/1M");
	});

	test("a broken or foreign state file draws as no state", async () => {
		// Act
		const broken = await draw({ [statePath("/cfg", "s1")]: "{" });
		const foreign = await draw({
			[statePath("/cfg", "s1")]: '{"waitingKind":"bogus"}'
		});

		// Assert
		expect(broken).toBe("⌂ p");
		expect(foreign).not.toContain("waiting");
	});

	test("a file an older version wrote, with no tool count or tasks, still draws", async () => {
		// Act
		const out = await draw({
			[statePath("/cfg", "s1")]:
				'{"phase":"idle","agents":[{"id":"a","startedAt":1}]}'
		});

		// Assert
		expect(out).toContain("⌂ p");
	});

	test("a session id cannot make the status line read outside the status folder", async () => {
		// Arrange
		const asked: string[] = [];
		const read: Reader = (path) => {
			asked.push(path);
			return filesOf({})(path);
		};

		// Act
		await statusWithFiles(
			JSON.stringify({ session_id: "../../etc/x" }),
			{ NO_COLOR: "1", CLAUDE_CONFIG_DIR: "/cfg" },
			0,
			read
		);

		// Assert
		expect(asked.some((path) => path.includes("claudetto/status"))).toBe(true);
		expect(asked.filter((path) => path.split("/").includes(".."))).toEqual([]);
	});
});

describe("branch", () => {
	test("shows the branch from HEAD of the project folder or a parent", async () => {
		// Act
		const out = await draw(
			{ "/p/.git/HEAD": "ref: refs/heads/feat/x\n" },
			{ workspace: { project_dir: "/p/sub/dir" } }
		);

		// Assert
		expect(out).toContain("⎇ feat/x");
	});

	test("follows a worktree's .git file and shortens a detached hash", async () => {
		// Act
		const out = await draw({
			"/p/.git": "gitdir: /r/.git/worktrees/w\n",
			"/r/.git/worktrees/w/HEAD": `${"ab12".repeat(10)}\n`
		});

		// Assert
		expect(out).toContain("⎇ ab12ab1");
	});

	test("shows no branch outside a repository", async () => {
		// Act
		const out = await draw({});

		// Assert
		expect(out).not.toContain("⎇");
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
		expect(out).toBe("⌂ p · ⎇ main");
	});

	test("takes the theme from the nearest settings file before the global config", async () => {
		// Arrange
		const read = filesOf({
			[statePath("/h/.claude", "s1")]: writeState(EMPTY_STATE),
			"/p/.claude/settings.json": '{"theme":"light-ansi"}',
			"/h/.claude.json": '{"theme":"dark"}'
		});
		const raw = JSON.stringify({
			session_id: "s1",
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
});
