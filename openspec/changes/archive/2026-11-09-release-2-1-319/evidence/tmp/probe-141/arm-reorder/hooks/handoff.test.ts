import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import { HANDOFF_SECTIONS } from "./handoff/layout.ts";
import { newestHandoff } from "./handoff/read-back.ts";
import { readMessages } from "./handoff/transcript.ts";
import { scanned } from "./secrets.mock.ts";
import { readBackText } from "./texts.ts";

const TRANSCRIPT = "/tmp/transcript.jsonl";

const said = (role: SessionMessage["role"], text: string): SessionMessage => ({
	role,
	text,
	toolUses: [],
});

const human = (text: string): string =>
	JSON.stringify({
		type: "user",
		origin: { kind: "human" },
		message: { content: text },
	});

const longSession = (): SessionMessage[] => [
	said("user", "The staged deletions are mine; never restore them."),
	...Array.from({ length: 15 }, (_, i) => [
		said("assistant", `step ${i}`),
		said("user", `next ${i}`),
	]).flat(),
];

const KEY = `sk-ant-oat01-${"Q7rK2mZx9Lp4Vb8N".repeat(5)}`;

const startup = (on: On): void => {
	on("classic.SessionStart", () => ({}));
	on("session.version", () => ({
		value: {
			version: "2.1.318",
			base: "2.1.318",
			builtAt: "2026-10-30T00:00:00Z",
		},
	}));
	on("env.get", () => ({ value: undefined }));
	mock.store(on, {});
	on("session.id", () => ({ value: "s1" }));
	on(
		"process.run",
		(_$, e) =>
			scanned(e, [KEY]) ?? {
				value: {
					exitCode: 0,
					stdout: "",
					stderr: "",
					isStdoutTruncated: false,
					isStderrTruncated: false,
				},
			},
	);
};

const lab = (on: On, jsonl: string) => {
	const files: { path: string; text: string }[] = [];
	on("session.root", () => ({ value: "/repo" }));
	on("fs.write", (_$, e) => {
		files.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("fs.read", () => ({ value: jsonl }));
	on("ui.log", () => ({ value: undefined }));
	on("session.compact", () => ({ skip: "core ran" }));
	startup(on);
	return files;
};

const compactWith = async ($: Engine, messages: SessionMessage[]) => {
	await $.classic.SessionStart({
		source: "startup",
		transcript_path: TRANSCRIPT,
	});
	await $.session.compact({ trigger: "auto", messages });
};

test("an instruction older than the last twelve turns stays in the handoff", async ($: Engine, on: On) => {
	const files = lab(
		on,
		[
			human("The staged deletions are mine; never restore them."),
			human("go"),
		].join("\n"),
	);

	await compactWith($, longSession());

	const text = files[0]?.text ?? "";
	const standing = text.split("## Standing instructions")[1] ?? "";
	expect(standing.split("## Decisions log")[0]).toContain(
		"The staged deletions are mine",
	);
	expect(text.split("## Current state")[1]).not.toContain("staged deletions");
});

test("a session with no human statement writes no invented text under the two sections", async ($: Engine, on: On) => {
	const files = lab(on, "");

	await compactWith($, [said("user", "hi"), said("assistant", "hello")]);

	const text = files[0]?.text ?? "";
	const standing = text.split("## Standing instructions")[1] ?? "";
	const decisions = text.split("## Decisions log")[1] ?? "";
	expect(standing.split("## Decisions log")[0]?.trim()).toBe(
		"None found in the transcript.",
	);
	expect(decisions.split("## Current state")[0]?.trim()).toBe(
		"None found in the transcript.",
	);
});

test("a key in a statement is redacted in the handoff", async ($: Engine, on: On) => {
	const files = lab(on, human(`use ${KEY} for the eval`));

	await compactWith($, [said("user", "hi")]);

	expect(files[0]?.text).not.toContain(KEY);
});

test("a subagent's compaction writes no handoff", async ($: Engine, on: On) => {
	const files = lab(on, human("go"));

	await $.session.compact({
		trigger: "auto",
		agentId: "a1",
		messages: [said("user", "hi")],
	});

	expect(files).toEqual([]);
});

const readBackLab = (
	on: On,
	age: number,
	faults: { folder?: false; read?: false; submit?: false } = {},
	given: { transcriptMs?: number; body?: string } = {},
) => {
	const clock = mock.clock(on, { now: 8 * 86_400_000 });
	const submitted: string[] = [];
	const lines: string[] = [];
	startup(on);
	on("session.root", () => ({ value: "/repo" }));
	const asked: string[] = [];
	on("fs.exists", (_$, e) => {
		asked.push(e.path);
		return { value: faults.folder ?? true };
	});
	const entries = [
		{
			name: "handoff-2026-01-01T00-00-00.md",
			kind: "file" as const,
			size: 1,
			mtimeMs: 0,
			isLink: false,
		},
		{
			name: "handoff-2026-01-02T00-00-00.md",
			kind: "file" as const,
			size: 1,
			mtimeMs: 8 * 86_400_000 - age,
			isLink: false,
		},
	];
	on("fs.list", (_$, e) => ({
		value:
			e.path === "/tmp"
				? [
						{
							name: "transcript.jsonl",
							kind: "file" as const,
							size: 1,
							mtimeMs: given.transcriptMs ?? 0,
							isLink: false,
						},
					]
				: entries,
	}));
	on("fs.read", () =>
		faults.read === false
			? { deny: "EACCES" }
			: { value: given.body ?? "# Handoff\n\n## Goal\nship" },
	);
	on("prompt.submit", (_$, e) => {
		if (faults.submit === false) {
			throw new Error("prompt.submit is refused in SessionStart");
		}
		submitted.push(e.text);
		return e;
	});
	on("ui.log", (_$, e) => {
		lines.push(e.text);
		return { value: undefined };
	});
	return { clock, submitted, lines, entries, asked };
};

test("a resume reads the newest fresh handoff back once", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000);

	await $.classic.SessionStart({
		source: "resume",
		transcript_path: TRANSCRIPT,
	});
	await lab2.clock.advance(1);
	await $.classic.SessionStart({
		source: "resume",
		transcript_path: TRANSCRIPT,
	});
	await lab2.clock.advance(1);

	expect(lab2.submitted).toHaveLength(1);
	expect(lab2.submitted[0]).toContain("handoff-2026-01-02T00-00-00.md");
});

