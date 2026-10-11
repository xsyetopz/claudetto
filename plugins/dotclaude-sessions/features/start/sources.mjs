// The start of a session by source: how many characters each source adds to the first request.
// A source is the built-in set, a plugin (by the name prefix of its skills, agents, and tools),
// an MCP server, `CLAUDE.md` and memory, the output style, or the system prompt.
// The transcript has no request body, so the sizes are the characters of the records, and they are an estimate.

import { contextOf } from "../../lib/transcript.mjs";
import { snapshotSizes } from "./first.mjs";

export const SOURCE = {
  builtIn: "built-in",
  builtInOrUser: "built-in or user (no plugin prefix)",
  memory: "CLAUDE.md and memory",
  style: "output style",
  system: "system prompt",
  other: "other attachments",
};

/** The source of a tool name: an MCP server, a plugin by its prefix, or the built-in tools. */
export function toolSource(name) {
  const mcp = /^mcp__(.+?)__/.exec(name);
  if (mcp) return `MCP server ${mcp[1]}`;
  const prefix = /^([^:]+):/.exec(name);
  return prefix ? `plugin ${prefix[1]}` : SOURCE.builtIn;
}

/** The source of a skill or agent name: a plugin by its prefix, or the name with no plugin. */
export function nameSource(name, builtIn = []) {
  if (builtIn.includes(name)) return SOURCE.builtIn;
  const prefix = /^([^:]+):/.exec(name);
  return prefix ? `plugin ${prefix[1]}` : SOURCE.builtInOrUser;
}

// The records before the first model request, which are the records that the first request holds.
function beforeFirstRequest(entries) {
  const at = entries.findIndex(
    (e) =>
      e.type === "assistant" &&
      e.message?.usage &&
      contextOf(e.message.usage) > 0,
  );
  return at < 0 ? entries : entries.slice(0, at);
}

// The items of a listing: a line that starts with "- name: " begins an item, and the lines after it belong to it.
function listingItems(text) {
  const items = [];
  for (const line of String(text ?? "").split("\n")) {
    const head = /^- (\S+?): /.exec(line);
    if (head) items.push({ name: head[1], chars: line.length + 1 });
    else if (items.length) items.at(-1).chars += line.length + 1;
  }
  return items;
}

const sizeOf = (value) =>
  typeof value === "string" ? value.length : JSON.stringify(value).length;

/** The `{ source, chars }` items of the first request. The sums of all items are the start. */
export function startItems(entries) {
  const items = [];
  const add = (source, chars) => items.push({ source, chars });
  const snap = snapshotSizes(entries);
  for (const t of snap?.tools ?? []) add(toolSource(t.name), t.chars);
  for (const b of snap?.systemBlocks ?? []) add(SOURCE.system, b.chars);
  for (const { attachment: a } of beforeFirstRequest(entries)) {
    if (!a || a.type === "prompt_snapshot") continue;
    if (a.type === "skill_listing") {
      for (const i of listingItems(a.content)) add(nameSource(i.name), i.chars);
    } else if (a.type === "agent_listing_delta") {
      for (const line of a.addedLines ?? [])
        for (const i of listingItems(line))
          add(nameSource(i.name, a.builtInTypes), i.chars);
    } else if (a.type === "deferred_tools_delta") {
      for (const line of a.addedLines ?? []) add(toolSource(line), line.length);
    } else if (a.type === "instructions" || /memor/i.test(a.type)) {
      add(SOURCE.memory, sizeOf(a.files ?? a));
    } else if (a.type === "output_style_instructions") {
      add(SOURCE.style, sizeOf(a.style?.prompt ?? a.style ?? ""));
    } else add(SOURCE.other, sizeOf(a));
  }
  return items;
}

/** The characters of each source as `{ source, chars, items }`, the largest first. */
export function sourceSizes(entries) {
  const by = new Map();
  for (const { source, chars } of startItems(entries)) {
    const row = by.get(source) ?? { source, chars: 0, items: 0 };
    row.chars += chars;
    row.items += 1;
    by.set(source, row);
  }
  return [...by.values()].sort(
    (a, b) => b.chars - a.chars || a.source.localeCompare(b.source),
  );
}

/**
 * The difference of two starts by source, as `{ source, base, other, diff }`, the largest change first.
 * `base` is the start without the part under test, and `other` is the start with it.
 */
export function compareSources(baseEntries, otherEntries) {
  const base = new Map(
    sourceSizes(baseEntries).map((r) => [r.source, r.chars]),
  );
  const other = new Map(
    sourceSizes(otherEntries).map((r) => [r.source, r.chars]),
  );
  return [...new Set([...base.keys(), ...other.keys()])]
    .map((source) => {
      const b = base.get(source) ?? 0;
      const o = other.get(source) ?? 0;
      return { source, base: b, other: o, diff: o - b };
    })
    .filter((r) => r.diff !== 0)
    .sort(
      (a, b) =>
        Math.abs(b.diff) - Math.abs(a.diff) || a.source.localeCompare(b.source),
    );
}
