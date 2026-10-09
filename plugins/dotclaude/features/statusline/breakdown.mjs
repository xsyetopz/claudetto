// The context breakdown: what fills the context, from the start of the transcript (design D33).
// The status input has only totals, so the parts come from the first request of the session.
// The start size is exact, because it is the first `usage` of the main thread.
// The memory, skills, and agents are estimates with the divisor of the local estimate of `/context` (`charsPerToken`).
// The system prompt and the tools are the start size minus those estimates.
// The transcript is read one time for each session, and the result stays in the private folder.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { privateDir } from "../../lib/private-dir.mjs";
import {
  CHARS_PER_TOKEN,
  CHARS_PER_TOKEN_LEGACY,
  CONTEXT_BLOCK_MARGIN,
  LEGACY_TOKENIZER_MODELS,
  TRANSCRIPT_BYTES_MAX,
} from "./limits.mjs";

/**
 * The characters for each token of the model `id`, as the local estimate of `/context`:
 * the legacy divisor for a model in `LEGACY_TOKENIZER_MODELS` (also with a date suffix), else `CHARS_PER_TOKEN`.
 */
export function charsPerToken(id) {
  const name = String(id ?? "")
    .toLowerCase()
    .replace(/[._]/g, "-");
  return LEGACY_TOKENIZER_MODELS.some(
    (m) => name === m || name.startsWith(`${m}-`),
  )
    ? CHARS_PER_TOKEN_LEGACY
    : CHARS_PER_TOKEN;
}

const textLength = (value) => (typeof value === "string" ? value.length : 0);

/** The characters of one attachment of the start: `instructions`, `skill_listing`, or `agent_listing_delta`. */
function attachmentChars(a) {
  switch (a?.type) {
    case "instructions":
      return {
        memory: (Array.isArray(a.files) ? a.files : []).reduce(
          (sum, f) => sum + textLength(f?.content),
          0,
        ),
      };
    case "skill_listing":
      return { skills: textLength(a.content) };
    case "agent_listing_delta":
      return {
        skills: (Array.isArray(a.addedLines) ? a.addedLines : []).reduce(
          (sum, line) => sum + textLength(line),
          0,
        ),
      };
    default:
      return {};
  }
}

/**
 * `{start, memory, skills}` from the lines of a transcript head, or `null`.
 * `start` is the input, cache-write, and cache-read tokens of the first `usage` of the main thread.
 * `memory` and `skills` are estimates in tokens from the attachments before it.
 * `divisor` is the characters for each token (`charsPerToken`).
 * A line that is not JSON, such as one that the byte cap cut, is skipped.
 */
export function parseStart(lines, divisor = CHARS_PER_TOKEN) {
  let memory = 0;
  let skills = 0;
  for (const line of lines) {
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (record?.isSidechain) continue;
    if (record?.type === "attachment") {
      const chars = attachmentChars(record.attachment);
      memory += chars.memory ?? 0;
      skills += chars.skills ?? 0;
    } else if (record?.type === "assistant" && record.message?.usage) {
      const u = record.message.usage;
      const start =
        (u.input_tokens ?? 0) +
        (u.cache_creation_input_tokens ?? 0) +
        (u.cache_read_input_tokens ?? 0);
      if (!(start > 0)) continue;
      return {
        start,
        memory: Math.round(memory / divisor),
        skills: Math.round(skills / divisor),
      };
    }
  }
  return null;
}

/** The first `max` bytes of `file` as lines. A read error gives `null`. */
function head(file, max) {
  let fd;
  try {
    fd = fs.openSync(file, "r");
    const buffer = Buffer.alloc(Math.min(max, fs.fstatSync(fd).size));
    const n = fs.readSync(fd, buffer, 0, buffer.length, 0);
    return {
      lines: buffer.toString("utf8", 0, n).split("\n"),
      full: n === max,
    };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

/**
 * The start of the session in `data`, or `null`.
 * The first read that finds a `usage` is kept in `dir`, so later runs do not read the transcript.
 * A read with no `usage` is kept only when it hit the byte cap, because a short transcript can still grow.
 * Any error gives `null`.
 */
export function readBreakdown(data, dir = privateDir()) {
  try {
    const file = data?.transcript_path;
    if (typeof file !== "string" || !file) return null;
    const divisor = charsPerToken(data.model?.id);
    // The divisor is part of the key, so that a kept result with another divisor is not used.
    const key = `${data.session_id || file}:${divisor}`;
    const state = dir
      ? path.join(
          dir,
          `dotclaude-breakdown-${createHash("sha256").update(key).digest("hex").slice(0, 16)}.json`,
        )
      : null;
    if (state)
      try {
        return JSON.parse(fs.readFileSync(state, "utf8")).start;
      } catch {
        // Not read yet, or another run is writing it.
      }
    const read = head(file, TRANSCRIPT_BYTES_MAX);
    if (!read) return null;
    const start = parseStart(read.lines, divisor);
    if (state && (start || read.full))
      try {
        fs.writeFileSync(state, JSON.stringify({ start }));
      } catch {
        // The result is right. Only the next run reads the transcript again.
      }
    return start;
  } catch {
    return null;
  }
}

/**
 * The parts of the context, in tokens.
 * `total` is the current context tokens, and `window` is the context window.
 * With a `/context` table (`readTable` in `context-table.mjs`), `memory`, `skills`, and `system` are exact,
 * and `messages` is the total minus them.
 * Else `memory`, `skills`, and `system` are estimates from `start`, and with no start only `free` is known.
 */
export function partsOf(start, total, window, table = null) {
  const free = Math.max(0, window - CONTEXT_BLOCK_MARGIN - total);
  if (table)
    return {
      free,
      exact: true,
      ...table,
      messages: Math.max(0, total - table.system - table.memory - table.skills),
    };
  if (!start) return { free };
  return {
    free,
    memory: start.memory,
    skills: start.skills,
    system: Math.max(0, start.start - start.memory - start.skills),
    messages: Math.max(0, total - start.start),
  };
}
