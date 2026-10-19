#!/usr/bin/env -S bun --no-env-file
// Prints statistics for the with/without comparison in the `aggregate-result.json` files of `claude plugin eval`.
// Usage: `bun tools/eval-stats.ts [--json] [--seed N] [--pick newest|oldest] [--version X] PATH...`
// A PATH is an `aggregate-result.json` file or a folder that holds some.
// The case is the unit of a set, so the bootstrap resamples cases and never pools runs.

import { join } from "node:path";
import { parse } from "yaml";
import {
  EVAL_STATS_CONFIDENCE,
  EVAL_STATS_RESAMPLES,
  EVAL_STATS_SEED,
} from "./limits.ts";

export type Run = {
  score: number;
  passed: boolean;
  costUsd?: number;
  graders?: { name: string; judgeVotes?: boolean[] | undefined }[];
};
export type RawCase = {
  name: string;
  promptMarkdown?: string;
  graders?: { name: string; type: string }[];
  arms: { with?: Run[]; without?: Run[] };
};
export type Aggregate = {
  claudeVersion?: string;
  startedAt?: string;
  suite?: { modelOverride?: string | null };
  cases: RawCase[];
};
export type Source = { file: string; claudeVersion: string; model: string };
export type Entry = {
  source: string;
  startedAt: string;
  case: RawCase;
  /** The name of the current case that this result belongs to, which differs from the name in the result when the case was renamed. */
  name: string;
  set: string;
  /** True when no current case has this prompt and these graders. */
  stale: boolean;
};
/** What a current `case.yaml` says about a case. */
export type CaseInfo = { set: string; prompt: string; graders: string[] };

export type Interval = { low: number; high: number };

/** The sum of `ln(i)` for `i` up to `n`. */
const logFactorials = (n: number): number[] => {
  const out = [0];
  for (let i = 1; i <= n; i++) out.push((out[i - 1] as number) + Math.log(i));
  return out;
};

/** The two-sided Fisher exact p of `a` of `n1` against `b` of `n2`: the sum of the tables that are not more likely than the observed table. */
export const fisherExact = (
  a: number,
  n1: number,
  b: number,
  n2: number,
): number => {
  const k = a + b;
  const n = n1 + n2;
  const lf = logFactorials(n);
  const logP = (x: number): number =>
    (lf[n1] as number) -
    (lf[x] as number) -
    (lf[n1 - x] as number) +
    ((lf[n2] as number) - (lf[k - x] as number) - (lf[n2 - k + x] as number)) -
    ((lf[n] as number) - (lf[k] as number) - (lf[n - k] as number));
  const observed = logP(a);
  let p = 0;
  for (let x = Math.max(0, k - n2); x <= Math.min(n1, k); x++) {
    const lp = logP(x);
    if (lp <= observed + 1e-9) p += Math.exp(lp);
  }
  return Math.min(1, p);
};

