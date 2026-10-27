// The replay of real transcripts for the handoff probe. It reads `~/.claude/projects/` only, and it keeps counts and no transcript text.

import { homedir } from "node:os";
import { join } from "node:path";
import { file as bunFile, Glob } from "bun";
import type { SessionMessage, ToolUseSummary } from "claude-code";
import { handoffText } from "../../plugins/claudetto/modules/session/handoff/handover.ts";
import {
	HANDOFF_PROBE_FILE_BYTES_MAX,
	HANDOFF_PROBE_MESSAGES_MAX,
	HANDOFF_PROBE_SESSIONS_MAX,
	HANDOFF_PROBE_TICKS_MAX,
} from "../../tools/limits.ts";
import { sectionOf } from "./score.ts";

type Row = Record<string, unknown>;

const isRow = (v: unknown): v is Row =>
	typeof v === "object" && v !== null && !Array.isArray(v);

const parse = (line: string): Row | null => {
	try {
		const row: unknown = JSON.parse(line);
		return isRow(row) ? row : null;
	} catch {
		return null;
	}
};

const blocksOf = (row: Row): Row[] => {
	const message = row["message"];
	const content = isRow(message) ? message["content"] : undefined;
	return Array.isArray(content) ? content.filter(isRow) : [];
};

const textOf = (content: unknown): string => {
	if (typeof content === "string") {
		return content;
	}
	return Array.isArray(content)
		? content
				.filter(isRow)
				.map((b) => (typeof b["text"] === "string" ? b["text"] : ""))
				.join("\n")
		: "";
};

/** The `SessionMessage[]` of the transcript `text` (JSON lines), without sidechain and meta rows, the newest `HANDOFF_PROBE_MESSAGES_MAX`. */
export const messagesOf = (text: string): SessionMessage[] => {
	const rows = text
		.split("\n")
		.map(parse)
		.filter(
			(r): r is Row =>
				r !== null &&
				(r["type"] === "user" || r["type"] === "assistant") &&
				r["isSidechain"] !== true &&
				r["isMeta"] !== true,
		);
	const results = new Map<string, { text: string; isError: boolean }>();
	for (const b of rows.flatMap(blocksOf)) {
		if (b["type"] === "tool_result") {
			results.set(String(b["tool_use_id"]), {
				text: textOf(b["content"]),
				isError: b["is_error"] === true,
			});
		}
	}
	const messages = rows.map((row): SessionMessage => {
		const message = isRow(row["message"]) ? row["message"] : {};
		const blocks = blocksOf(row);
		const body =
			typeof message["content"] === "string"
				? message["content"]
				: blocks
						.filter((b) => b["type"] === "text")
						.map((b) => textOf(b["text"]))
						.join("\n");
		const toolUses = blocks
			.filter((b) => b["type"] === "tool_use")
			.map((b): ToolUseSummary => {
				const id = String(b["id"]);
				const got = results.get(id);
				return {
					tool_use_id: id,
					tool: String(b["name"]),
					input: isRow(b["input"]) ? b["input"] : {},
					...(got === undefined ? {} : { text: got.text }),
					...(got?.isError ? { isError: true as const } : {}),
				};
			});
		return {
			role: row["type"] === "user" ? "user" : "assistant",
			text: body,
			toolUses,
		};
	});
	return messages.slice(-HANDOFF_PROBE_MESSAGES_MAX);
};

