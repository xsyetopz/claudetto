// The exact context breakdown: the newest `/context` table of the transcript (design D33).
// `/context` writes its Markdown table into the transcript as a `user` record whose content starts with `## Context Usage`.
// Its rows come from the count-tokens API.
// Each call reads the last `TABLE_TAIL_BYTES_MAX` bytes of the transcript and keeps no state (design D35).

import fs from "node:fs";
import { CONTEXT_BLOCK_MARGIN, TABLE_TAIL_BYTES_MAX } from "./limits.mjs";

const HEADER = "## Context Usage";
const ROW = /^\|\s*([^|]+?)\s*\|\s*~?\s*([\d.]+)\s*([kKmM]?)\s*\|/;
const SCALE = { "": 1, k: 1e3, m: 1e6 };

/** The category names of the table, for each part of the breakdown. */
const PARTS = {
  "System prompt": "system",
  "System tools": "system",
  "Custom agents": "skills",
  "Memory files": "memory",
  Skills: "skills",
};

/**
 * `{system, memory, skills}` in tokens from the text of one `/context` record, or `null`.
 * Only the first table, the categories, is read.
 * `System tools (deferred)` is not a part, because the deferred tools are not in the context
 * (the `Tokens` total of `/context` leaves them out).
 */
export function parseTable(text) {
  if (typeof text !== "string" || !text.startsWith(HEADER)) return null;
  const parts = { system: 0, memory: 0, skills: 0 };
  let rows = 0;
  let inTable = false;
  for (const line of text.split("\n")) {
    if (inTable && !line.startsWith("|")) break;
    const m = ROW.exec(line);
    if (!m) continue;
    inTable = true;
    const key = PARTS[m[1]];
    if (!key) continue;
    parts[key] += Math.round(Number(m[2]) * SCALE[m[3].toLowerCase()]);
    rows++;
  }
  return rows ? parts : null;
}

/** The newest table in `lines`, or `null`. A line that is not JSON, such as a cut first line, is skipped. */
export function lastTable(lines) {
  let table = null;
  for (const line of lines) {
    if (!line.includes(HEADER)) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (record?.type !== "user" || record.isSidechain) continue;
    table = parseTable(record.message?.content) ?? table;
  }
  return table;
}

/** The last `max` bytes of `file` as lines. The first line may be cut, and `lastTable` skips it. A read error gives `null`. */
function tail(file, max) {
  let fd;
  try {
    fd = fs.openSync(file, "r");
    const size = fs.fstatSync(fd).size;
    const from = Math.max(0, size - max);
    const buffer = Buffer.alloc(size - from);
    const n = fs.readSync(fd, buffer, 0, buffer.length, from);
    return buffer.toString("utf8", 0, n).split("\n");
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

/**
 * The newest `/context` table in the last `TABLE_TAIL_BYTES_MAX` bytes of the transcript in `data`, or `null`.
 * Each call reads the tail again and keeps no offset and no table.
 * Any error gives `null`.
 */
export function readTable(data) {
  const file = data?.transcript_path;
  if (typeof file !== "string" || !file) return null;
  const lines = tail(file, TABLE_TAIL_BYTES_MAX);
  return lines ? lastTable(lines) : null;
}

/**
 * The parts of the context, in tokens.
 * `total` is the current context tokens, and `window` is the context window.
 * With a `/context` table, `memory`, `skills`, and `system` are exact, and `messages` is the total minus them.
 * With no table, only `free` is known, because an estimate needs a state file (design D35).
 */
export function partsOf(total, window, table = null) {
  const free = Math.max(0, window - CONTEXT_BLOCK_MARGIN - total);
  if (!table) return { free };
  return {
    free,
    exact: true,
    ...table,
    messages: Math.max(0, total - table.system - table.memory - table.skills),
  };
}
