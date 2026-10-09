// Reads of a Claude Code transcript (`~/.claude/projects/<folder>/<session>.jsonl`) for `just measure`.

import fs from "node:fs";

/** The parsed lines of a transcript. A line that is not a JSON object is left out. */
export function readEntries(file) {
  const entries = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    try {
      const entry = JSON.parse(line);
      if (entry !== null && typeof entry === "object") entries.push(entry);
    } catch {
      // A blank or a cut line has no entry.
    }
  }
  return entries;
}

/** The tokens of one request: input, cache creation, and cache read. */
export function contextOf(usage) {
  return (
    (usage.input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0)
  );
}

/**
 * The requests of a transcript in order, as `{ id, usage }`.
 * A request is written once for each content block, so the first entry of a message id stands.
 * An entry with no tokens (the synthetic message of Claude Code) is left out.
 */
export function requestsOf(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const message = entry.type === "assistant" ? entry.message : null;
    if (!message?.usage || contextOf(message.usage) === 0) continue;
    if (message.id && seen.has(message.id)) continue;
    if (message.id) seen.add(message.id);
    out.push({ id: message.id, usage: message.usage });
  }
  return out;
}

/** The characters of a tool-result `content`: a string or a list of text blocks. */
export function charsOf(content) {
  if (typeof content === "string") return content.length;
  if (!Array.isArray(content)) return 0;
  return content.reduce((n, block) => n + (block?.text?.length ?? 0), 0);
}

/** The tool calls of a transcript in order, as the `tool_use` blocks. */
export function toolCalls(entries) {
  const calls = [];
  for (const entry of entries) {
    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content)
      if (block?.type === "tool_use") calls.push(block);
  }
  return calls;
}
