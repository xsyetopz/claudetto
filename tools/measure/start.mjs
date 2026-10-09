// The start of a session: the tokens of the first request, and the size of each part that the transcript records.
// The `prompt_snapshot` attachment holds the system blocks and the tool schemas of a request.

import { contextOf, requestsOf } from "./transcript.mjs";

/** The tokens of the first request, from its API usage, or null when the transcript has no request. */
export function firstRequest(entries) {
  const usage = requestsOf(entries)[0]?.usage;
  if (!usage) return null;
  return {
    input_tokens: usage.input_tokens ?? 0,
    cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    total: contextOf(usage),
  };
}

/** The sizes in characters of the system blocks and tools of the first snapshot that has tools. */
export function snapshotSizes(entries) {
  const snapshots = entries
    .map((e) => e.attachment)
    .filter((a) => a?.type === "prompt_snapshot");
  const snap = snapshots.find((a) => Array.isArray(a.tools)) ?? snapshots[0];
  if (!snap) return null;
  const tools = (snap.tools ?? []).map((t) => ({
    name: t.name,
    chars: JSON.stringify(t).length,
  }));
  return {
    toolChars: JSON.stringify(snap.tools ?? []).length,
    tools,
    systemBlocks: (snap.systemPrompt ?? []).map((text) => ({
      head: String(text).trim().replace(/\s+/g, " ").slice(0, 40),
      chars: String(text).length,
      bytes: Buffer.byteLength(String(text)),
    })),
  };
}

/** The characters of each attachment type, as `{ type, count, chars }` in order of size. */
export function attachmentSizes(entries) {
  const by = new Map();
  for (const { attachment } of entries) {
    if (!attachment || attachment.type === "prompt_snapshot") continue;
    const row = by.get(attachment.type) ?? {
      type: attachment.type,
      count: 0,
      chars: 0,
    };
    row.count += 1;
    row.chars += JSON.stringify(attachment).length;
    by.set(attachment.type, row);
  }
  return [...by.values()].sort((a, b) => b.chars - a.chars);
}

/** The verdict of the start budget: `ok`, and a line that names the sum, the bound, and the difference when over. */
export function checkBudget(total, bound) {
  const over = total - bound;
  return {
    ok: over <= 0,
    message:
      over <= 0
        ? `Start ${total} tokens, at or below the bound ${bound}.`
        : `Start ${total} tokens, over the bound ${bound} by ${over}.`,
  };
}

/** The bytes of every string value in `value`, so that a record counts its text and not its JSON syntax. */
function textBytes(value) {
  if (typeof value === "string") return Buffer.byteLength(value);
  if (Array.isArray(value)) return value.reduce((n, v) => n + textBytes(v), 0);
  if (value && typeof value === "object")
    return Object.values(value).reduce((n, v) => n + textBytes(v), 0);
  return 0;
}

/**
 * The bytes of the text of the first request with no tool schemas, or null when the transcript has no snapshot.
 * It is the system blocks of the first snapshot plus the attachments (environment, output style, hook context, and listings)
 * that come before the first user entry that is not a meta entry.
 * The transcript has no request body, so this is an estimate from the records.
 */
export function firstRequestBytes(entries) {
  const snap = snapshotSizes(entries);
  if (!snap) return null;
  let bytes = snap.systemBlocks.reduce((n, b) => n + b.bytes, 0);
  for (const entry of entries) {
    if (entry.type === "user" && !entry.isMeta) break;
    if (entry.attachment && entry.attachment.type !== "prompt_snapshot")
      bytes += textBytes(entry.attachment);
    else if (entry.type === "user" && entry.isMeta)
      bytes += textBytes(entry.message?.content);
  }
  return bytes;
}
