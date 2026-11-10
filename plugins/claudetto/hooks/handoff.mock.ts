import type { On, SessionMessage } from "claude-code";
import { type Engine, mock } from "claude-code/testing";

import { scanned } from "./secrets.mock.ts";

export const TRANSCRIPT = "/tmp/transcript.jsonl";

export const HANDOFF_PATH =
	/^\.claude\/claudetto\/handoffs\/handoff-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d\.md$/u;

export const KEY = `sk-ant-oat01-${"Q7rK2mZx9Lp4Vb8N".repeat(5)}`;

const NOW = 8 * 86_400_000;

export const firstText = (files: readonly { text: string }[]): string =>
	files[0]?.text ?? "";

export const firstPath = (files: readonly { path: string }[]): string =>
	files[0]?.path ?? "";

export const fileName = (path: string): string =>
	path.slice(path.lastIndexOf("/") + 1);

/** The text of a handoff between the `from` heading and the `to` heading. */
export const between = (text: string, from: string, to: string): string =>
	(text.split(from)[1] ?? "").split(to)[0] ?? "";

export const said = (
	role: SessionMessage["role"],
	text: string,
): SessionMessage => ({
	role,
	text,
	toolUses: [],
});

export const human = (text: string): string =>
	JSON.stringify({
		type: "user",
		origin: { kind: "human" },
		message: { content: text },
	});

export const longSession = (): SessionMessage[] => [
	said("user", "The staged deletions are mine; never restore them."),
	...Array.from({ length: 15 }, (_, i) => [
		said("assistant", `step ${i}`),
		said("user", `next ${i}`),
	]).flat(),
];

export const use = (tool: string, input: Record<string, unknown>) => ({
	tool_use_id: `u-${tool}`,
	tool,
	input,
});

export const asked = (text: string): SessionMessage[] => [
	said("user", text),
	said("assistant", "ok"),
];

export const MISNAMED = "/repo/.claude/claudetto/handoffs/notes.md";

export const writtenAs = (path: string): SessionMessage[] => [
	said("user", "hand off"),
	{
		role: "assistant",
		text: "",
		toolUses: [use("Write", { file_path: path })],
	},
];

/** The stubs a SessionStart needs; `git` is what each git call prints. */
export const startup = (on: On, git = ""): void => {
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
					stdout: e.argv[0] === "git" ? git : "",
					stderr: "",
					isStdoutTruncated: false,
					isStderrTruncated: false,
				},
			},
	);
};

/** A session whose transcript file holds `jsonl`; returns each file the hooks write. */
export const lab = (on: On, jsonl: string, git = "") => {
	const files: { path: string; text: string }[] = [];
	on("session.root", () => ({ value: "/repo" }));
	on("fs.write", (_$, e) => {
		files.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("fs.read", () => ({ value: jsonl }));
	on("ui.log", () => ({ value: undefined }));
	on("session.compact", () => ({ skip: "core ran" }));
	startup(on, git);
	return files;
};

export const compactWith = async ($: Engine, messages: SessionMessage[]) => {
	await $.classic.SessionStart({
		source: "startup",
		transcript_path: TRANSCRIPT,
	});
	await $.session.compact({ trigger: "auto", messages });
};

export const resume = ($: Engine) =>
	$.classic.SessionStart({ source: "resume", transcript_path: TRANSCRIPT });

export const handoffEntry = (day: string, mtimeMs: number) => ({
	name: `handoff-2026-01-${day}T00-00-00.md`,
	kind: "file" as const,
	size: 1,
	mtimeMs,
	isLink: false,
});

const wireFolder = (
	on: On,
	entries: ReturnType<typeof handoffEntry>[],
	transcriptMs: number,
): void => {
	on("fs.list", (_$, e) => ({
		value:
			e.path === "/tmp"
				? [
						{
							name: "transcript.jsonl",
							kind: "file" as const,
							size: 1,
							mtimeMs: transcriptMs,
							isLink: false,
						},
					]
				: entries,
	}));
};

/** A handoff folder whose newest file is `age` ms old; `faults` breaks one step, `given` sets the transcript's time or the file's body. */
export const readBackLab = (
	on: On,
	age: number,
	faults: { folder?: false; read?: false; submit?: false } = {},
	given: { transcriptMs?: number; body?: string } = {},
) => {
	const clock = mock.clock(on, { now: NOW });
	const submitted: string[] = [];
	const lines: string[] = [];
	const probed: string[] = [];
	startup(on);
	on("session.root", () => ({ value: "/repo" }));
	on("fs.exists", (_$, e) => {
		probed.push(e.path);
		return { value: faults.folder ?? true };
	});
	const entries = [handoffEntry("01", 0), handoffEntry("02", NOW - age)];
	wireFolder(on, entries, given.transcriptMs ?? 0);
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
	return { clock, submitted, lines, entries, asked: probed };
};

interface World {
	writes: { path: string; text: string }[];
	lines: string[];
}

/** `reads` maps a path to its text; a path it lacks fails to read. */
export const world = (
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
