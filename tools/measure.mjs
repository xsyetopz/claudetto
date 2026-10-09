#!/usr/bin/env bun
// What a session sent at its start, and where its context went, from a transcript.
//
//   bun tools/measure.mjs [SESSION.jsonl] [--bound N]
//
// Prints the tokens of the first request, the size of each tool, system block, and attachment,
// the requests and context of each subagent, the tool-result size of each tool of the main session,
// and the repeat file reads.
// Prints the bytes of the first request text with no tool schemas, and the advisory when it is below `FIRST_REQUEST_LOW_BYTES`.
// Exits 1 when the first request is above `START_TOKENS` (or `--bound`), or its text is above `FIRST_REQUEST_HIGH_BYTES`.
// With no file, it reads the newest main transcript of this checkout.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { START_TOKENS } from "./limits.mjs";
import {
  attachmentSizes,
  checkBudget,
  firstRequest,
  firstRequestBytes,
  snapshotSizes,
} from "./measure/start.mjs";
import { readEntries } from "./measure/transcript.mjs";
import { repeatReads, subagentRuns, toolResults } from "./measure/usage.mjs";
import { checkFirstRequestBytes } from "./sizes.mjs";

const n = (x) => x.toLocaleString("en-US");
const k = (x) => `${Math.round(x / 1000)}K`;

/** The newest main transcript of the project folder of `cwd`. */
function newestSession(cwd) {
  const root =
    process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  const dir = path.join(root, "projects", cwd.replace(/[^A-Za-z0-9]/g, "-"));
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"))
    : [];
  const mtime = (f) => fs.statSync(path.join(dir, f)).mtimeMs;
  files.sort((a, b) => mtime(b) - mtime(a));
  return files[0] ? path.join(dir, files[0]) : null;
}

/** The text of the report for a session file. */
export function reportOf(file, bound) {
  const entries = readEntries(file);
  const out = [`Session ${path.basename(file, ".jsonl")}`, ""];
  const first = firstRequest(entries);
  if (!first)
    return { text: `${out[0]}\nNo request with usage.`, ok: false, first };
  const verdict = checkBudget(first.total, bound);
  out.push(
    `First request: ${n(first.total)} tokens`,
    `  input ${n(first.input_tokens)}, cache creation ${n(first.cache_creation_input_tokens)}, cache read ${n(first.cache_read_input_tokens)}`,
    `  ${verdict.message}`,
    "",
  );
  const textBytes = firstRequestBytes(entries);
  const sizes = textBytes === null ? null : checkFirstRequestBytes(textBytes);
  if (sizes) {
    out.push(`First request text, no tool schemas: ${n(textBytes)} bytes`);
    for (const line of sizes.failures) out.push(`  Over: ${line}`);
    for (const line of sizes.advisories) out.push(`  Advisory: ${line}`);
    out.push("");
  }
  const snap = snapshotSizes(entries);
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
  const runs = subagentRuns(file);
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
    ok: verdict.ok && !sizes?.failures.length,
    first,
  };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const boundAt = args.indexOf("--bound");
  const bound = boundAt >= 0 ? Number(args[boundAt + 1]) : START_TOKENS;
  const file =
    args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--bound") ??
    newestSession(process.cwd());
  if (!file || !fs.existsSync(file)) {
    console.error(
      "No transcript found. Give the path of a session .jsonl file.",
    );
    process.exit(2);
  }
  const { text, ok } = reportOf(file, bound);
  console.log(text);
  process.exit(ok ? 0 : 1);
}
