// The status line shows the values that Claude Code reports, and no guess, default, or constant.
// The inputs are recorded shapes of the status line JSON of Claude Code 2.1.302 and later.

import { expect, test } from "bun:test";
import { main } from "../../../plugins/claudetto/modules/statusline/adapters/cli.ts";
import { depsFor, NOW, type Run, rowsOf } from "./support.ts";

const NOW_S = NOW / 1000;

test("the model segment shows `display_name` and the live `effort.level`, not a parsed id", async () => {
  const { text } = await rowsOf({
    model: { id: "claude-opus-5-5[1m]", display_name: "Opus 5.5 (1M context)" },
    effort: { level: "xhigh" },
  });
  expect(text).toContain("◈ Opus 5.5 (1M context) xhigh ✦");
});

test("a model with no effort support shows no effort, and `fast_mode` shows its mark", async () => {
  const { text } = await rowsOf({
    model: { id: "claude-haiku-4-5", display_name: "Haiku 4.5" },
    effort: undefined,
    thinking: { enabled: false },
    fast_mode: true,
  });
  expect(text).toContain("◈ Haiku 4.5 ↯");
});

test("the cache on a 5m `ttl` shows the `ttl` of the input and the time to `expires_at`", async () => {
  const { text } = await rowsOf({
    prompt_cache: {
      warm: true,
      caching_observed: true,
      ttl: "5m",
      expires_at: NOW_S + 252,
      hit_ratio: 0.91,
    },
  });
  expect(text).toContain("⌁ 4m/5m 91%");
});

test("the cache on a 1h `ttl` shows `1h`, and a cold cache shows the tokens to cache again", async () => {
  const warm = await rowsOf({
    prompt_cache: { warm: true, ttl: "1h", expires_at: NOW_S + 3000 },
  });
  expect(warm.text).toContain("⌁ 50m/1h");
  const cold = await rowsOf({
    prompt_cache: {
      warm: false,
      caching_observed: true,
      expires_at: null,
      recache_tokens_if_cold: 45_000,
    },
  });
  expect(cold.text).toContain("⌁ cold +45k");
});

test("the spend limit shows the dollars and the period of the input, and an overage shows its percent", async () => {
  const { text } = await rowsOf({
    rate_limits: {
      spend_limit: {
        used_percentage: 112.4,
        resets_at: NOW_S + 86_400,
        used_usd: 561.9,
        limit_usd: 500,
        period: "monthly",
      },
    },
  });
  expect(text).toContain("◷ spend 112% $562/$500 monthly");
});

test("the spend limit with no dollars shows only the percent", async () => {
  const { text } = await rowsOf({
    rate_limits: { spend_limit: { used_percentage: 62.8 } },
  });
  expect(text).toContain("◷ spend 63%");
  expect(text).not.toContain("$500");
});

test("the context shows the `used_percentage` and `context_window_size` of the input", async () => {
  const { text } = await rowsOf({
    context_window: {
      total_input_tokens: 500_000,
      context_window_size: 1_000_000,
      used_percentage: 51,
    },
  });
  expect(text).toContain("▤ ctx 51% of 1M");
});

const subagent = async (task: Record<string, unknown>) => {
  const run: Run = { status: -1, out: [], err: [] };
  await main(
    ["--subagent"],
    depsFor({ columns: 120, tasks: [task] }, run, {
      env: { COLUMNS: "120", NO_COLOR: "1" },
    }),
  );
  return JSON.parse(run.out[0] ?? "{}").content as string;
};

test("a subagent row shows the resolved `model`, `effort`, and `agentType` of the task, also when the caller overrode the model", async () => {
  const content = await subagent({
    id: "t1",
    agentType: "claudetto:Artemis",
    name: "Artemis",
    status: "running",
    model: "claude-opus-5-5",
    effort: "max",
    contextWindowSize: 1_000_000,
    tokenCount: 100_000,
    startTime: NOW - 5000,
  });
  expect(content).toContain("● Artemis opus-5-5 max");
  expect(content).toContain("100k/1M 10%");
});

test("a numeric `effort` of a subagent shows as given", async () => {
  const content = await subagent({
    id: "t1",
    name: "scout",
    status: "running",
    model: "claude-sonnet-5-5",
    effort: 8000,
  });
  expect(content).toContain("sonnet-5-5 8000");
});
