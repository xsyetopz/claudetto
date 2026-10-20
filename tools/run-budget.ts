#!/usr/bin/env -S bun --no-env-file
// Checks the budget tags of the eval cases against the kept traces of a `claude plugin eval` run (D25).
//
//   bun tools/run-budget.ts PATH...
//
// Each PATH is an `aggregate-result.json`, or a folder that holds one or more of them at any depth.
// The layout is from the run of 2026-10-20 (Claude Code 2.1.304, `--keep-temp`).
// A kept sandbox is `/private/tmp/e-XXXXXX/` with a random name, so it does not name its case.
// A `trace.jsonl` holds neither the case name nor the prompt.
// So the case of a trace comes from the result file: `cases[i].name` and `cases[i].arms.with[j].tracePath`.
// The `with` arm is checked against the tags of its case.
// D25 does not say if the `without` arm (no plugin) is checked, so the script only prints its counts as info.
// A run with no `tracePath`, a trace that is missing or no stream-json, and a case with no tags in this checkout are faults.
// The script exits 1 on a fault, and 2 on a bad call.

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

type Run = { tracePath?: string | null };
type Aggregate = {
  cases?: { name?: string; arms?: { with?: Run[]; without?: Run[] } }[];
};

/** The result of a check: the faults, the count of the runs checked, and the info lines. */
export type Budget = { faults: string[]; checked: number; info: string[] };

/** The budget check of the runs in one parsed `aggregate-result.json`, named `label` in each message. */
export const budgetOfAggregate = async (
  agg: Aggregate,
  tags: Record<string, string[]>,
  label: string,
): Promise<Budget> => {
  const out: Budget = { faults: [], checked: 0, info: [] };
  if (!Array.isArray(agg.cases) || agg.cases.length === 0)
    out.faults.push(`${label}: no cases in the result`);
  for (const c of agg.cases ?? []) {
    const name = c.name ?? "(no name)";
    const caseTagList = c.name === undefined ? undefined : tags[c.name];
    for (const arm of ["with", "without"] as const) {
      const runs = c.arms?.[arm] ?? [];
      let over = 0;
      for (const [j, run] of runs.entries()) {
        const where = `${label}: ${name} ${arm}[${j}]`;
        if (arm === "with" && caseTagList === undefined) {
          out.faults.push(`${where}: no tags for this case in the checkout`);
          continue;
        }
        if (!run.tracePath) {
          if (arm === "with") out.faults.push(`${where}: no tracePath`);
          continue;
        }
        const file = Bun.file(run.tracePath);
        const parsed = (await file.exists())
          ? parseTrace(await file.text())
          : { fault: "trace is missing" };
        if ("fault" in parsed) {
          if (arm === "with")
            out.faults.push(`${where}: ${run.tracePath}: ${parsed.fault}`);
          continue;
        }
        const faults = overBudget(caseTagList ?? [], parsed.run);
        if (arm === "without") {
          if (faults.length) over++;
          continue;
        }
        out.checked++;
        for (const fault of faults) out.faults.push(`${where}: ${fault}`);
      }
      if (arm === "without" && runs.length)
        out.info.push(
          `${label}: ${name} without: ${over} of ${runs.length} runs over the budget of the case (not a fault)`,
        );
    }
  }
  return out;
};

/** The `aggregate-result.json` files at `path`, which is such a file or a folder. */
export const aggregateFiles = async (path: string): Promise<string[]> => {
  if (path.endsWith(".json")) return [path];
  const out: string[] = [];
  for await (const f of new Bun.Glob("**/aggregate-result.json").scan({
    cwd: path,
    dot: true,
  }))
    out.push(join(path, f));
  return out.sort();
};

/** The budget check of each result file under each of `paths`. */
export const budgetFaultsIn = async (
  paths: string[],
  tags: Record<string, string[]>,
): Promise<Budget> => {
  const out: Budget = { faults: [], checked: 0, info: [] };
  for (const path of paths) {
    const files = await aggregateFiles(path);
    if (files.length === 0)
      out.faults.push(`${path}: no aggregate-result.json found`);
    for (const f of files) {
      let agg: Aggregate;
      try {
        agg = JSON.parse(await Bun.file(f).text());
      } catch {
        out.faults.push(`${f}: no readable JSON`);
        continue;
      }
      const r = await budgetOfAggregate(agg, tags, relative(process.cwd(), f));
      out.faults.push(...r.faults);
      out.info.push(...r.info);
      out.checked += r.checked;
    }
  }
  return out;
};

if (import.meta.main) {
  const paths = process.argv.slice(2);
  if (paths.length === 0 || paths.some((a) => a.startsWith("--"))) {
    console.error("Usage: bun tools/run-budget.ts PATH...");
    process.exit(2);
  }
  const root = join(import.meta.dirname, "..");
  const r = await budgetFaultsIn(paths, await caseTags(root));
  for (const line of r.info) console.log(`info: ${line}`);
  for (const f of r.faults) console.error(f);
  console.log(
    `${r.checked} runs checked, ${r.faults.length} faults.${r.faults.length ? "" : " All are in budget."}`,
  );
  process.exit(r.faults.length ? 1 : 0);
}
