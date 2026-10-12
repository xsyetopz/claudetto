// The start of a session by source: how many characters each source adds to the first request.
// A source is the built-in set, a plugin (by the name prefix of its skills, agents, and tools),
// an MCP server, `CLAUDE.md` and memory, the output style, or the system prompt.
// The transcript has no request body, so the sizes are the characters of the records, and they are an estimate.

import { snapshotSizes } from "./first.ts";
import { contextOf, type Entry } from "./transcript.ts";

export const SOURCE = {
  builtIn: "built-in",
  builtInOrUser: "built-in or user (no plugin prefix)",
  memory: "CLAUDE.md and memory",
  style: "output style",
  system: "system prompt",
  other: "other attachments",
};

/** One item of the start: the source that it belongs to, and its size in characters. */
export type SourceItem = { source: string; chars: number };

/** One item of a listing, such as a skill or an agent: its name, and its size in characters with its continuation lines. */
export type ListingItem = { name: string; chars: number };

/** The characters and the item count of one source, as `{ source, chars, items }`. */
export type SourceSize = { source: string; chars: number; items: number };

/** The difference of one source between two starts: the size in each and `other` minus `base`. */
export type SourceDiff = {
  source: string;
  base: number;
  other: number;
  diff: number;
};

/** The source of a tool name: an MCP server, a plugin by its prefix, or the built-in tools. */
export const toolSource = (name: string): string => {
  const mcp = /^mcp__(.+?)__/.exec(name);
  if (mcp) return `MCP server ${mcp[1]}`;
  const prefix = /^([^:]+):/.exec(name);
  return prefix ? `plugin ${prefix[1]}` : SOURCE.builtIn;
};

/** The source of a skill or agent name: a plugin by its prefix, or the name with no plugin. */
export const nameSource = (name: string, builtIn: string[] = []): string => {
  if (builtIn.includes(name)) return SOURCE.builtIn;
  const prefix = /^([^:]+):/.exec(name);
  return prefix ? `plugin ${prefix[1]}` : SOURCE.builtInOrUser;
};

// The records before the first model request, which are the records that the first request holds.
const beforeFirstRequest = (entries: Entry[]): Entry[] => {
  const at = entries.findIndex(
    (e) =>
      e.type === "assistant" &&
      e.message?.usage &&
      contextOf(e.message.usage) > 0,
  );
  return at < 0 ? entries : entries.slice(0, at);
};

// The items of a listing: a line that starts with "- name: " begins an item, and the lines after it belong to it.
const listingItems = (text: unknown): ListingItem[] => {
  const items: ListingItem[] = [];
  for (const line of String(text ?? "").split("\n")) {
    const head = /^- (\S+?): /.exec(line);
    if (head) items.push({ name: head[1] as string, chars: line.length + 1 });
    else if (items.length)
      (items.at(-1) as ListingItem).chars += line.length + 1;
  }
  return items;
};

const sizeOf = (value: unknown): number =>
  typeof value === "string" ? value.length : JSON.stringify(value).length;

/** The `{ source, chars }` items of the first request. The sums of all items are the start. */
export const startItems = (entries: Entry[]): SourceItem[] => {
  const items: SourceItem[] = [];
  const add = (source: string, chars: number) => items.push({ source, chars });
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
      add(
        SOURCE.style,
        sizeOf(
          (a.style as { prompt?: unknown } | undefined)?.prompt ??
            a.style ??
            "",
        ),
      );
    } else add(SOURCE.other, sizeOf(a));
  }
  return items;
};

/** The characters of each source as `{ source, chars, items }`, the largest first. */
export const sourceSizes = (entries: Entry[]): SourceSize[] => {
  const by = new Map<string, SourceSize>();
  for (const { source, chars } of startItems(entries)) {
    const row = by.get(source) ?? { source, chars: 0, items: 0 };
    row.chars += chars;
    row.items += 1;
    by.set(source, row);
  }
  return [...by.values()].sort(
    (a, b) => b.chars - a.chars || a.source.localeCompare(b.source),
  );
};

/**
 * The difference of two starts by source, as `{ source, base, other, diff }`, the largest change first.
 * `base` is the start without the part under test, and `other` is the start with it.
 */
export const compareSources = (
  baseEntries: Entry[],
  otherEntries: Entry[],
): SourceDiff[] => {
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
};
