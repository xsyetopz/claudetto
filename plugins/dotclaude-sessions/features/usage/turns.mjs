// The turn limit of an agent run: `maxTurns` from the agent file, the reserve before it, and the turns that a run used.

import fs from "node:fs";
import path from "node:path";
import { rethrowUnless } from "../../lib/errors.mjs";

/**
 * `maxTurns` of an agent type (`name` or `plugin:name`), from `<agentsDir>/<name>.md`, or null.
 * With no `agentsDir`, no agent has a limit.
 */
export function maxTurns(agentType, agentsDir) {
  if (!agentsDir || !/^(?:[\w.-]+:)?[a-z0-9-]+$/.test(agentType)) return null;
  try {
    const file = path.join(agentsDir, `${agentType.split(":").pop()}.md`);
    const head = fs.readFileSync(file, "utf8").split(/^---\s*$/m)[1] ?? "";
    const n = Number(/^maxTurns:\s*(\d+)\s*$/m.exec(head)?.[1]);
    return n > 0 ? n : null;
  } catch (err) {
    rethrowUnless(err, "ENOENT");
    return null;
  }
}

/** Turns before the limit at which an agent must report. */
export const reserve = (limit) => Math.max(3, Math.round(limit / 20));

function entryOf(line) {
  try {
    const entry = JSON.parse(line);
    return entry !== null && typeof entry === "object" ? entry : null;
  } catch (err) {
    rethrowUnless(err, "SyntaxError");
    return null;
  }
}

/**
 * Assistant messages since the last prompt that started a turn: tool results,
 * and meta entries without a wake-up origin, do not restart the count.
 */
export function turnsFromText(text) {
  const lines = text.split("\n");
  const ids = new Set();
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const entry = lines[i] && entryOf(lines[i]);
    if (!entry) continue;
    switch (entry.type) {
      case "assistant":
        if (entry.message?.id) ids.add(entry.message.id);
        break;
      case "user": {
        const content = entry.message?.content;
        const toolResult =
          Array.isArray(content) &&
          content.some((b) => b?.type === "tool_result");
        const kind = entry.origin?.kind;
        const restart =
          !entry.isMeta ||
          kind === "task-notification" ||
          kind === "coordinator";
        if (!toolResult && restart) return ids.size;
        break;
      }
    }
  }
  return ids.size;
}
