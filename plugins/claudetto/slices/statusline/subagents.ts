// The rows of `subagentStatusLine`: one row for each running subagent. The description fills the room that is left.

import type { Paint } from "./color.ts";
import { idLabel, span, thousands, windowText } from "./format.ts";
import { ICON } from "./icons.ts";
import { DESCRIPTION_ROOM_MIN, ITEM_GAP, SUBAGENT_ROWS_MAX } from "./limits.ts";
import type { SubagentInput, Task } from "./types.ts";
import { truncate, width } from "./width.ts";

/** The model and effort of a task, dimmed, or `""` when the task has no model. */
const modelText = (task: Task, paint: Paint): string =>
  task.model
    ? ` ${paint.dim(`${idLabel(task.model)}${task.effort ? ` ${task.effort}` : ""}`)}`
    : "";

/** The context use of a task in its color, or `""` when the task has no tokens. */
const contextText = (task: Task, paint: Paint): string => {
  const tokens = task.tokenCount ?? 0;
  if (tokens <= 0) return "";
  const size = task.contextWindowSize;
  const percent = size ? Math.min(100, Math.round((tokens / size) * 100)) : 0;
  return paint.level(percent)(
    size
      ? `${ICON.context} ${thousands(tokens)}/${windowText(size)} ${percent}%`
      : `${ICON.context} ${thousands(tokens)}`,
  );
};

/** The run time of a task, or `""` when the start time is not valid. */
const timeText = (task: Task, now: number, paint: Paint): string => {
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
): string => {
  // The agent type has a plugin prefix for a plugin agent.
  const agentType = task.agentType?.replace(/^[^:]+:/, "");
  const name = task.name || agentType || "agent";
  const type =
    agentType && agentType !== name ? paint.dim(` (${agentType})`) : "";
  const line = [
    `${ICON.agent} ${paint.bold(name)}${type}${modelText(task, paint)}`,
    contextText(task, paint),
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
): { id: string; content: string }[] =>
  (input.tasks ?? [])
    .filter(
      (task): task is Task & { id: string } =>
        Boolean(task?.id) && (!task.status || task.status === "running"),
    )
    .slice(0, SUBAGENT_ROWS_MAX)
    .map((task) => ({
      id: task.id,
      content: renderTask(task, now, Number(input.columns) || columns, paint),
    }));
