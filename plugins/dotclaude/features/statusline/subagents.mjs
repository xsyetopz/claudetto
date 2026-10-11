// The subagent status line: one row for each running subagent.
// A row has the name, the agent type, the model and effort, the context against its window, and the run time.

import { windowOf } from "../../lib/budget.mjs";
import { minutes, shortModel } from "./format.mjs";
import { SUBAGENT_ROWS_MAX } from "./limits.mjs";
import { C, sep, width } from "./paint.mjs";
import { contextText, effortText } from "./segments.mjs";

/**
 * The text of one row for `task`.
 * The context is against the window of the task, at most `CONTEXT_WINDOW`.
 * The description fills the room that is left.
 */
export function renderTask(task, { now = Date.now(), columns = 100 } = {}) {
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
      : Date.parse(task.startTime);
  const name = task.name || agentType || "agent";
  const line = [
    C.bold(name) +
      (agentType && agentType !== name ? C.dim(` (${agentType})`) : "") +
      (model ? ` ${C.dim(model)}${effortText(task.model, task.effort)}` : ""),
    task.tokenCount > 0 && contextText(task.tokenCount, window, now),
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
export function taskRows(data, now = Date.now()) {
  const columns = Number(data.columns) || Number(process.env.COLUMNS) || 100;
  return (Array.isArray(data.tasks) ? data.tasks : [])
    .filter((task) => task?.id && (!task.status || task.status === "running"))
    .slice(0, SUBAGENT_ROWS_MAX)
    .map((task) => ({
      id: task.id,
      content: renderTask(task, { now, columns }),
    }));
}
