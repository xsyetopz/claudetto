// Where Claude Code usage went, from the session transcripts under
// `~/.claude/projects` (or `$CLAUDE_CONFIG_DIR/projects`).
// The `dotclaude-usage` bin calls `main`.
//
// Costs are API-equivalent dollars at list prices: a subscription does not
// bill them, but its limits track the same token mix, so the shares show
// what spends a plan's limits. Reports the share by agent type, the share of
// calls whose context is past the context window, and the cost of full cache
// rewrites (a write over 30k tokens that is larger than the read), the
// main-conversation turns that background agents started, the advisor's
// share, and the prompt cache hit rate (cache reads over all input tokens).
// For each run (a session, and each subagent run) it reports the model calls
// and the context that each call reads again (cache reads plus input tokens).
// It lists the skills that the transcripts show as available and the period did not call.
// When the transcripts list no skills, it reads the installed plugins and the skills folder, and names that source.
// An advisor call is an `advisor_message` entry in the call's
// `usage.iterations`, and the call's own token counts leave it out.
// With `--agents-dir DIR`, it reads `maxTurns` from `DIR/<agent>.md` and compares the briefs of the runs
// that reached the report reserve with the briefs of the other runs.
// A full rewrite is expected on the first call of a transcript, on the first
// call after a compaction, and after a model switch, because each one starts
// a new cache prefix. The report counts those apart from the rewrites that
// nothing explains.
// It also counts main sessions by Claude Code entrypoint (`cli`, `claude-vscode`,
// `sdk-cli`, `sdk-py`) and the wake turns of each entrypoint, usage-limit hits (the synthetic assistant message
// with `error: "rate_limit"` that Claude Code writes), and `Skill` tool calls by skill.
// The delegation share compares main-conversation turns with subagent runs,
// and sizes the tool results that enter the main context per session.
// The run table lists the latest subagent runs with the cost of each.
// The report states measurements, and it does not state the cause of a limit.

import os from "node:os";
import path from "node:path";
import { callCost } from "./parse.mjs";
import { report } from "./report.mjs";

export { callCost, report };

const k = (n) => `${Math.round(n / 1000)}k`;
const n = (x) => x.toLocaleString("en-US");

const USAGE = `Usage: dotclaude-usage [--days 7] [--root DIR] [--runs 20] [--window N] [--agents-dir DIR] [--json]

Reports where Claude Code usage went, from the session transcripts.
--days N         The period, in days back from now. Default 7.
--root DIR       The transcripts folder. Default: projects under $CLAUDE_CONFIG_DIR or ~/.claude.
--runs N         Rows in the run tables. Default 20.
--window N       The context window in tokens. Default: from the model name, else 200000.
--agents-dir DIR Read maxTurns from DIR/<agent>.md to compare the briefs of runs that hit the turn limit.
--json           Print the report as JSON.`;

