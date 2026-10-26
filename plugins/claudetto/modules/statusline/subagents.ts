// The rows of `subagentStatusLine`: one row for each subagent, with the state in place of the clock when it is not running. The description fills the room that is left.
import type { Paint } from "./color.ts";
import { span, thousands, windowText } from "./format.ts";
import { ICON } from "./icons.ts";
import { DESCRIPTION_ROOM_MIN, ITEM_GAP, SUBAGENT_ROWS_MAX } from "./limits.ts";
import { truncate, width } from "./width.ts";
import { type WindowSources, windowInEffect } from "./window.ts";

export type Task = {
  id?: string;
  name?: string;
  agentType?: string;
  status?: string;
  description?: string;
  startTime?: number | string;
  model?: string;
  effort?: string;
  contextWindowSize?: number;
  tokenCount?: number;
};

export type SubagentInput = {
  cwd?: string;
  columns?: number;
  tasks?: Task[];
};

/** The context use of a task in its color, or `""` when the task has no tokens. */
const contextText = (
  task: Task,
  paint: Paint,
  windows: WindowSources,
): string => {
  const tokens = task.tokenCount ?? 0;
  const size = windowInEffect(windows, task.model, task.contextWindowSize);
  if (tokens <= 0) return "";
  const percent = size ? Math.min(100, Math.round((tokens / size) * 100)) : 0;
  const used = `${ICON.context} ${thousands(tokens)}`;
  return paint.level(percent)(
    size ? `${used}/${windowText(size)} ${percent}%` : used,
  );
};

/** The state of a task that is not running, in place of the clock. */
const STATES: Record<string, string> = {
  completed: `${ICON.done} done`,
  failed: `${ICON.error} failed`,
  killed: "stopped",
};

/** The run time of a running task, or its state when it is not running, or `""` when the start time is not valid. */
const timeText = (task: Task, now: number, paint: Paint): string => {
  if (task.status && task.status !== "running")
    return paint.dim(STATES[task.status] ?? task.status);
  const start =
    typeof task.startTime === "number"
      ? task.startTime
      : Date.parse(task.startTime ?? "");
  return Number.isFinite(start)
    ? paint.dim(`${ICON.time} ${span(now - start)}`)
    : "";
};

const renderTask = (
  task: Task,
  now: number,
  columns: number,
  paint: Paint,
  windows: WindowSources,
): string => {
  // The agent type has a plugin prefix for a plugin agent.
  const agentType = task.agentType?.replace(/^[^:]+:/, "");
  const name = task.name || agentType || "agent";
  const type =
    agentType && agentType !== name ? paint.dim(` (${agentType})`) : "";
  const model = task.model
    ? ` ${paint.dim(`${task.model.replace(/^claude-/, "")}${task.effort ? ` ${task.effort}` : ""}`)}`
    : "";
  const line = [
    `${ICON.agent} ${paint.bold(name)}${type}${model}`,
    contextText(task, paint, windows),
    timeText(task, now, paint),
  ]
    .filter(Boolean)
    .join(ITEM_GAP);
  const room = columns - width(line) - width(ITEM_GAP);
  const description = (task.description ?? "").replace(/\s+/g, " ").trim();
  return !description || room <= DESCRIPTION_ROOM_MIN
    ? truncate(line, columns)
    : `${line}${ITEM_GAP}${paint.dim(truncate(description, room))}`;
};

/** `columns` is the width when `input` has none. */
export const taskRows = (
  input: SubagentInput,
  now: number,
  columns: number,
  paint: Paint,
  windows: WindowSources,
): { id: string; content: string }[] =>
  (input.tasks ?? [])
    .filter((task): task is Task & { id: string } => Boolean(task?.id))
    .slice(0, SUBAGENT_ROWS_MAX)
    .map((task) => ({
      id: task.id,
      content: renderTask(
        task,
        now,
        Number(input.columns) || columns,
        paint,
        windows,
      ),
    }));