test("a file newer than the one taken is taken in as well", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000);

	await resume($);
	await lab2.clock.advance(1);
	lab2.entries.push({
		name: "handoff-2026-01-03T00-00-00.md",
		kind: "file",
		size: 1,
		mtimeMs: 8 * 86_400_000 - 1000,
		isLink: false,
	});
	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted).toHaveLength(2);
	expect(lab2.submitted[1]).toContain("handoff-2026-01-03T00-00-00.md");
});

test("a resume of a session whose transcript is newer than the handoff injects nothing", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000, {}, { transcriptMs: 8 * 86_400_000 });

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted).toEqual([]);
});

test("a key in a handoff file is redacted before the read-back injects it", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000, {}, { body: `## Goal\nuse ${KEY}` });

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted[0]).not.toContain(KEY);
	expect(lab2.submitted[0]).toContain("[REDACTED]");
});

test("a handoff older than seven days is named in a log line and not injected", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 8 * 86_400_000);

	await $.classic.SessionStart({
		source: "resume",
		transcript_path: TRANSCRIPT,
	});
	await lab2.clock.advance(1);

	expect(lab2.submitted).toEqual([]);
	expect(lab2.lines.join("\n")).toContain("days old");
});

const KEPT =
	/^\.claude\/claudetto\/handoffs\/handoff-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d\.md$/;

interface World {
	writes: { path: string; text: string }[];
	lines: string[];
}

