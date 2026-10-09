// The turn bound of a subagent (design D22, task 10.9).
// A subagent has no turn count in its context, so the hook counts the turns in the transcript
// and reads `maxTurns` from the agent file.

import { readFileSync } from "node:fs";
import path from "node:path";
import { TURNS_LEFT_AT } from "./limits.mjs";

/** The folder of the agent files of this plugin. */
const AGENTS_DIR = path.join(import.meta.dirname, "../../agents");

/** All parsed rows of `file`. The count of turns needs the whole file, because a tail can cut early rows. */
export function allRows(file) {
  const rows = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    try {
      rows.push(JSON.parse(line));
    } catch {}
  }
  return rows;
}

/**
 * The assistant turns in `rows`.
 * A row can repeat the `message.id` of an earlier row, and one id is one API response, so the count is of distinct ids.
 * A row with no id counts as one turn.
 */
export function countTurns(rows) {
  const ids = new Set();
  let anonymous = 0;
  for (const row of rows) {
    if (row?.type !== "assistant" || !row.message) continue;
    if (row.message.id) ids.add(row.message.id);
    else anonymous++;
  }
  return ids.size + anonymous;
}

/** The `maxTurns` in the frontmatter of the agent `agentType` (a `dotclaude:` prefix is allowed), or undefined. */
export function maxTurnsOf(agentType, dir = AGENTS_DIR) {
  const name = String(agentType ?? "").replace(/^dotclaude:/, "");
  if (!/^[a-z][a-z0-9-]*$/.test(name)) return undefined;
  try {
    const head = readFileSync(path.join(dir, `${name}.md`), "utf8").split(
      /\n---/,
    )[0];
    const value = /^maxTurns:\s*(\d+)\s*$/m.exec(head)?.[1];
    return value ? Number(value) : undefined;
  } catch {
    return undefined;
  }
}

/** The facts for a subagent with `turns` of `maxTurns`, or undefined while more than `TURNS_LEFT_AT` turns are left. */
export function turnFact(turns, maxTurns) {
  if (!maxTurns || maxTurns - turns > TURNS_LEFT_AT) return undefined;
  return `You made ${turns} turns, and the limit is ${maxTurns} turns. The run stops at the limit with no report.`;
}