/** The standard normal quantile (Acklam), for the two-sided `confidence`. */
export const zForConfidence = (confidence: number): number => {
  const p = 1 - (1 - confidence) / 2;
  const a = [
    -39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269,
    -30.66479806614716, 2.506628277459239,
  ];
  const b = [
    -54.47609879822406, 161.5858368580409, -155.6989798598866,
    66.80131188771972, -13.28068155288572,
  ];
  const c = [
    -0.007784894002430293, -0.3223964580411365, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    0.007784695709041462, 0.3224671290700398, 2.445134137142996,
    3.754408661907416,
  ];
  const poly = (k: number[], x: number): number =>
    k.reduce((s, v) => s * x + v, 0);
  if (p > 0.97575) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -poly(c, q) / (poly(d, q) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (poly(a, r) * q) / (poly(b, r) * r + 1);
};

/** The Wilson score interval for `x` of `n`. */
export const wilson = (x: number, n: number, z: number): Interval => {
  const p = x / n;
  const centre = (p + (z * z) / (2 * n)) / (1 + (z * z) / n);
  const half =
    (z / (1 + (z * z) / n)) *
    Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
};

/** The Newcombe hybrid score interval (method 10) for `x1/n1 - x2/n2`, built on two Wilson intervals. */
export const newcombe = (
  x1: number,
  n1: number,
  x2: number,
  n2: number,
  confidence = EVAL_STATS_CONFIDENCE,
): Interval => {
  const z = zForConfidence(confidence);
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const w1 = wilson(x1, n1, z);
  const w2 = wilson(x2, n2, z);
  const d = p1 - p2;
  return {
    low: d - Math.sqrt((p1 - w1.low) ** 2 + (w2.high - p2) ** 2),
    high: d + Math.sqrt((w1.high - p1) ** 2 + (p2 - w2.low) ** 2),
  };
};

/** A seeded generator (mulberry32) of numbers in `[0, 1)`. */
export const seededRandom = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** The percentile bootstrap interval of the mean of `values`, which resamples the values (the cases). */
export const bootstrapMean = (
  values: number[],
  seed = EVAL_STATS_SEED,
  resamples = EVAL_STATS_RESAMPLES,
  confidence = EVAL_STATS_CONFIDENCE,
): Interval => {
  const rand = seededRandom(seed);
  const n = values.length;
  const means: number[] = [];
  for (let r = 0; r < resamples; r++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += values[Math.floor(rand() * n)] as number;
    means.push(sum / n);
  }
  means.sort((x, y) => x - y);
  const at = (q: number): number =>
    means[
      Math.min(resamples - 1, Math.max(0, Math.floor(q * resamples)))
    ] as number;
  return { low: at((1 - confidence) / 2), high: at(1 - (1 - confidence) / 2) };
};

const mean = (xs: number[]): number =>
  xs.length === 0 ? Number.NaN : xs.reduce((s, x) => s + x, 0) / xs.length;

/** The set, prompt, and grader names of each current case, by case name, from the `case.yaml` files under `root`. */
export const caseInfos = async (
  root: string,
  glob = "src/plugins/claudetto/**/evals/*/case.yaml",
): Promise<Map<string, CaseInfo>> => {
  const infos = new Map<string, CaseInfo>();
  for await (const f of new Bun.Glob(glob).scan(root)) {
    const doc = parse(await Bun.file(join(root, f)).text());
    if (!doc?.name) continue;
    const tag = ((doc.tags ?? []) as string[]).find((t) =>
      t.startsWith("set:"),
    );
    infos.set(doc.name, {
      set: tag ? tag.slice(4) : "untagged",
      prompt: String(doc.execution?.prompt ?? ""),
      graders: ((doc.graders ?? []) as { name?: string }[]).map(
        (g) => g.name ?? "",
      ),
    });
  }
  return infos;
};

const sameNames = (a: string[], b: string[]): boolean =>
  a.length === b.length &&
  [...a].sort().join("\n") === [...b].sort().join("\n");

/**
 * The current case that a result case belongs to: the case of the same name when its prompt and graders match, else another current case that matches.
 * It returns `undefined` when none matches, so the result is stale.
 */
export const resolveCase = (
  c: RawCase,
  infos: Map<string, CaseInfo>,
): { name: string; set: string } | undefined => {
  const matches = (info: CaseInfo): boolean =>
    (c.promptMarkdown === undefined ||
      c.promptMarkdown.trim() === info.prompt.trim()) &&
    (c.graders === undefined ||
      sameNames(
        c.graders.map((g) => g.name),
        info.graders,
      ));
  const own = infos.get(c.name);
  if (own && matches(own)) return { name: c.name, set: own.set };
  for (const [name, info] of [...infos.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (matches(info)) return { name, set: info.set };
  }
  return undefined;
};

/** Every `aggregate-result.json` file at or under the given files and folders, sorted. */
export const findResultFiles = async (paths: string[]): Promise<string[]> => {
  const files = new Set<string>();
  for (const p of paths) {
    if (p.endsWith(".json")) files.add(p);
    else
      for await (const f of new Bun.Glob("**/aggregate-result.json").scan({
        cwd: p,
      }))
        files.add(join(p, f));
  }
  return [...files].sort();
};

/** The entries of the files, one for each case: the newest by `startedAt`, or the oldest with `pick` set to `oldest`. */
export const chooseEntries = (
  files: { file: string; data: Aggregate }[],
  pick: "newest" | "oldest" = "newest",
  infos: Map<string, CaseInfo> = new Map(),
): { sources: Source[]; entries: Entry[] } => {
  const sources: Source[] = files.map(({ file, data }) => ({
    file,
    claudeVersion: data.claudeVersion ?? "unknown",
    model: data.suite?.modelOverride ?? "default",
  }));
  const best = new Map<string, Entry>();
  for (const { file, data } of files) {
    for (const c of data.cases) {
      const found = resolveCase(c, infos);
      const entry: Entry = {
        source: file,
        startedAt: data.startedAt ?? "",
        case: c,
        name: found?.name ?? c.name,
        set: found?.set ?? "stale",
        stale: found === undefined,
      };
      const key = entry.stale ? `stale:${c.name}` : entry.name;
      const old = best.get(key);
      const chosen =
        old === undefined ||
        (pick === "newest"
          ? entry.startedAt > old.startedAt
          : entry.startedAt < old.startedAt);
      if (chosen) best.set(key, entry);
    }
  }
  return {
    sources,
    entries: [...best.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
};

export type CaseStats = {
  name: string;
  resultName: string;
  stale: boolean;
  set: string;
  source: string;
  nWith: number;
  nWithout: number;
  passesWith: number;
  passesWithout: number;
  rateWith: number;
  rateWithout: number;
  deltaRate: number;
  ci: Interval;
  fisherP: number;
  scoreWith: number;
  scoreWithout: number;
  deltaScore: number;
};

export const caseStats = (
  entry: Entry,
  confidence = EVAL_STATS_CONFIDENCE,
): CaseStats => {
  const w = entry.case.arms.with ?? [];
  const o = entry.case.arms.without ?? [];
  const pw = w.filter((r) => r.passed).length;
  const po = o.filter((r) => r.passed).length;
  const ok = w.length > 0 && o.length > 0;
  const scoreWith = mean(w.map((r) => r.score));
  const scoreWithout = mean(o.map((r) => r.score));
  return {
    name: entry.name,
    resultName: entry.case.name,
    stale: entry.stale,
    set: entry.set,
    source: entry.source,
    nWith: w.length,
    nWithout: o.length,
    passesWith: pw,
    passesWithout: po,
    rateWith: pw / w.length,
    rateWithout: po / o.length,
    deltaRate: pw / w.length - po / o.length,
    ci: ok
      ? newcombe(pw, w.length, po, o.length, confidence)
      : { low: Number.NaN, high: Number.NaN },
    fisherP: ok ? fisherExact(pw, w.length, po, o.length) : Number.NaN,
    scoreWith,
    scoreWithout,
    deltaScore: scoreWith - scoreWithout,
  };
};

export type SetStats = {
  set: string;
  cases: number;
  meanDeltaRate: number;
  ciRate: Interval;
  meanDeltaScore: number;
  ciScore: Interval;
};

export const setStats = (
  cases: CaseStats[],
  seed: number,
  resamples = EVAL_STATS_RESAMPLES,
  confidence = EVAL_STATS_CONFIDENCE,
): SetStats[] => {
  const by = new Map<string, CaseStats[]>();
  for (const c of cases.filter(
    (x) => !x.stale && x.nWith > 0 && x.nWithout > 0,
  ))
    by.set(c.set, [...(by.get(c.set) ?? []), c]);
  return [...by.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([set, cs]) => {
      const rates = cs.map((c) => c.deltaRate);
      const scores = cs.map((c) => c.deltaScore);
      return {
        set,
        cases: cs.length,
        meanDeltaRate: mean(rates),
        ciRate: bootstrapMean(rates, seed, resamples, confidence),
        meanDeltaScore: mean(scores),
        ciScore: bootstrapMean(scores, seed, resamples, confidence),
      };
    });
};

export type Agreement = {
  case: string;
  grader: string;
  runs: number;
  agree: number;
};

/** For each `llm` grader, the runs (both arms) that hold judge votes, and how many of them have all votes equal. */
export const judgeAgreement = (entries: Entry[]): Agreement[] => {
  const out: Agreement[] = [];
  for (const { case: c, name } of entries) {
    for (const g of (c.graders ?? []).filter((x) => x.type === "llm")) {
      let runs = 0;
      let agree = 0;
      for (const r of [...(c.arms.with ?? []), ...(c.arms.without ?? [])]) {
        const votes = r.graders?.find((x) => x.name === g.name)?.judgeVotes;
        if (!votes || votes.length === 0) continue;
        runs++;
        if (votes.every((v) => v === votes[0])) agree++;
      }
      out.push({ case: name, grader: g.name, runs, agree });
    }
  }
  return out;
};

export type Report = {
  sources: Source[];
  warnings: string[];
  cases: CaseStats[];
  sets: SetStats[];
  agreement: Agreement[];
};

export const buildReport = (
  files: { file: string; data: Aggregate }[],
  infos: Map<string, CaseInfo>,
  opts: {
    seed?: number;
    pick?: "newest" | "oldest";
    resamples?: number;
    version?: string;
  } = {},
): Report => {
  const kept =
    opts.version === undefined
      ? files
      : files.filter((f) => f.data.claudeVersion === opts.version);
  const { sources, entries } = chooseEntries(kept, opts.pick, infos);
  const warnings: string[] = [];
  for (const [label, key] of [
    ["Claude Code versions", "claudeVersion"],
    ["models", "model"],
  ] as const) {
    const values = [...new Set(sources.map((s) => s[key]))];
    if (values.length > 1)
      warnings.push(`The files differ in ${label}: ${values.join(", ")}.`);
  }
  for (const e of entries) {
    if (e.stale)
      warnings.push(
        `The result of \`${e.case.name}\` (${e.source}) matches no current case, so it is stale and not in a set.`,
      );
    else if (e.name !== e.case.name)
      warnings.push(
        `The result of \`${e.case.name}\` (${e.source}) matches the current case \`${e.name}\`.`,
      );
  }
  const cases = entries.map((e) => caseStats(e));
  return {
    sources,
    warnings,
    cases,
    sets: setStats(cases, opts.seed ?? EVAL_STATS_SEED, opts.resamples),
    agreement: judgeAgreement(entries),
  };
};

const pct = (x: number): string =>
  Number.isNaN(x) ? "-" : `${(x * 100).toFixed(0)}%`;
const sgn = (x: number, digits = 2): string =>
  Number.isNaN(x) ? "-" : `${x >= 0 ? "+" : ""}${x.toFixed(digits)}`;
const ci = (i: Interval): string =>
  Number.isNaN(i.low) ? "-" : `[${sgn(i.low)}, ${sgn(i.high)}]`;

const table = (head: string[], rows: string[][]): string => {
  const w = head.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)),
  );
  const line = (r: string[]): string =>
    r
      .map((c, i) =>
        i < 2 ? c.padEnd(w[i] as number) : c.padStart(w[i] as number),
      )
      .join("  ");
  return [line(head), ...rows.map(line)].join("\n");
};

export const formatReport = (r: Report): string => {
  const out: string[] = [];
  for (const s of r.sources)
    out.push(
      `source ${s.file}: Claude Code ${s.claudeVersion}, model ${s.model}`,
    );
  for (const w of r.warnings) out.push(`WARNING: ${w}`);
  out.push(
    "",
    "Cases (CI: Newcombe hybrid score, method 10, of the difference in pass rate)",
  );
  out.push(
    table(
      [
        "case",
        "set",
        "n w/o",
        "pass w",
        "pass w/o",
        "rate w",
        "rate w/o",
        "delta",
        "CI",
        "fisher p",
        "score w",
        "score w/o",
      ],
      r.cases.map((c) => [
        c.name,
        c.set,
        `${c.nWith}/${c.nWithout}`,
        `${c.passesWith}`,
        `${c.passesWithout}`,
        pct(c.rateWith),
        pct(c.rateWithout),
        sgn(c.deltaRate),
        ci(c.ci),
        Number.isNaN(c.fisherP) ? "-" : c.fisherP.toFixed(4),
        c.scoreWith.toFixed(2),
        c.scoreWithout.toFixed(2),
      ]),
    ),
  );
  out.push("", "Sets (CI: bootstrap over cases)");
  out.push(
    table(
      [
        "set",
        "cases",
        "mean delta rate",
        "CI rate",
        "mean delta score",
        "CI score",
      ],
      r.sets.map((s) => [
        s.set,
        `${s.cases}`,
        sgn(s.meanDeltaRate),
        ci(s.ciRate),
        sgn(s.meanDeltaScore),
        ci(s.ciScore),
      ]),
    ),
  );
  if (r.agreement.length > 0) {
    out.push("", "Judge agreement (runs where all judge votes agree)");
    out.push(
      table(
        ["case", "grader", "runs", "agree", "share"],
        r.agreement.map((a) => [
          a.case,
          a.grader,
          `${a.runs}`,
          `${a.agree}`,
          a.runs === 0 ? "-" : pct(a.agree / a.runs),
        ]),
      ),
    );
  }
  return out.join("\n");
};

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const paths: string[] = [];
  let json = false;
  let version: string | undefined;
  let seed = EVAL_STATS_SEED;
  let pick: "newest" | "oldest" = "newest";
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string;
    if (a === "--json") json = true;
    else if (a === "--version") version = args[++i];
    else if (a === "--seed") seed = Number(args[++i]);
    else if (a === "--pick")
      pick = args[++i] === "oldest" ? "oldest" : "newest";
    else paths.push(a);
  }
  if (paths.length === 0 || Number.isNaN(seed)) {
    console.error(
      "Usage: bun tools/eval-stats.ts [--json] [--seed N] [--pick newest|oldest] [--version X] PATH...",
    );
    process.exit(1);
  }
  const names = await findResultFiles(paths);
  if (names.length === 0) {
    console.error("No aggregate-result.json file found.");
    process.exit(1);
  }
  const files = await Promise.all(
    names.map(async (file) => ({
      file,
      data: (await Bun.file(file).json()) as Aggregate,
    })),
  );
  const root = join(import.meta.dirname, "..");
  const report = buildReport(files, await caseInfos(root), {
    seed,
    pick,
    ...(version === undefined ? {} : { version }),
  });
  console.log(json ? JSON.stringify(report, null, 2) : formatReport(report));
}