/** `reads` maps a path to its text; a path it lacks fails to read. */
const world = (
	on: On,
	reads: Record<string, string> = {},
	writeFails = false,
): World => {
	const seen: World = { writes: [], lines: [] };
	on("session.root", () => ({ value: "/repo" }));
	on("fs.write", (_$, e) => {
		if (writeFails) {
			throw new Error("disk full");
		}
		seen.writes.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("fs.read", (_$, e) => {
		const text = reads[e.path];
		if (text === undefined) {
			return { deny: "ENOENT" };
		}
		return { value: text };
	});
	on("ui.log", (_$, e) => {
		if (e.text.includes("andoff")) {
			seen.lines.push(e.text);
		}
		return { value: undefined };
	});
	on("fs.exists", () => ({ value: true }));
	on("session.compact", () => ({ skip: "core ran" }));
	startup(on);
	return seen;
};

const use = (tool: string, input: Record<string, unknown>) => ({
	tool_use_id: `u-${tool}`,
	tool,
	input,
});

const asked = (text: string): SessionMessage[] => [
	said("user", text),
	said("assistant", "ok"),
];

test("session.start registers the handoff tool", async ($: Engine, on: On) => {
	const specs: string[] = [];
	world(on);
	on("tool.register", (_$, e) => {
		specs.push(e.name);
		return { value: { tool: `mcp__claudetto__${e.name}` } };
	});
	on("session.start", () => ({ cwd: "/repo" }));

	await $.session.start({ cwd: "/repo", surface: null, isInteractive: true });

	expect(specs).toContain("handoff");
});

test("a compaction leaves one handoff file named handoff- and a UTC stamp, under the root", async ($: Engine, on: On) => {
	const seen = world(on);

	await compactWith($, asked("fix the gate"));

	expect(seen.writes).toHaveLength(1);
	const path = seen.writes[0]?.path ?? "";
	expect(path.startsWith("/repo/")).toBe(true);
	expect(path.slice("/repo/".length)).toMatch(KEPT);
});

test("a /compact leaves one handoff file", async ($: Engine, on: On) => {
	const seen = world(on);

	await $.session.compact({ trigger: "manual", messages: asked("go") });

	expect(seen.writes).toHaveLength(1);
});

test("a precompute installs nothing, so it leaves no handoff file", async ($: Engine, on: On) => {
	const seen = world(on);

	await $.session.compact({ trigger: "precompute", messages: asked("go") });

	expect(seen.writes).toEqual([]);
});

test("a session with no user turn leaves no file and no error", async ($: Engine, on: On) => {
	const seen = world(on);

	await compactWith($, [said("assistant", "hello")]);

	expect(seen.writes).toEqual([]);
	expect(seen.lines).toEqual([]);
});

test("a write that fails tells the user in one line", async ($: Engine, on: On) => {
	const seen = world(on, {}, true);

	await compactWith($, asked("go"));

	expect(seen.lines).toHaveLength(1);
	expect(seen.lines[0]).toContain("No handoff was written");
});

test("the handoff names the files the session touched, and a call with no path adds none", async ($: Engine, on: On) => {
	const seen = world(on);

	await compactWith($, [
		said("user", "edit it"),
		{
			role: "assistant",
			text: "done",
			toolUses: [
				use("Edit", { file_path: "src/a.ts" }),
				use("Bash", { command: "ls" }),
			],
		},
	]);

	const text = seen.writes[0]?.text ?? "";
	expect(text).toContain("- `src/a.ts`");
	expect(text).not.toContain("git status");
});

test("the handoff carries the user's ask", async ($: Engine, on: On) => {
	const seen = world(on);

	await compactWith($, asked("make the gate quiet"));

	expect(seen.writes[0]?.text).toContain("> make the gate quiet");
});

test("a file Claude wrote is kept and no code-built one goes beside it", async ($: Engine, on: On) => {
	const seen = world(on);

	await compactWith($, [
		said("user", "hand off"),
		{
			role: "assistant",
			text: "",
			toolUses: [
				use("Write", {
					file_path:
						"/repo/.claude/claudetto/handoffs/handoff-2026-01-01T00-00-00.md",
				}),
			],
		},
	]);

	expect(seen.writes).toEqual([]);
});

test("a read of the handoff folder is not writing one, so the fallback still runs", async ($: Engine, on: On) => {
	const seen = world(on);

	await compactWith($, [
		said("user", "go"),
		{
			role: "assistant",
			text: "",
			toolUses: [
				use("Read", {
					file_path:
						"/repo/.claude/claudetto/handoffs/handoff-2026-01-01T00-00-00.md",
				}),
			],
		},
	]);

	expect(seen.writes).toHaveLength(1);
});

const MISNAMED = "/repo/.claude/claudetto/handoffs/notes.md";

const writtenAs = (path: string): SessionMessage[] => [
	said("user", "hand off"),
	{
		role: "assistant",
		text: "",
		toolUses: [use("Write", { file_path: path })],
	},
];

test("a misnamed handoff Claude wrote is copied to a valid name, and one line names both files", async ($: Engine, on: On) => {
	const seen = world(on, { [MISNAMED]: "# Handoff\n\nmine" });

	await compactWith($, writtenAs(MISNAMED));

	expect(seen.writes).toHaveLength(1);
	expect(seen.writes[0]?.text).toBe("# Handoff\n\nmine");
	expect(seen.lines).toHaveLength(1);
	expect(seen.lines[0]).toContain(MISNAMED);
	expect(seen.lines[0]).toContain(".claude/claudetto/handoffs/handoff-");
});

test("a misnamed handoff that cannot be read leaves the code-built file, and one line names it and the cause", async ($: Engine, on: On) => {
	const seen = world(on);

	await compactWith($, writtenAs(MISNAMED));

	expect(seen.writes).toEqual([]);
	expect(seen.lines).toHaveLength(1);
	expect(seen.lines[0]).toContain(MISNAMED);
	expect(seen.lines[0]).toContain("ENOENT");
});

test("the handoff block is the only one added, and the engine's context_management section is left out", async ($: Engine, on: On) => {
	world(on);
	on("prompt.context", () => ({ blocks: [] }));
	on("prompt.section", (_$, e) => ({ text: e.text }));

	const context = await $.prompt.context({ blocks: [] });
	const section = await $.prompt.section({
		name: "context_management",
		text: "engine",
	});

	expect(context.blocks.map((block) => block.name)).toEqual([
		"context_management",
	]);
	expect(context.blocks[0]?.text).toContain("# Handoff");
	expect(context.blocks[0]?.text).toContain(".claude/claudetto/handoffs");
	for (const heading of HANDOFF_SECTIONS) {
		expect(context.blocks[0]?.text).toContain(`## ${heading}`);
	}
	expect(section.text).toBeNull();
});

const resume = ($: Engine) =>
	$.classic.SessionStart({ source: "resume", transcript_path: TRANSCRIPT });

test("a project with no handoff folder yet takes nothing in and shows no error", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000, { folder: false });

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted).toEqual([]);
	expect(lab2.lines).toEqual([]);
});

