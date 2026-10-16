// The aggregation of the usage report: one pass over the session transcripts.

import path from "node:path";
import type { Store } from "../ports.ts";
import { scanFile } from "./scan.ts";
import { summarize } from "./summary.ts";
import type { Pair, ReportOptions, ReportSums } from "./types.ts";

/** The sums before the first file: every total is zero, and every table is empty. */
const emptySums = (
  configDir: string,
  runLimit: number,
  pluginRecord: Record<string, string> | null,
): ReportSums => ({
  advisor: { calls: 0, cost: 0 },
  agentCalls: new Map(),
  byAgent: {},
  // Input tokens and cache reads, for all calls and for the main conversation.
  cache: { all: [0, 0] as Pair, main: [0, 0] as Pair },
  entrypoints: {},
  expected: { first: 0, compaction: 0, model: 0 },
  expectedCost: 0,
  // Issue #83913: the first call after a prompt, while the 5-minute cache is
  // still warm, split by whether tool or prompt hook `additionalContext` is
  // in the history. [calls, cache writes, context] per bucket.
  first: { with: [0, 0, 0], without: [0, 0, 0] },
  limitHits: 0,
  // claudetto agent runs with a turn limit, and whether each one reached
  // the reserve where tool calls stop.
  limited: [],
  mainCalls: 0,
  versions: {},
  pluginRecord,
  pluginVersions: {},
  unpriced: {},
  // Output tokens, messages, and messages without a final record.
  output: { tokens: 0, messages: 0, unfinished: 0 },
  overWindow: 0,
  rewrites: 0,
  runLimit,
  // Delegation: main assistant turns, subagent runs, the tokens that tool
  // results add to each main session, and what each `Agent` call said.
  runs: [],
  runsByType: {},
  sessionResultTokens: [],
  listed: new Map(),
  skills: {},
  total: 0,
  // Main-conversation turns by what started them: a background agent's
  // report or task notification, or anything else (mostly the user).
  turns: { wake: 0, other: 0 },
  callRuns: [],
  configDir,
  wakeCost: 0,
  // Wake turns by entrypoint: the fork-mode setting that keeps agents in the
  // foreground may not reach SDK sessions.
  wakes: {},
});

/**
 * The report of the transcripts under `root` that were written since `since`.
 * Options: `runLimit` (rows of the run tables), `agentsDir` (a folder of `agents/*.md` files for `maxTurns`),
 * `window` (the context window in tokens, or the window of each call's model),
 * `configDir` (where the installed skills are read when the transcripts list none),
 * and `pluginRecord` (the plugin version record, which counts the sessions by plugin version).
 */
export const report = async (
  store: Store,
  root: string,
  since: Date,
  options: ReportOptions,
) => {
  const {
    runLimit = 20,
    agentsDir = null,
    window = null,
    configDir,
    pluginRecord = null,
  } = options;
  const sums = emptySums(configDir, runLimit, pluginRecord);
  const files = (await store.tree(root))
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => path.join(root, f));
  for (const file of files) {
    if ((await store.mtime(file)) < since.getTime()) continue;
    await scanFile(store, file, sums, since, { agentsDir, window });
  }
  return summarize(store, sums);
};
