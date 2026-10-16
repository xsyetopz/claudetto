// What a session sent at its start, and where its context went, from a transcript.
//
// The report has the tokens of the first request, the characters of each source (built-in, plugins, MCP servers,
// `CLAUDE.md` and memory, the output style, and the system prompt), the size of each tool, system block, and attachment,
// the requests and context of each subagent, the tool-result size of each tool of the main session,
// and the repeat file reads.
// It has the bytes of the first request text with no tool schemas.
// The comparison of two starts is the difference of the two by source, such as a session without a plugin and one with it.

import path from "node:path";
import { rethrowUnless, UNREADABLE } from "../../../../../kernel/errors.ts";
import type { Store } from "../ports.ts";
import {
  DIFFERENCE_BY_SOURCE,
  NO_REQUEST,
  TEXT_SIZE_UNKNOWN,
} from "../prompts.ts";
import {
  attachmentSizes,
  type BudgetVerdict,
  checkBudget,
  firstRequest,
  firstRequestBytes,
  type Snapshot,
  snapshotSizes,
  type Tokens,
} from "./first.ts";
import {
  repeatReads,
  type SubagentRun,
  subagentRuns,
  toolResults,
} from "./session.ts";
import {
  compareSources,
  type SourceDiff,
  type SourceSize,
  sourceSizes,
} from "./sources.ts";
import { type Entry, readEntries } from "./transcript.ts";

/** The bounds of the first request text in bytes, from `--text-min` and `--text-max`. */
export type TextLimits = {
  textMin?: number | undefined;
  textMax?: number | undefined;
};

/** The failures and advisories of the first request text in bytes. */
export type TextCheck = { failures: string[]; advisories: string[] };

/**
 * How a report ends: `ok`, `over` when a bound that the user gave is not met or cannot be checked,
 * and `no-data` when the transcript has no request, so that no bound applies.
 */
export type ReportStatus = "ok" | "over" | "no-data";

/** The text of a report, its status, and the tokens of the first request. */
export type ReportResult = {
  text: string;
  status: ReportStatus;
  first: Tokens | null;
};

const n = (x: number): string => x.toLocaleString("en-US");
const signed = (x: number): string => `${x > 0 ? "+" : ""}${n(x)}`;
const k = (x: number): string => `${Math.round(x / 1000)}K`;

/** True when `file` exists. */
export const exists = async (store: Store, file: string): Promise<boolean> => {
  try {
    await store.mtime(file);
    return true;
  } catch (err) {
    rethrowUnless(err, ...UNREADABLE);
    return false;
  }
};

/** The newest main transcript of the project folder `dir`, or `null` when it has none. */
export const newestSession = async (
  store: Store,
  dir: string,
): Promise<string | null> => {
  const files = (await store.list(dir)).filter((f) => f.endsWith(".jsonl"));
  const times = new Map<string, number>();
  for (const f of files) times.set(f, await store.mtime(path.join(dir, f)));
  files.sort((a, b) => (times.get(b) ?? 0) - (times.get(a) ?? 0));
  return files[0] ? path.join(dir, files[0]) : null;
};

/** The failures and advisories for the bytes of the first request text, from `--text-min` and `--text-max`. */
const checkTextBytes = (
  size: number,
  { textMin, textMax }: TextLimits,
): TextCheck => {
  const out: TextCheck = { failures: [], advisories: [] };
  if (textMax !== undefined && size > textMax)
    out.failures.push(
      `first request text is ${size} bytes, ${size - textMax} above ${textMax}`,
    );
  if (textMin !== undefined && size < textMin)
    out.advisories.push(
      `first request text is ${size} bytes, ${textMin - size} below ${textMin}`,
    );
  return out;
};

/**
 * The text of the report for a session file.
 * `bound` is the token bound of the first request, or undefined for no bound.
 * `limits` holds `textMin` and `textMax`, the bytes of the first request text, or none.
 */
