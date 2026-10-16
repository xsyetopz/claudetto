// The pure parts of the read gate of the `reads` slice: line spans, the record of one file, and the test for the context.

import { MAX_SEEN_READS, READ_DEFAULT_LINES } from "../limits.ts";

/** The first and the last line of a read, both counted from 1. */
export type Span = readonly [start: number, end: number];

/** One earlier read: the `tool_use_id` of its call and the lines that it gave. */
export interface Seen {
  readonly id: string;
  readonly span: Span;
}

/** The stats of a file that tell that it did not change. */
export interface FileStat {
  readonly mtimeMs: number;
  readonly size: number;
}

/** What the gate knows about one file of one agent: its stats, its reads, and the reads that it denied one time. */
export interface FileRecord extends FileStat {
  readonly seen: readonly Seen[];
  readonly denied: readonly string[];
}

const positive = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value >= 1
    ? value
    : undefined;

/** The lines that a `Read` with this `offset` and `limit` gives. A read with no `limit` gives the default count. */
export const spanOf = (offset: unknown, limit: unknown): Span => {
  const start = positive(offset) ?? 1;
  const count = Math.min(
    positive(limit) ?? READ_DEFAULT_LINES,
    READ_DEFAULT_LINES,
  );
  return [start, start + count - 1];
};

/** The text of a span for the deny reason, such as `1 to 200`. */
export const spanText = (span: Span): string => `${span[0]} to ${span[1]}`;

/** The span in `seen` that holds `span`, after the spans that touch each other join. Undefined when the reads do not cover it. */
export const coveringSpan = (
  seen: readonly Seen[],
  span: Span,
): Span | undefined => {
  const sorted = seen.map((s) => s.span).sort((a, b) => a[0] - b[0]);
  let run: [number, number] | undefined;
  for (const [start, end] of sorted) {
    if (run && start <= run[1] + 1) run = [run[0], Math.max(run[1], end)];
    else {
      if (run && run[0] <= span[0] && span[1] <= run[1]) return run;
      run = [start, end];
    }
  }
  return run && run[0] <= span[0] && span[1] <= run[1] ? run : undefined;
};

/** True when the file has the stats of the record. */
export const unchanged = (record: FileRecord, stat: FileStat): boolean =>
  record.mtimeMs === stat.mtimeMs && record.size === stat.size;

/** The record after a read. A file that changed starts a new record. The record drops the oldest reads over the bound. */
export const withRead = (
  record: FileRecord | undefined,
  stat: FileStat,
  read: Seen,
): FileRecord => {
  const old = record && unchanged(record, stat) ? record : undefined;
  return {
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    seen: [...(old?.seen ?? []), read].slice(-MAX_SEEN_READS),
    denied: old?.denied ?? [],
  };
};

/** The key of a span in `denied`. */
export const spanKey = (span: Span): string => `${span[0]}-${span[1]}`;

/** The text of a `tool_result` content that the gate compares with the cleared text: a string, or the text blocks joined. */
const textOf = (content: unknown): string =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content
          .map((b) =>
            b?.type === "text" && typeof b.text === "string" ? b.text : "",
          )
          .join("")
      : "";

/** The text that Claude Code writes into a `tool_result` when it clears old tool results. */
export const CLEARED_RESULT = "[Old tool result content cleared]";

/** The ids in `ids` whose `tool_result` is in the messages with content that is not the cleared text. */
export const idsInContext = (
  messages: readonly unknown[],
  ids: ReadonlySet<string>,
): Set<string> => {
  const live = new Set<string>();
  for (const message of messages) {
    const content = (message as { content?: unknown } | null)?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type !== "tool_result" || !ids.has(block.tool_use_id))
        continue;
      if (textOf(block.content) !== CLEARED_RESULT) live.add(block.tool_use_id);
    }
  }
  return live;
};
