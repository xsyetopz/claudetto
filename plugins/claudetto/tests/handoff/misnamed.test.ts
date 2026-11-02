import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
	BUILT_BY_CODE,
	HANDOFF_DIR,
} from "../../src/blocks/handoff/handoff.ts";
import { newestHandoff } from "../../src/blocks/handoff/read-back.ts";
import { said, tailOf, turn } from "./transcript.ts";

const TRANSCRIPT = "/tmp/transcript.jsonl";

const VALID = /^handoff-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d\.md$/;

const MISNAMED = `${HANDOFF_DIR}/handoff-20261031T-14-1.md`;

const CLAUDES = `# Handoff

Written by Claude at 2026-10-31T14:01:00Z.

## Goal

Ship the status line.
`;

const WROTE_MISNAMED = tailOf(
	said("user", "Write the handoff."),
	turn("assistant", [
		{ type: "tool_use", name: "Write", input: { file_path: MISNAMED } },
	]),
);

interface Run {
	readonly files: { path: string; text: string }[];
	readonly lines: string[];
}

/** A compaction whose tail shows Claude writing `MISNAMED`, with `read` as the stub reply of `$.fs.read`. A stub that throws is skipped by the lab, so a failed read is a `deny`. */
const compactAfterMisnamed = async (
	$: Engine,
	on: On,
	read: { value: string } | { deny: string },
): Promise<Run> => {
	const run: Run = { files: [], lines: [] };
	on("process.run", () => ({
		value: {
			exitCode: 0,
			stdout: WROTE_MISNAMED,
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false,
		},
	}));
	on("fs.read", () => read);
	on("session.root", () => ({ value: "/repo" }));
	on("fs.write", (_$, e) => {
		run.files.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("ui.log", (_$, e) => {
		run.lines.push(e.text);
		return { value: undefined };
	});
	on("classic.PreCompact", () => ({}));
	await $.classic.PreCompact({
		trigger: "auto",
		custom_instructions: null,
		transcript_path: TRANSCRIPT,
	});
	return run;
};

const nameOf = (path: string | undefined): string =>
	path?.replaceAll("\\", "/").split("/").at(-1) ?? "";

test("a misnamed handoff Claude wrote is copied to a valid name, and one line names both files", async ($: Engine, on: On) => {
	const run = await compactAfterMisnamed($, on, { value: CLAUDES });

	expect(run.files).toHaveLength(1);
	expect(nameOf(run.files[0]?.path)).toMatch(VALID);
	expect(run.files[0]?.text).toBe(CLAUDES);
	expect(run.lines).toHaveLength(1);
	expect(run.lines[0]).toContain("handoff-20261031T-14-1.md");
	expect(run.lines[0]).toContain(nameOf(run.files[0]?.path));
});

test("a misnamed handoff that cannot be read leaves the code-built file, and one line names it and the cause", async ($: Engine, on: On) => {
	const run = await compactAfterMisnamed($, on, {
		deny: "EACCES: permission denied",
	});

	expect(run.files).toHaveLength(1);
	expect(nameOf(run.files[0]?.path)).toMatch(VALID);
	expect(run.files[0]?.text).toContain(BUILT_BY_CODE);
	expect(run.lines).toHaveLength(1);
	expect(run.lines[0]).toContain("handoff-20261031T-14-1.md");
	expect(run.lines[0]).toContain("EACCES");
});

test("the next session reads the copy back, and not an older valid file", async ($: Engine, on: On) => {
	const run = await compactAfterMisnamed($, on, { value: CLAUDES });
	const copy = nameOf(run.files[0]?.path);

	expect(
		newestHandoff([
			"handoff-2026-10-29T08-00-00.md",
			"handoff-20261031T-14-1.md",
			copy,
		]),
	).toBe(copy);
});