/** The lines of the text report `r` for a period of `days` days. */
export function textOf(r, days, window) {
  const out = [
    `Last ${days} days: $${r.total} API-equivalent at list prices, not a subscription bill`,
  ];
  for (const a of r.byAgent.slice(0, 10))
    out.push(
      `  ${a.type.padEnd(32)} $${a.cost.toFixed(2).padStart(9)}  ${a.share}%`,
    );
  out.push(
    `Calls with context past ${window ? k(window) : "the window of their model (200k, or 1M for a 1M model)"}: ${r.overWindowShare}% of cost`,
  );
  const o = r.output;
  out.push(
    `Output tokens: ${o.tokens} in ${o.messages} messages. ${o.unfinished} messages have no final record, so their count is a lower bound.`,
  );
  const e = r.expectedRewrites;
  out.push(
    `Full cache rewrites that nothing explains: ${r.rewriteShare}% of cost. Expected rewrites: ${r.expectedRewriteShare}% (${e.first} first calls, ${e.compaction} after compaction, ${e.model} after a model switch)`,
    `Main turns started by background agents: ${r.mainTurns.wake} of ${r.mainTurns.wake + r.mainTurns.other}, ${r.wakeShare}% of cost`,
    `Advisor calls: ${r.advisor.calls}, ${r.advisor.share}% of cost (each reads the whole context without the cache)`,
    // The cost guide: below about 80%, something is breaking the cache.
    `Cache hit rate: ${r.cacheHitRate.all ?? "-"}% of input tokens (main conversation ${r.cacheHitRate.main ?? "-"}%). Below about 80%, something breaks the cache.`,
  );
  const f = r.firstCallAfterPrompt;
  out.push(
    `First warm call after a prompt: ${f.with.writeShare}% of context written with hook context in history (${f.with.calls} calls), ${f.without.writeShare}% without (${f.without.calls} calls)`,
  );
  const list = (counts) =>
    Object.entries(counts)
      .map(([key, count]) => `${key} ${count}`)
      .join(", ") || "-";
  out.push(
    `Sessions by entrypoint: ${list(r.entrypoints)}`,
    `Wake turns by entrypoint: ${list(r.wakesByEntrypoint)}`,
    `Usage-limit hits: ${r.limitHits}`,
    `Skill calls: ${r.skills.map((s) => `${s.skill} ${s.uses}`).join(", ") || "-"}`,
  );
  const c = r.calls;
  out.push(
    `Model calls: ${n(c.calls)} in ${c.runs} runs. Context read again (cache reads plus input tokens of each call): ${n(c.reread)} in total`,
    `  run                          type                       calls  per call      largest         sum`,
  );
  for (const run of c.top)
    out.push(
      `  ${run.id.slice(0, 28).padEnd(28)} ${run.type.slice(0, 24).padEnd(24)} ${String(run.calls).padStart(7)} ${n(run.rereadPerCall).padStart(9)} ${n(run.rereadMax).padStart(12)} ${n(run.reread).padStart(11)}`,
    );
  const u = r.unusedSkills;
  out.push(
    `Skills that the period did not use: ${u.unused.length} of ${u.available} available. Source: ${u.source}`,
  );
  for (const s of u.unused)
    out.push(
      `  ${s.skill}${s.chars ? ` (${s.chars} chars in the listing)` : ""}`,
    );
  const d = r.delegation;
  out.push(
    `Delegation: ${d.runs} subagent runs in ${d.mainTurns} main turns, ${d.runsPer100Turns ?? "-"} per 100 turns (${d.runsByType.map((t) => `${t.type} ${t.runs}`).join(", ") || "-"})`,
    `Tool results in the main context per session, estimated tokens: median ${d.resultTokensPerSession.median}, p90 ${d.resultTokensPerSession.p90} (${d.resultTokensPerSession.sessions} sessions)`,
    `Latest ${d.latestRuns.length} subagent runs:`,
  );
  for (const run of d.latestRuns)
    out.push(
      `  ${run.id.slice(0, 8).padEnd(8)} ${run.type.slice(0, 24).padEnd(24)} $${run.cost.toFixed(2).padStart(6)}  ${run.description.slice(0, 40)} | ${run.handback}`,
    );
  if (r.turnCap.runs) {
    const other = new Map(r.turnCap.other.map((x) => [x.type, x]));
    out.push(
      `Runs that reached the turn-limit reserve: ${r.turnCap.capped.reduce((m, x) => m + x.runs, 0)} of ${r.turnCap.runs} (median files and list items in the brief, capped vs other)`,
    );
    for (const x of r.turnCap.capped) {
      const y = other.get(x.type) ?? { runs: 0, files: 0, items: 0 };
      out.push(
        `  ${x.type.padEnd(32)} ${x.runs} of ${x.runs + y.runs}  files ${x.files} vs ${y.files}  items ${x.items} vs ${y.items}`,
      );
    }
  }
  return out;
}

/** Runs the bin with `args`, prints to stdout, and returns the exit code. */
export function main(args, env = process.env) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  const opt = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : fallback;
  };
  const days = Number(opt("--days", "7"));
  const configDir = env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  const root = opt("--root", path.join(configDir, "projects"));
  const window = opt("--window") ? Number(opt("--window")) : null;
  const r = report(root, new Date(Date.now() - days * 86_400_000), {
    runLimit: Number(opt("--runs", "20")),
    agentsDir: opt("--agents-dir", null),
    window,
    configDir,
  });
  console.log(
    args.includes("--json")
      ? JSON.stringify(r, null, 2)
      : textOf(r, days, window).join("\n"),
  );
  return 0;
}