test("a session that starts fresh takes nothing in", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000);

	await $.classic.SessionStart({
		source: "startup",
		transcript_path: TRANSCRIPT,
	});
	await lab2.clock.advance(1);

	expect(lab2.submitted).toEqual([]);
});

test("a handoff inside the stale limit is taken in, and its text opens with the source of the file", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 6 * 86_400_000);

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted).toHaveLength(1);
	expect(
		lab2.submitted[0]?.startsWith("The handoff below was written by Claude"),
	).toBe(true);
});

test("a stale handoff is named once and not at every start", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 8 * 86_400_000);

	await resume($);
	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.lines.filter((line) => line.includes("days old"))).toHaveLength(
		1,
	);
});

test("a handoff file that cannot be read tells the user in one line", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000, { read: false });

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted).toEqual([]);
	expect(
		lab2.lines.filter((line) => line.includes("Failed to read a handoff")),
	).toHaveLength(1);
});

test("a submit the session refuses tells the user in one line and does not fail the start", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000, { submit: false });

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted).toEqual([]);
	expect(
		lab2.lines.filter((line) => line.includes("Failed to inject handoff")),
	).toHaveLength(1);
});

test("the read-back line tells a code-built handoff from one Claude wrote", () => {
	expect(
		readBackText("a.md", "# Handoff\n\nBuilt by claudetto from the transcript"),
	).toContain("built by code");
	expect(readBackText("a.md", "# Handoff\n\nWritten by Claude")).toContain(
		"written by Claude",
	);
});

test("a typed clear, and a session that ends for another reason, leave no handoff file", async ($: Engine, on: On) => {
	const seen = world(on);
	on("classic.SessionEnd", () => ({}));

	await $.classic.SessionEnd({ reason: "clear", transcript_path: TRANSCRIPT });
	await $.classic.SessionEnd({
		reason: "logout",
		transcript_path: TRANSCRIPT,
	});

	expect(seen.writes).toEqual([]);
});

test("a typed /clear takes no handoff in", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000);
	on("classic.SessionEnd", () => ({}));

	await $.classic.SessionEnd({ reason: "clear", transcript_path: TRANSCRIPT });
	await $.classic.SessionStart({
		source: "clear",
		transcript_path: TRANSCRIPT,
	});
	await lab2.clock.advance(1);

	expect(lab2.submitted).toEqual([]);
});

test("a session that worked from a plan gets its path and not its text", async ($: Engine, on: On) => {
	const seen = world(on);

	await compactWith($, [
		said("user", "Work from the plan."),
		{
			role: "assistant",
			text: "Reading the plan.",
			toolUses: [use("Read", { file_path: "docs/plans/rename.md" })],
		},
		{
			role: "user",
			text: "",
			toolUses: [],
			toolResults: [
				{
					tool_use_id: "u-Read",
					text: "Step 1: rename. Step 2: delete the shim.",
					isError: false,
				},
			],
		},
	]);

	const text = seen.writes[0]?.text ?? "";
	expect(text).toContain("docs/plans/rename.md");
	expect(text).not.toContain("delete the shim");
});

