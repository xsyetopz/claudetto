#!/usr/bin/env bun
// Where Claude Code usage went, from the session transcripts under
// `~/.claude/projects` (or `$CLAUDE_CONFIG_DIR/projects`).
//
//   bun tools/usage-report.mjs [--days 7] [--root DIR] [--runs 20] [--json]
//
// Costs are API-equivalent dollars at list prices: a subscription does not
// bill them, but its limits track the same token mix, so the shares show
// what spends a plan's limits. Reports the share by agent type, the share of
// calls whose context is past `CONTEXT_WINDOW`, and the cost of full cache
// rewrites (a write over 30k tokens that is larger than the read), the
// main-conversation turns that background agents started, the advisor's
// share, and the prompt cache hit rate (cache reads over all input tokens).
// An advisor call is an `advisor_message` entry in the call's
// `usage.iterations`, and the call's own token counts leave it out.
// For dotclaude agents with a turn limit, it compares the briefs of the runs
// that reached the report reserve with the briefs of the other runs.
// A full rewrite is expected on the first call of a transcript, on the first
// call after a compaction, and after a model switch, because each one starts
// a new cache prefix. The report counts those apart from the rewrites that
// nothing explains.
// It also counts main sessions by Claude Code entrypoint (`cli`, `claude-vscode`,
// `sdk-cli`, `sdk-py`) and the wake turns of each entrypoint, usage-limit hits (the synthetic assistant message
// with `error: "rate_limit"` that Claude Code writes), `Skill` tool calls by
// skill, and the dotclaude guard verdicts per rule from `verdicts.jsonl`.
// The delegation share compares main-conversation turns with subagent runs,
// and sizes the tool results that enter the main context per session.
// The run table lists the latest subagent runs with the cost of each.

import os from "node:os";
import path from "node:path";
import { CONTEXT_WINDOW } from "../plugins/dotclaude/lib/budget.mjs";
import { callCost } from "./usage/parse.mjs";
import { report } from "./usage/report.mjs";

export { callCost, report };

const k = (n) => `${Math.round(n / 1000)}k`;

if (import.meta.main) {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : fallback;
  };
  const days = Number(opt("--days", "7"));
  const root = opt(
    "--root",
    path.join(
      process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"),
      "projects",
    ),
  );
  // The plugin data directory of the marketplace install.
  const verdicts = opt(
    "--verdicts",
    path.join(
      process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"),
      "plugins",
      "data",
      "dotclaude-dotclaude",
      "verdicts.jsonl",
    ),
  );
  const r = report(
    root,
    new Date(Date.now() - days * 86_400_000),
    verdicts,
    Number(opt("--runs", "20")),
  );
  if (args.includes("--json")) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log(`Last ${days} days: $${r.total} API-equivalent`);
    for (const a of r.byAgent.slice(0, 10))
      console.log(
        `  ${a.type.padEnd(32)} $${a.cost.toFixed(2).padStart(9)}  ${a.share}%`,
      );
    console.log(
      `Calls with context past ${k(CONTEXT_WINDOW)}: ${r.overWindowShare}% of cost`,
    );
    const o = r.output;
    console.log(
      `Output tokens: ${o.tokens} in ${o.messages} messages. ${o.unfinished} messages have no final record, so their count is a lower bound.`,
    );
    const e = r.expectedRewrites;
    console.log(
      `Full cache rewrites that nothing explains: ${r.rewriteShare}% of cost. Expected rewrites: ${r.expectedRewriteShare}% (${e.first} first calls, ${e.compaction} after compaction, ${e.model} after a model switch)`,
    );
    console.log(
      `Main turns started by background agents: ${r.mainTurns.wake} of ${r.mainTurns.wake + r.mainTurns.other}, ${r.wakeShare}% of cost`,
    );
    console.log(
      `Advisor calls: ${r.advisor.calls}, ${r.advisor.share}% of cost (each reads the whole context without the cache)`,
    );
    // The cost guide: below about 80%, something is breaking the cache.
    console.log(
      `Cache hit rate: ${r.cacheHitRate.all ?? "-"}% of input tokens (main conversation ${r.cacheHitRate.main ?? "-"}%). Below about 80%, something breaks the cache.`,
    );
    const f = r.firstCallAfterPrompt;
    console.log(
      `First warm call after a prompt: ${f.with.writeShare}% of context written with hook context in history (${f.with.calls} calls), ${f.without.writeShare}% without (${f.without.calls} calls)`,
    );
    const eps = Object.entries(r.entrypoints)
      .map(([k, n]) => `${k} ${n}`)
      .join(", ");
    console.log(`Sessions by entrypoint: ${eps || "-"}`);
    const wakes = Object.entries(r.wakesByEntrypoint)
      .map(([k, n]) => `${k} ${n}`)
      .join(", ");
    console.log(`Wake turns by entrypoint: ${wakes || "-"}`);
    console.log(`Usage-limit hits: ${r.limitHits}`);
    console.log(
      `Skill calls: ${r.skills.map((s) => `${s.skill} ${s.uses}`).join(", ") || "-"}`,
    );
    console.log(
      `Guard verdicts per rule (${verdicts}): ${r.verdicts.length ? "" : "none"}`,
    );
    for (const v of r.verdicts.slice(0, 10))
      console.log(
        `  ${v.level.padEnd(10)} ${String(v.count).padStart(5)}  ${v.rule.slice(0, 100)}`,
      );
    const d = r.delegation;
    console.log(
      `Delegation: ${d.runs} subagent runs in ${d.mainTurns} main turns, ${d.runsPer100Turns ?? "-"} per 100 turns (${d.runsByType.map((t) => `${t.type} ${t.runs}`).join(", ") || "-"})`,
    );
    console.log(
      `Tool results in the main context per session, estimated tokens: median ${d.resultTokensPerSession.median}, p90 ${d.resultTokensPerSession.p90} (${d.resultTokensPerSession.sessions} sessions)`,
    );
    console.log(`Latest ${d.latestRuns.length} subagent runs:`);
    for (const run of d.latestRuns)
      console.log(
        `  ${run.id.slice(0, 8).padEnd(8)} ${run.type.slice(0, 24).padEnd(24)} $${run.cost.toFixed(2).padStart(6)}  ${run.description.slice(0, 40)} | ${run.handback}`,
      );
    const other = new Map(r.turnCap.other.map((o) => [o.type, o]));
    console.log(
      `Runs that reached the turn-limit reserve: ${r.turnCap.capped.reduce((n, c) => n + c.runs, 0)} of ${r.turnCap.runs} (median files and list items in the brief, capped vs other)`,
    );
    for (const c of r.turnCap.capped) {
      const o = other.get(c.type) ?? { runs: 0, files: 0, items: 0 };
      console.log(
        `  ${c.type.padEnd(32)} ${c.runs} of ${c.runs + o.runs}  files ${c.files} vs ${o.files}  items ${c.items} vs ${o.items}`,
      );
    }
  }
}
