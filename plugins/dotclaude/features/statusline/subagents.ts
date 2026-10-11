// The subagent status line: one row for each running subagent.
// A row has the name, the agent type, the model and effort, the context against its window, and the run time.

import { windowOf } from "../../lib/budget.ts";
import { minutes, shortModel } from "./format.ts";
import { SUBAGENT_ROWS_MAX } from "./limits.ts";
import { C, sep, width } from "./paint.ts";
import { contextText, effortText } from "./segments.ts";
import type { SubagentInput, Task, TaskRow } from "./types.ts";

/**
 * The text of one row for `task`.
 * The context is against the window of the task, at most `CONTEXT_WINDOW`.
 * The description fills the room that is left.
 */
export function renderTask(
  task: Task,
  { now = Date.now(), columns = 100 }: { now?: number; columns?: number } = {},
): string {
  // The agent type has a plugin prefix for a plugin agent.
  const agentType =
    typeof task.agentType === "string"
      ? task.agentType.replace(/^[^:]+:/, "")
      : null;
  const window = windowOf(task.contextWindowSize);
  const model = task.model && shortModel(task.model);
  const start =
    typeof task.startTime === "number"
      ? task.startTime
      : Date.parse(task.startTime ?? "");
  const name = task.name || agentType || "agent";
  const tokens = task.tokenCount ?? 0;
  const line = [
    C.bold(name) +
      (agentType && agentType !== name ? C.dim(` (${agentType})`) : "") +
      (model ? ` ${C.dim(model)}${effortText(task.model, task.effort)}` : ""),
    tokens > 0 && contextText(tokens, window, now),
    Number.isFinite(start) && C.dim(minutes(now - start)),
  ]
    .filter(Boolean)
    .join(sep());
  const room = columns - width(line) - width(sep());
  const desc = String(task.description ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!desc || room <= 8) return line;
  return (
    line +
    sep() +
    C.dim(desc.length > room ? `${desc.slice(0, room - 1)}…` : desc)
  );
}

/** The JSON rows, `{id, content}`, for the status input `data` of the subagent status line. */
export function taskRows(data: SubagentInput, now = Date.now()): TaskRow[] {
  const columns = Number(data.columns) || Number(process.env["COLUMNS"]) || 100;
  return (Array.isArray(data.tasks) ? data.tasks : [])
    .filter(
      (task): task is Task & { id: string } =>
        Boolean(task?.id) && (!task.status || task.status === "running"),
    )
    .slice(0, SUBAGENT_ROWS_MAX)
    .map((task) => ({
      id: task.id,
      content: renderTask(task, { now, columns }),
    }));
}
