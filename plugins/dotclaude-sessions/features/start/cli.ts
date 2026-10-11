// What a session sent at its start, and where its context went, from a transcript.
// The `dotclaude-start` bin calls `main`.
//
// Prints the tokens of the first request, the characters of each source (built-in, plugins, MCP servers,
// `CLAUDE.md` and memory, the output style, and the system prompt), the size of each tool, system block, and attachment,
// the requests and context of each subagent, the tool-result size of each tool of the main session,
// and the repeat file reads.
// Prints the bytes of the first request text with no tool schemas.
// Exits 1 when the first request is above `--bound N`, or its text is outside `--text-min N` and `--text-max N`.
// With no bound, it never fails on size.
// `--compare BASE.jsonl OTHER.jsonl` prints the difference of two starts by source, such as a session without a plugin and one with it.
// With no file, it reads the newest main transcript of this checkout.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type Entry, readEntries } from "../../lib/transcript.ts";
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

/** The bounds of the first request text in bytes, from `--text-min` and `--text-max`. */
export type TextLimits = {
  textMin?: number | undefined;
  textMax?: number | undefined;
};

/** The failures and advisories of the first request text in bytes. */
export type TextCheck = { failures: string[]; advisories: string[] };

/** The text of a report, whether it passes, and the tokens of the first request. */
export type ReportResult = { text: string; ok: boolean; first: Tokens | null };

const n = (x: number): string => x.toLocaleString("en-US");
const signed = (x: number): string => `${x > 0 ? "+" : ""}${n(x)}`;
const k = (x: number): string => `${Math.round(x / 1000)}K`;

/** The newest main transcript of the project folder of `cwd`. */
function newestSession(cwd: string, env: NodeJS.ProcessEnv): string | null {
  const root = env["CLAUDE_CONFIG_DIR"] || path.join(os.homedir(), ".claude");
  const dir = path.join(root, "projects", cwd.replace(/[^A-Za-z0-9]/g, "-"));
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"))
    : [];
  const mtime = (f: string): number => fs.statSync(path.join(dir, f)).mtimeMs;
  files.sort((a, b) => mtime(b) - mtime(a));
  return files[0] ? path.join(dir, files[0]) : null;
}

/** The failures and advisories for the bytes of the first request text, from `--text-min` and `--text-max`. */
function checkTextBytes(
  size: number,
  { textMin, textMax }: TextLimits,
): TextCheck {
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
}

/**
 * The text of the report for a session file.
 * `bound` is the token bound of the first request, or undefined for no bound.
 * `limits` holds `textMin` and `textMax`, the bytes of the first request text, or none.
 */
export async function reportOf(
  file: string,
  bound: number | undefined,
  limits: TextLimits = {},
): Promise<ReportResult> {
  const entries: Entry[] = await readEntries(file);
  const out = [`Session ${path.basename(file, ".jsonl")}`, ""];
  const first = firstRequest(entries);
  if (!first)
    return {
      text: `${out[0]}\nNo request with usage. The transcript has no model call yet.`,
      ok: false,
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
  const runs: SubagentRun[] = await subagentRuns(file);
  if (runs.length) {
    const largest = Math.max(...runs.map((r) => r.finalContext));
    out.push(
      "",
      `Subagents: ${runs.length} runs, largest final context ${n(largest)} (${k(largest)})`,
    );
    out.push(
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
  return {
    text: out.join("\n"),
    ok: (verdict?.ok ?? true) && !sizes?.failures.length,
    first,
  };
}

/** The text of the difference of two starts by source: `other` minus `base`. */
export async function compareText(
  baseFile: string,
  otherFile: string,
): Promise<string> {
  const base = await readEntries(baseFile);
  const other = await readEntries(otherFile);
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
  out.push("Difference by source (chars of the records, other minus base)");
  const rows: SourceDiff[] = compareSources(base, other);
  if (!rows.length) out.push("  No difference.");
  for (const r of rows)
    out.push(
      `  ${signed(r.diff).padStart(9)}  base ${n(r.base).padStart(8)}  other ${n(r.other).padStart(8)}  ${r.source}`,
    );
  return out.join("\n");
}

const USAGE = `Usage: dotclaude-start [SESSION.jsonl] [--bound N] [--text-min N] [--text-max N]
       dotclaude-start --compare BASE.jsonl OTHER.jsonl

Prints the start of a session by source, from its transcript.
With no file, it reads the newest transcript of this folder.
--bound N       Exit 1 when the first request is above N tokens.
--text-min N    Advise when the first request text is below N bytes.
--text-max N    Exit 1 when the first request text is above N bytes.
--compare       Print the difference of two starts by source, other minus base.`;

const number = (args: string[], name: string): number | undefined => {
  const at = args.indexOf(name);
  return at < 0 ? undefined : Number(args[at + 1]);
};

/** Runs the bin with `args`, prints to stdout and stderr, and returns the exit code. */
export async function main(
  args: string[],
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  const compareAt = args.indexOf("--compare");
  if (compareAt >= 0) {
    const files = args.slice(compareAt + 1, compareAt + 3);
    if (files.length < 2 || !files.every((f) => fs.existsSync(f))) {
      console.error("Give two transcript paths: --compare BASE OTHER.");
      return 2;
    }
    console.log(await compareText(files[0] as string, files[1] as string));
    return 0;
  }
  const valued = ["--bound", "--text-min", "--text-max"];
  const file =
    args.find(
      (a, i) => !a.startsWith("--") && !valued.includes(args[i - 1] as string),
    ) ?? newestSession(cwd, env);
  if (!file || !fs.existsSync(file)) {
    console.error(
      "No transcript found. Give the path of a session .jsonl file.",
    );
    return 2;
  }
  const { text, ok } = await reportOf(file, number(args, "--bound"), {
    textMin: number(args, "--text-min"),
    textMax: number(args, "--text-max"),
  });
  console.log(text);
  return ok ? 0 : 1;
}
