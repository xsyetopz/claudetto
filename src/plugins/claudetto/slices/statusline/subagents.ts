// The rows of `subagentStatusLine`: one row for each running subagent. The description fills the room that is left.

import type { Paint } from "./color.ts";
import { idLabel, span, thousands, windowText } from "./format.ts";
import { ICON } from "./icons.ts";
import { DESCRIPTION_ROOM_MIN, ITEM_GAP, SUBAGENT_ROWS_MAX } from "./limits.ts";
import type { SubagentInput, Task } from "./types.ts";
import { truncate, width } from "./width.ts";

const renderTask = (
  task: Task,
  now: number,
  columns: number,
  paint: Paint,
): string => {
  // The agent type has a plugin prefix for a plugin agent.
  const agentType = task.agentType?.replace(/^[^:]+:/, "");
  const name = task.name || agentType || "agent";
  const tokens = task.tokenCount ?? 0;
  const size = task.contextWindowSize;
  const percent = size ? Math.min(100, Math.round((tokens / size) * 100)) : 0;
  const start =
    typeof task.startTime === "number"
      ? task.startTime
      : Date.parse(task.startTime ?? "");
  const model = task.model
    ? ` ${paint.dim(`${idLabel(task.model)}${task.effort ? ` ${task.effort}` : ""}`)}`
    : "";
  const type =
    agentType && agentType !== name ? paint.dim(` (${agentType})`) : "";
  const line = [
    `${ICON.agent} ${paint.bold(name)}${type}${model}`,
    tokens > 0
      ? paint.level(percent)(
          size
            ? `${ICON.context} ${thousands(tokens)}/${windowText(size)} ${percent}%`
            : `${ICON.context} ${thousands(tokens)}`,
        )
      : "",
    Number.isFinite(start)
      ? paint.dim(`${ICON.time} ${span(now - start)}`)
      : "",
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