export const reportOf = async (
  store: Store,
  file: string,
  bound: number | undefined,
  limits: TextLimits = {},
): Promise<ReportResult> => {
  const entries: Entry[] = await readEntries(store, file);
  const out = [`Session ${path.basename(file, ".jsonl")}`, ""];
  const first = firstRequest(entries);
  if (!first)
    return {
      text: NO_REQUEST({ title: out[0] as string }),
      status: "no-data",
      first,
    };
  const verdict: BudgetVerdict | null =
    bound === undefined ? null : checkBudget(first.total, bound);
  out.push(
    `First request: ${n(first.total)} tokens`,
    `  input ${n(first.input_tokens)}, cache creation ${n(first.cache_creation_input_tokens)}, cache read ${n(first.cache_read_input_tokens)}`,
  );
  if (verdict) out.push(`  ${verdict.message}`);
  out.push("");
  const sources: SourceSize[] = sourceSizes(entries);
  if (sources.length) {
    out.push("Start by source (chars of the records, an estimate)");
    for (const s of sources)
      out.push(
        `  ${n(s.chars).padStart(8)}  ${String(s.items).padStart(4)} items  ${s.source}`,
      );
    out.push("");
  }
  const textBytes = firstRequestBytes(entries);
  const sizes = textBytes === null ? null : checkTextBytes(textBytes, limits);
  // A size bound that the user gave cannot pass when the transcript has no snapshot to measure.
  const unchecked =
    textBytes === null &&
    (limits.textMax !== undefined || limits.textMin !== undefined);
  if (unchecked) {
    out.push(TEXT_SIZE_UNKNOWN, "");
  }
  if (sizes) {
    out.push(
      `First request text, no tool schemas: ${n(textBytes as number)} bytes`,
    );
    for (const line of sizes.failures) out.push(`  Over: ${line}`);
    for (const line of sizes.advisories) out.push(`  Advisory: ${line}`);
    out.push("");
  }
  const snap: Snapshot | null = snapshotSizes(entries);
  if (snap) {
    out.push(`Tools: ${n(snap.toolChars)} chars`);
    for (const t of snap.tools)
      out.push(`  ${t.name.padEnd(18)} ${n(t.chars).padStart(7)}`);
    out.push("", "System blocks (chars)");
    for (const b of snap.systemBlocks)
      out.push(`  ${n(b.chars).padStart(7)}  ${b.head}`);
    out.push("");
  }
  out.push("Attachments (chars of the record)");
  for (const a of attachmentSizes(entries))
    out.push(
      `  ${a.type.padEnd(26)} ${String(a.count).padStart(3)}x ${n(a.chars).padStart(8)}`,
    );
  const runs: SubagentRun[] = await subagentRuns(store, file);
  if (runs.length) {
    const largest = Math.max(...runs.map((r) => r.finalContext));
    out.push(
      "",
      `Subagents: ${runs.length} runs, largest final context ${n(largest)} (${k(largest)})`,
    );
    out.push(
      // biome-ignore lint/plugin: the header row is data, and the code aligns the columns under it
      "  type                         requests  final context  total input",
    );
    for (const r of runs)
      out.push(
        `  ${r.agentType.padEnd(28)} ${String(r.requests).padStart(8)} ${n(r.finalContext).padStart(14)} ${n(r.totalInput).padStart(12)}`,
      );
  }
  out.push("", "Tool results of the main session (chars)");
  for (const r of toolResults(entries))
    out.push(
      `  ${r.tool.padEnd(18)} ${String(r.count).padStart(4)}x ${n(r.chars).padStart(9)}  largest ${n(r.largest)}`,
    );
  const rr = repeatReads(entries);
  out.push("", `File reads: ${rr.reads}, repeat reads: ${rr.repeats}`);
  for (const [name, count] of rr.most) out.push(`  ${name} ${count}`);
  const isOver =
    verdict?.ok === false ||
    !!sizes?.failures.length ||
    (unchecked && limits.textMax !== undefined);
  return { text: out.join("\n"), status: isOver ? "over" : "ok", first };
};

/** The text of the difference of two starts by source: `other` minus `base`. */
export const compareText = async (
  store: Store,
  baseFile: string,
  otherFile: string,
): Promise<string> => {
  const base = await readEntries(store, baseFile);
  const other = await readEntries(store, otherFile);
  const a = firstRequest(base);
  const b = firstRequest(other);
  const out = [
    `Base ${path.basename(baseFile, ".jsonl")}, other ${path.basename(otherFile, ".jsonl")}`,
    "",
  ];
  if (a && b)
    out.push(
      `First request tokens: base ${n(a.total)}, other ${n(b.total)}, difference ${signed(b.total - a.total)}`,
      "",
    );
  out.push(DIFFERENCE_BY_SOURCE);
  const rows: SourceDiff[] = compareSources(base, other);
  if (!rows.length) out.push("  No difference.");
  for (const r of rows)
    out.push(
      `  ${signed(r.diff).padStart(9)}  base ${n(r.base).padStart(8)}  other ${n(r.other).padStart(8)}  ${r.source}`,
    );
  return out.join("\n");
};
