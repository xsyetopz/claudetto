import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import {
	asked,
	compactWith,
	fileName,
	firstPath,
	HANDOFF_PATH,
	MISNAMED,
	said,
	TRANSCRIPT,
	use,
	world,
	writtenAs,
} from "./handoff.mock.ts";
import { newestHandoff } from "./handoff/read-back.ts";
import { contextManagementText } from "./texts-handoff.ts";

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
	const path = firstPath(seen.writes);
	expect(path.startsWith("/repo/")).toBe(true);
	expect(path.slice("/repo/".length)).toMatch(HANDOFF_PATH);
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
});

test("a file Claude wrote is kept and no code-built one goes beside it", async ($: Engine, on: On) => {
	const seen = world(on);

	await compactWith(
		$,
		writtenAs(
			"/repo/.claude/claudetto/handoffs/handoff-2026-01-01T00-00-00.md",
		),
	);

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

test("a misnamed handoff Claude wrote is copied to a valid name, and one line names both files", async ($: Engine, on: On) => {
	const seen = world(on, { [MISNAMED]: "# Handoff\n\nmine" });

	await compactWith($, writtenAs(MISNAMED));

	expect(seen.writes).toHaveLength(1);
	expect(seen.writes[0]?.text).toBe("# Handoff\n\nmine");
	expect(seen.lines).toHaveLength(1);
	expect(seen.lines[0]).toContain(MISNAMED);
	expect(seen.lines[0]).toContain(".claude/claudetto/handoffs/handoff-");
});

test("a misnamed handoff that cannot be read writes no file, and one line names it and the cause", async ($: Engine, on: On) => {
	const seen = world(on);

	await compactWith($, writtenAs(MISNAMED));

	expect(seen.writes).toEqual([]);
	expect(seen.lines).toHaveLength(1);
	expect(seen.lines[0]).toContain(MISNAMED);
	expect(seen.lines[0]).toContain("ENOENT");
});

test("the next session reads the copy back, and not an older valid file", async ($: Engine, on: On) => {
	const seen = world(on, { [MISNAMED]: "# Handoff\n\nmine" });
	await compactWith($, writtenAs(MISNAMED));
	const copy = fileName(firstPath(seen.writes));

	expect(
		newestHandoff(["handoff-2026-01-01T00-00-00.md", "notes.md", copy]),
	).toBe(copy);
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

test("a handoff is written under the project root after a shell cd", async ($: Engine, on: On) => {
	const seen = world(on);
	on("session.cwd", () => ({ value: "/repo/openspec/changes/x" }));

	await compactWith($, asked("fix the gate"));

	expect(seen.writes).toHaveLength(1);
	expect(
		firstPath(seen.writes).startsWith(
			"/repo/.claude/claudetto/handoffs/handoff-",
		),
	).toBe(true);
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
	expect(context.blocks[0]?.text).toBe(contextManagementText());
	expect(section.text).toBeNull();
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
