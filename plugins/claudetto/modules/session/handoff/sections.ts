// The sections of a handoff that code builds from the tool calls: the tasks, the files, and the errors.

import type { SessionMessage } from "claude-code";
import { isRecord } from "../../jev/domain/jev.ts";
import { countTasks, taskEntries } from "../../project/domain/change.ts";
import { proven } from "../../project/domain/checks.ts";
import { changedFiles } from "./cold.ts";
import { clip, spread } from "./compact.ts";
import {
	EDITED_TOKENS,
	ERRORS_MAX,
	READS_TOKENS,
	TASK_CHARS_MAX,
} from "./limits.ts";

const TASK_PREFIX = /^- \[.\] \S+\s*/;

export const taskText = (line: string): string =>
	clip(line.replace(TASK_PREFIX, ""), TASK_CHARS_MAX);

/** One state for each task: `done` for a checked box with a passed check, `next` for the next open task, else `open`. */
export const tasksOf = (
	name: string | undefined,
	tasks: string | undefined,
	checks: readonly string[],
) => {
	const entries = taskEntries(tasks ?? "");
	const next = tasks === undefined ? null : countTasks(tasks).next;
	const isDone = (e: (typeof entries)[number]) =>
		e.done && proven(e.line, checks);
	const ids = (items: typeof entries) =>
		items.map(
			(e) =>
				`\`${e.id}\`${e.done && !isDone(e) ? " (box checked, no passed check)" : ""}`,
		);
	const open = entries.filter((e) => !isDone(e) && e.id !== next);
	const done = entries.filter(isDone);
	const nextEntry = entries.find((e) => e.id === next);
	return {
		next: nextEntry,
		body:
			name === undefined || entries.length === 0
				? "No open change."
				: [
						`Change: \`openspec/changes/${name}/\``,
						...(nextEntry
							? [`Next: \`${nextEntry.id}\` ${taskText(nextEntry.line)}`]
							: []),
						...(open.length > 0
							? [
									`Open: ${open.map((e) => `${ids([e]).join("")} ${taskText(e.line)}`).join(", ")}`,
								]
							: []),
						...(done.length > 0 ? [`Done: ${ids(done).join(", ")}`] : []),
					].join("\n"),
	};
};

export const list = (
	lines: readonly string[],
	empty: string,
	glue = "\n",
): string => (lines.length === 0 ? empty : lines.join(glue));

/** The read and edited files, newest first, over the budget the oldest and newest (`spread`), each with the line range of a read. `root` is cut from the start of a path. */
export const filesOf = (
	messages: readonly SessionMessage[],
	root: string,
): string => {
	const rel = (path: string) =>
		root !== "" && path.startsWith(root) ? path.slice(root.length) : path;
	const reads = new Map<string, string>();
	for (const use of messages.flatMap((m) => m.toolUses)) {
		const input = isRecord(use.input) ? use.input : undefined;
		const path = input?.["file_path"];
		if (use.tool !== "Read" || typeof path !== "string") {
			continue;
		}
		const offset = input?.["offset"];
		const limit = input?.["limit"];
		const range =
			typeof offset === "number"
				? ` (lines ${offset}-${offset + (typeof limit === "number" ? limit : 2000) - 1})`
				: "";
		reads.delete(rel(path));
		reads.set(rel(path), range);
	}
	return list(
		[
			...spread(
				changedFiles(messages).map((p) => `- edited: \`${rel(p)}\``),
				EDITED_TOKENS,
				(line) => line,
			).reverse(),
			...spread(
				[...reads].map(([p, range]) => `- read: \`${p}\`${range}`),
				READS_TOKENS,
				(line) => line,
			).reverse(),
		],
		"No file read or edited.",
	);
};

const NOTIFIED_ID =
	/<(?:task-id|tool-use-id)>([^<]+)<\/(?:task-id|tool-use-id)>/g;

/** The id of the background task that `use` started: `agentId` of an `async_launched` `Agent` result, or `backgroundTaskId` of a `Bash` result. */
const backgroundIdOf = (
	use: SessionMessage["toolUses"][number],
): string | undefined => {
	const result = isRecord(use.result) ? use.result : {};
	if (use.tool === "Agent" && result["status"] === "async_launched") {
		return typeof result["agentId"] === "string"
			? result["agentId"]
			: undefined;
	}
	const id = use.tool === "Bash" ? result["backgroundTaskId"] : undefined;
	return typeof id === "string" ? id : undefined;
};

/** The background agents and `Bash` commands that no `<task-notification>` names by task id or tool use id, so they can still run after the handoff. */
export const runningOf = (messages: readonly SessionMessage[]): string => {
	const notified = new Set(
		messages
			.filter((m) => m.role === "user")
			.flatMap((m) => [...m.text.matchAll(NOTIFIED_ID)].map(([, id]) => id)),
	);
	return list(
		messages
			.flatMap((m) => m.toolUses)
			.flatMap((use) => {
				const id = backgroundIdOf(use);
				if (
					id === undefined ||
					notified.has(id) ||
					notified.has(use.tool_use_id)
				) {
					return [];
				}
				const input = isRecord(use.input) ? use.input : {};
				const what =
					use.tool === "Agent" ? input["description"] : input["command"];
				return [
					`- ${use.tool} \`${id}\`: ${typeof what === "string" ? `\`${clip(what.trim(), 100)}\`` : "no description"}`,
				];
			}),
		"No background work was running.",
	);
};

/** The failed tool calls, newest `ERRORS_MAX`, each marked fixed when a later call of the same command passed. */
export const errorsOf = (messages: readonly SessionMessage[]): string => {
	const uses = messages.flatMap((m) => m.toolUses);
	const labelOf = (use: (typeof uses)[number]) => {
		const command = isRecord(use.input) ? use.input["command"] : undefined;
		return use.tool === "Bash" && typeof command === "string"
			? clip(command.trim(), 100)
			: use.tool;
	};
	return list(
		uses
			.flatMap((use, i) =>
				use.isError === true
					? [
							`- \`${labelOf(use)}\` failed: ${clip((use.text ?? "").split("\n")[0] ?? "", 160)}${
								uses
									.slice(i + 1)
									.some(
										(u) =>
											u.isError !== true &&
											u.text !== undefined &&
											labelOf(u) === labelOf(use),
									)
									? " (fixed: a later run passed)"
									: ""
							}`,
						]
					: [],
			)
			.slice(-ERRORS_MAX),
		"No failed tool call.",
	);
};
