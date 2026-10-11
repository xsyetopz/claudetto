// The result of the usage report: shares, medians, and tables from the sums
// that `report.mjs` collects.

import { briefStats, median, quantile } from "./parse.mjs";
import { callsPerRun, unusedSkills } from "./runs.mjs";

/** The report from the sums of one pass: `s` holds the locals of `report`. */
export function summarize(s) {
  const {
    agentCalls,
    byAgent,
    cache,
    entrypoints,
    expected,
    expectedCost,
    first,
    limitHits,
    limited,
    mainTurns,
    output,
    overWindow,
    rewrites,
    runLimit,
    runs,
    runsByType,
    sessionResultTokens,
    listed,
    skills,
    total,
    turns,
    callRuns,
    configDir,
    wakeCost,
    wakes,
    advisor,
  } = s;
  const byId = new Map(
    [...agentCalls.values()]
      .filter((c) => c.agentId)
      .map((c) => [c.agentId, c]),
  );
  const latest = runs
    .sort((a, b) => b.at - a.at)
    .slice(0, runLimit)
    .map((r) => {
      const call = byId.get(r.id);
      return {
        id: r.id,
        type: r.type,
        description: call?.description ?? "",
        cost: Math.round(r.cost * 100) / 100,
        handback: r.handback || call?.handback || "",
      };
    });
  const share = (x) => (total ? Math.round((1000 * x) / total) / 10 : 0);
  const hit = ([context, read]) =>
    context ? Math.round((1000 * read) / context) / 10 : null;
  const capped = limited.filter((r) => r.capped);
  return {
    total: Math.round(total * 100) / 100,
    turnCap: {
      runs: limited.length,
      capped: briefStats(capped),
      other: briefStats(limited.filter((r) => !r.capped)),
    },
    byAgent: Object.entries(byAgent)
      .sort((a, b) => b[1] - a[1])
      .map(([type, cost]) => ({
        type,
        cost: Math.round(cost * 100) / 100,
        share: share(cost),
      })),
    entrypoints,
    wakesByEntrypoint: wakes,
    limitHits,
    skills: Object.entries(skills)
      .sort((a, b) => b[1] - a[1])
      .map(([skill, uses]) => ({ skill, uses })),
    calls: callsPerRun(callRuns, runLimit),
    unusedSkills: unusedSkills(listed, new Set(Object.keys(skills)), configDir),
    overWindowShare: share(overWindow),
    rewriteShare: share(rewrites),
    expectedRewrites: expected,
    expectedRewriteShare: share(expectedCost),
    mainTurns: turns,
    wakeShare: share(wakeCost),
    advisor: { calls: advisor.calls, share: share(advisor.cost) },
    output,
    delegation: {
      mainTurns,
      runs: runs.length,
      runsByType: Object.entries(runsByType)
        .sort((a, b) => b[1] - a[1])
        .map(([type, n]) => ({ type, runs: n })),
      runsPer100Turns: mainTurns
        ? Math.round((1000 * runs.length) / mainTurns) / 10
        : null,
      resultTokensPerSession: {
        sessions: sessionResultTokens.length,
        median: median(sessionResultTokens),
        p90: quantile(sessionResultTokens, 0.9),
      },
      latestRuns: latest,
    },
    cacheHitRate: { all: hit(cache.all), main: hit(cache.main) },
    firstCallAfterPrompt: Object.fromEntries(
      Object.entries(first).map(([k, [calls, write, context]]) => [
        k,
        {
          calls,
          avgWrite: calls ? Math.round(write / calls) : 0,
          writeShare: context ? Math.round((1000 * write) / context) / 10 : 0,
        },
      ]),
    ),
  };
}
