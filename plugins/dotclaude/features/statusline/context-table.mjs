// The exact context breakdown: the newest `/context` table of the transcript (design D33).
// `/context` writes its Markdown table into the transcript as a `user` record whose content starts with `## Context Usage`.
// Its rows come from the count-tokens API, so they replace the estimates of `breakdown.mjs` after the user runs it.
// Each run reads only the bytes after the kept offset, and at most `TABLE_TAIL_BYTES_MAX` of them.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { privateDir } from "../../lib/private-dir.mjs";
import { TABLE_TAIL_BYTES_MAX } from "./limits.mjs";

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

/**
 * The lines of `file` from `offset`, at most the last `max` bytes, the offset after the last full line,
 * and `reset` when the file is shorter than `offset`.
 * A read error gives `null`.
 */
function tail(file, offset, max) {
  let fd;
  try {
    fd = fs.openSync(file, "r");
    const size = fs.fstatSync(fd).size;
    // A file shorter than the offset is a new transcript, so the read starts again.
    const reset = size < offset;
    const from = Math.max(reset ? 0 : offset, size - max);
    const buffer = Buffer.alloc(size - from);
    const n = fs.readSync(fd, buffer, 0, buffer.length, from);
    // A line that Claude Code is still writing has no newline, so the next run reads it again.
    const end = buffer.lastIndexOf(0x0a, n - 1) + 1;
    return {
      lines: buffer.toString("utf8", 0, end).split("\n"),
      offset: from + end,
      reset,
    };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

/**
 * The newest `/context` table of the session in `data`, or `null`.
 * The table and the read offset stay in `dir`, so a run reads only the new lines of the transcript.
 * Any error gives `null`.
 */
export function readTable(data, dir = privateDir()) {
  try {
    const file = data?.transcript_path;
    if (typeof file !== "string" || !file) return null;
    const key = data.session_id || file;
    const state = dir
      ? path.join(
          dir,
          `dotclaude-table-${createHash("sha256").update(key).digest("hex").slice(0, 16)}.json`,
        )
      : null;
    let kept = { offset: 0, table: null };
    if (state)
      try {
        kept = JSON.parse(fs.readFileSync(state, "utf8"));
      } catch {
        // Not read yet, or another run is writing it.
      }
    const read = tail(file, kept.offset ?? 0, TABLE_TAIL_BYTES_MAX);
    if (!read) return kept.table ?? null;
    const table =
      lastTable(read.lines) ?? (read.reset ? null : (kept.table ?? null));
    if (state && read.offset !== kept.offset)
      try {
        fs.writeFileSync(state, JSON.stringify({ offset: read.offset, table }));
      } catch {
        // The result is right. Only the next run reads the lines again.
      }
    return table;
  } catch {
    return null;
  }
}