const ANSWER = /"((?:[^"\\]|\\.)*)"="((?:[^"\\]|\\.)*)"/g;

/** One decision of the user per answer in `## Decisions`: `rank` is its place from the end, 1 for the newest. */
export const replayDecisions = (
	messages: readonly SessionMessage[],
): { kept: boolean; rank: number }[] => {
	const answers = messages
		.flatMap((m) => m.toolUses)
		.filter((u) => u.tool === "AskUserQuestion" && u.isError !== true)
		.flatMap((u) =>
			[...(u.text ?? "").matchAll(ANSWER)].map((m) => m[2] ?? ""),
		);
	if (answers.length === 0) {
		return [];
	}
	const body = sectionOf(handoffText({ messages }), "## Decisions");
	return answers.map((answer, i) => ({
		kept: body.includes(`\`${answer}\``),
		rank: answers.length - i,
	}));
};

const TASK = /^- \[([ xX])\] (\S+)/;
const TASKS_FILE = /openspec\/changes\/([^/]+)\/tasks\.md$/;
const UNCHECKED = /^- \[ \]/;
const CHECKED = /^- \[[xX]\]/;

const idsOf = (text: string, open: boolean): string[] =>
	text.split("\n").flatMap((line) => {
		const m = TASK.exec(line);
		return m !== null && (m[1] === " ") === open ? [m[2] ?? ""] : [];
	});

/** The `tasks.md` path, its change name, and the id that a tool call ticks (`- [ ] id` becomes `- [x] id`), or `null`. */
const tickOf = (use: ToolUseSummary) => {
	const path = use.input["file_path"];
	const file = typeof path === "string" ? TASKS_FILE.exec(path) : null;
	if (typeof path !== "string" || file === null) {
		return null;
	}
	const open = new Set(idsOf(String(use.input["old_string"] ?? ""), true));
	const id = idsOf(String(use.input["new_string"] ?? ""), false).find((i) =>
		open.has(i),
	);
	return id === undefined ? null : { path, name: file[1] ?? "change", id };
};

/** The `tasks.md` paths that the tool calls of `messages` tick. */
export const tickedPaths = (messages: readonly SessionMessage[]): string[] => [
	...new Set(
		messages.flatMap((m) => m.toolUses.flatMap((u) => tickOf(u)?.path ?? [])),
	),
];

/** `text` with the tasks up to line `index` checked and the later ones open, as the file was when the task at `index` was ticked. */
const markedAt = (text: string, index: number): string =>
	text
		.split("\n")
		.map((l, i) =>
			i <= index ? l.replace(UNCHECKED, "- [x]") : l.replace(CHECKED, "- [ ]"),
		)
		.join("\n");

/**
 * One score for each task that the transcript ticks (the first `HANDOFF_PROBE_TICKS_MAX`).
 * `read` gives the text of a `tasks.md` path, or `undefined`. The tasks up to the ticked one count as checked, and the next task is the one after it.
 */
export const replayTicks = (
	messages: readonly SessionMessage[],
	read: (path: string) => string | undefined,
): { kept: boolean }[] => {
	const found: { kept: boolean }[] = [];
	for (const [at, m] of messages.entries()) {
		for (const use of m.toolUses) {
			const tick = tickOf(use);
			const text = tick === null ? undefined : read(tick.path);
			if (tick === null || text === undefined) {
				continue;
			}
			const lines = text.split("\n");
			const index = lines.findIndex((l) => TASK.exec(l)?.[2] === tick.id);
			const next = lines
				.slice(index + 1)
				.map((l) => TASK.exec(l)?.[2])
				.find(Boolean);
			if (index < 0 || next === undefined) {
				continue;
			}
			const handoff = handoffText({
				messages: messages.slice(0, at + 1),
				name: tick.name,
				tasks: markedAt(text, index),
			});
			found.push({
				kept: sectionOf(handoff, "## Next Step").includes(`\`${next}\``),
			});
		}
	}
	return found.slice(0, HANDOFF_PROBE_TICKS_MAX);
};

export interface ReplayCounts {
	sessions: number;
	skipped: number;
	decisions: { kept: boolean; rank: number }[];
	ticks: { kept: boolean }[];
}

const readAll = async (
	paths: readonly string[],
): Promise<Map<string, string>> => {
	const found = await Promise.all(
		paths.map(async (path) => {
			const f = bunFile(path);
			return (await f.exists()) ? ([path, await f.text()] as const) : null;
		}),
	);
	return new Map(found.filter((e) => e !== null));
};

/** Replays `files` one after the other into `out`. */
const replayFiles = async (
	files: readonly ReturnType<typeof bunFile>[],
	out: ReplayCounts,
): Promise<ReplayCounts> => {
	const [f, ...rest] = files;
	if (f === undefined) {
		return out;
	}
	if (f.size > HANDOFF_PROBE_FILE_BYTES_MAX) {
		out.skipped++;
		return replayFiles(rest, out);
	}
	const messages = messagesOf(await f.text());
	const tasks = await readAll(tickedPaths(messages));
	out.sessions++;
	out.decisions.push(...replayDecisions(messages));
	out.ticks.push(...replayTicks(messages, (p) => tasks.get(p)));
	return replayFiles(rest, out);
};

/** Replays the newest `limit` transcripts of `root` (read only) and gives counts. */
export const replayAll = (
	limit = HANDOFF_PROBE_SESSIONS_MAX,
	root = join(homedir(), ".claude", "projects"),
): Promise<ReplayCounts> =>
	replayFiles(
		[...new Glob("*/*.jsonl").scanSync(root)]
			.map((f) => bunFile(join(root, f)))
			.sort((a, b) => b.lastModified - a.lastModified)
			.slice(0, limit),
		{ sessions: 0, skipped: 0, decisions: [], ticks: [] },
	);
