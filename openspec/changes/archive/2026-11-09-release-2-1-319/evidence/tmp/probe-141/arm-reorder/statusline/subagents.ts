import type { Paint } from "./color.ts";
import { span, thousands, windowText } from "./format.ts";
import { ICON } from "./icons.ts";
import { num, type Rec, rec, str } from "./input.ts";
import { DESCRIPTION_ROOM_MIN, ITEM_GAP, SUBAGENT_ROWS_MAX } from "./limits.ts";
import { truncate, width } from "./width.ts";

const PLUGIN_PREFIX = /^[^:]+:/;
const CLAUDE_PREFIX = /^claude-/;

const STATES: Readonly<Record<string, string>> = {
	completed: `${ICON.done} done`,
	failed: `${ICON.error} failed`,
	killed: "stopped",
};

const contextText = (task: Rec, paint: Paint): string => {
	const tokens = num(task["tokenCount"]) ?? 0;
	const size = num(task["contextWindowSize"]);
	if (tokens <= 0) {
		return "";
	}
	const used = `${ICON.context} ${thousands(tokens)}`;
	if (!size) {
		return paint.dim(used);
	}
	const percent = Math.min(100, Math.round((tokens / size) * 100));
	return paint.level(percent)(`${used}/${windowText(size)} ${percent}%`);
};

const timeText = (task: Rec, now: number, paint: Paint): string => {
	const status = str(task["status"]);
	if (status && status !== "running") {
		return paint.dim(STATES[status] ?? status);
	}
	const start = num(task["startTime"]);
	return start === undefined
		? ""
		: paint.dim(`${ICON.time} ${span(now - start)}`);
};

const rowOf = (
	task: Rec,
	now: number,
	columns: number,
	paint: Paint,
): string => {
	const agentType = str(task["agentType"])?.replace(PLUGIN_PREFIX, "");
	const name = str(task["name"]) ?? agentType ?? "agent";
	const type =
		agentType && agentType !== name ? paint.dim(` (${agentType})`) : "";
	const model = str(task["model"])?.replace(CLAUDE_PREFIX, "");
	const effort = str(task["effort"]) ?? String(num(task["effort"]) ?? "");
	const shown = model
		? ` ${paint.dim(`${model}${effort ? ` ${effort}` : ""}`)}`
		: "";
	const line = [
		`${ICON.agent} ${paint.bold(name)}${type}${shown}`,
		contextText(task, paint),
		timeText(task, now, paint),
	]
		.filter(Boolean)
		.join(ITEM_GAP);
	const room = columns - width(line) - width(ITEM_GAP);
	const description = str(task["description"]);
	return !description || room <= DESCRIPTION_ROOM_MIN
		? truncate(line, columns)
		: `${line}${ITEM_GAP}${paint.dim(truncate(description, room))}`;
};

/** One `{id, content}` row per task with an id, each fitted to `columns`. */
export const taskRows = (
	input: Rec,
	now: number,
	columns: number,
	paint: Paint,
): { id: string; content: string }[] => {
	const tasks = Array.isArray(input["tasks"]) ? input["tasks"] : [];
	return tasks
		.map(rec)
		.slice(0, SUBAGENT_ROWS_MAX)
		.flatMap((task) => {
			const id = str(task?.["id"]);
			return task && id
				? [{ id, content: rowOf(task, now, columns, paint) }]
				: [];
		});
};