test("a tool call with no file path adds no path", () => {
	const { paths } = readMessages([
		said("user", "Run the tests."),
		{
			role: "assistant",
			text: "",
			toolUses: [use("Bash", { command: "just check" })],
		},
	]);

	expect(paths).toEqual([]);
});

test("the next session reads the copy back, and not an older valid file", async ($: Engine, on: On) => {
	const seen = world(on, { [MISNAMED]: "# Handoff\n\nmine" });
	await compactWith($, writtenAs(MISNAMED));
	const copy = seen.writes[0]?.path.split("/").at(-1) ?? "";

	expect(
		newestHandoff(["handoff-2026-01-01T00-00-00.md", "notes.md", copy]),
	).toBe(copy);
});

test("no block the harness built is changed, and the handoff block costs no request", async ($: Engine, on: On) => {
	const models: string[] = [];
	world(on);
	on("prompt.context", (_$, e) => e);
	on("model.complete", (_$, e) => {
		models.push(e.model);
		return { deny: "the handoff block may not cost a request" };
	});
	const built = [
		{ name: "claudeMd", text: "# Project\nUse bun.\n" },
		{ name: "currentDate", text: "2026-10-29" },
	];

	const out = await $.prompt.context({ blocks: built });

	expect(out.blocks.slice(0, built.length)).toEqual(built);
	expect(out.blocks).toHaveLength(built.length + 1);
	expect(models).toEqual([]);
});

test("no text is added to a message the harness injects", async ($: Engine, on: On) => {
	world(on);
	on("prompt.attachment", (_$, e) => e);
	const reminder = "<system-reminder>Plan mode is on.</system-reminder>";

	const out = await $.prompt.attachment({
		type: "plan_mode",
		text: reminder,
		origin: { kind: "engine" },
		detail: {
			reminder: "sparse",
			planFilePath: "/tmp/plan.md",
			hasPlan: false,
		},
	});

	expect(out.text).toBe(reminder);
});

test("a handoff is written under the project root after a shell cd", async ($: Engine, on: On) => {
	const seen = world(on);
	on("session.cwd", () => ({ value: "/repo/openspec/changes/x" }));

	await compactWith($, asked("fix the gate"));

	expect(seen.writes).toHaveLength(1);
	expect(
		seen.writes[0]?.path.startsWith(
			"/repo/.claude/claudetto/handoffs/handoff-",
		),
	).toBe(true);
});

test("the handoff folder is read under the project root after a shell cd", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000);
	on("session.cwd", () => ({ value: "/repo/openspec/changes/x" }));

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.asked).toEqual(["/repo/.claude/claudetto/handoffs"]);
});

const HANDOFF_INPUT = {
	goal: "ship the cut",
	standing: "none",
	state: "done: parser",
	decisions: "table over regex",
	next_prompt: "run the suite",
};

const goal = ($: Engine, args: string) =>
	$.command.run({ command: "goal", args });

/** The commands `$.command.run` reached the engine with, after a handoff that ran its timer. */
const handedOff = async ($: Engine, on: On, goals: () => Promise<unknown>) => {
	const clock = mock.clock(on, { now: 0 });
	const ran: string[] = [];
	startup(on);
	on("session.root", () => ({ value: "/repo" }));
	on("fs.write", () => ({ value: undefined }));
	on("ui.log", () => ({ value: undefined }));
	on("turn.abort", () => ({ value: undefined }));
	on("prompt.submit", (_$, e) => e);
	on("command.run", (_$, e) => {
		ran.push(`${e.command} ${e.args}`.trim());
		return {};
	});
	await goals();
	ran.length = 0;
	await $.tool.call({ tool: "mcp__claudetto__handoff", ...HANDOFF_INPUT });
	await clock.advance(1);
	return ran;
};

test("a handoff sets the user's goal again after the clear", async ($: Engine, on: On) => {
	const ran = await handedOff($, on, () => goal($, "all tests pass"));

	expect(ran).toEqual(["clear", "goal all tests pass"]);
});

test("a handoff after /goal clear sets no goal", async ($: Engine, on: On) => {
	const ran = await handedOff($, on, async () => {
		await goal($, "all tests pass");
		await goal($, "clear");
	});

	expect(ran).toEqual(["clear"]);
});

test("the last goal the user set is the one set again", async ($: Engine, on: On) => {
	const ran = await handedOff($, on, async () => {
		await goal($, "first");
		await goal($, "second");
	});

	expect(ran).toEqual(["clear", "goal second"]);
});
