#!/usr/bin/env -S bun --no-env-file
// Checks the budget tags of the eval cases against the kept traces of a `claude plugin eval` run (D25).
//
//   bun tools/run-budget.ts DIR [--case NAME]
//
// The layout is from the docs and the bundle of Claude Code 2.1.303.
// The `results/<timestamp>/` folder holds only `aggregate-result.json` and `report.html`.
// With `--keep-temp`, each run keeps its sandbox, which holds `trace.jsonl`, and the eval prints `kept temp: PATH`.
// The docs do not say how a sandbox names its case, and a real layout needs a paid run to see.
// So DIR is any folder, such as the folder that holds the kept sandboxes, and the reader looks at it deep for each `trace.jsonl`.
// The case of a trace is `--case NAME`, or else the first path part under DIR that is the name of a case.
// A trace with no known case is a fault, so a wrong layout never passes by a skip.
// A trace line is a stream-json event. The script exits 1 on a fault.

import { join, relative } from "node:path";
import { parse } from "yaml";
import { overBudget } from "./case-checks.ts";
import type { Transcript } from "./transcript-grade.ts";

const CASES = "src/plugins/**/evals/*/case.yaml";

/** The tags of each case under `root`, by case name. */
export const caseTags = async (
  root: string,
  glob: string = CASES,
): Promise<Record<string, string[]>> => {
  const out: Record<string, string[]> = {};
  for await (const f of new Bun.Glob(glob).scan(root)) {
    const doc = parse(await Bun.file(join(root, f)).text());
    if (doc?.name) out[doc.name] = doc.tags ?? [];
  }
  return out;
};

/** The events of a `trace.jsonl` text, or the fault for a line that is no JSON object. */
export const parseTrace = (
  text: string,
): { run: Transcript } | { fault: string } => {
  const events: Transcript["events"] = [];
  const lines = text.split("\n");
  for (const [i, line] of lines.entries()) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (typeof e !== "object" || e === null) throw new Error("no object");
      events.push(e);
    } catch {
      return { fault: `line ${i + 1} is no JSON event` };
    }
  }
  return { run: { events, files: {} } };
};

/** The faults of each `trace.jsonl` under `dir` against the tags of the cases. */
export const budgetFaultsIn = async (
  dir: string,
  tags: Record<string, string[]>,
  only?: string,
): Promise<string[]> => {
  const out: string[] = [];
  const files: string[] = [];
  for await (const f of new Bun.Glob("**/trace.jsonl").scan({
    cwd: dir,
    dot: true,
  }))
    files.push(f);
  if (files.length === 0) out.push(`${dir}: no trace.jsonl found`);
  if (only !== undefined && !tags[only]) out.push(`no case named ${only}`);
  for (const f of files.sort()) {
    const name = only ?? f.split("/").find((p) => p in tags);
    const caseTagList = name === undefined ? undefined : tags[name];
    if (caseTagList === undefined) {
      out.push(`${f}: no known case for this trace, pass --case NAME`);
      continue;
    }
    const parsed = parseTrace(await Bun.file(join(dir, f)).text());
    if ("fault" in parsed) out.push(`${f}: ${parsed.fault}`);
    else
      for (const fault of overBudget(caseTagList, parsed.run))
        out.push(`${name} (${f}): ${fault}`);
  }
  return out;
};

if (import.meta.main) {
  const args = process.argv.slice(2);
  const i = args.indexOf("--case");
  const only = i >= 0 ? args[i + 1] : undefined;
  const dir = args.find((a, j) => !a.startsWith("--") && j !== i + 1);
  if (!dir || (i >= 0 && !only)) {
    console.error("Usage: bun tools/run-budget.ts DIR [--case NAME]");
    process.exit(2);
  }
  const root = join(import.meta.dirname, "..");
  const faults = await budgetFaultsIn(dir, await caseTags(root), only);
  for (const f of faults) console.error(f);
  if (faults.length === 0)
    console.log(
      `The traces under ${relative(process.cwd(), dir) || "."} are in budget.`,
    );
  process.exit(faults.length ? 1 : 0);
}
