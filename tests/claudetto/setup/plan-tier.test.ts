// Setup writes the subagent cap of the plan of the login (task 7.4 of change `0-3-0`, design D3), and offers no code-intelligence tool.

import { expect, test } from "bun:test";
import { runSetup } from "../../support/setup-run.ts";

/** Runs setup in `scope` with `account` as the `oauthAccount` of `.claude.json`. */
const run = (account?: object, scope = "user") =>
  runSetup(
    account
      ? { ".claude.json": JSON.stringify({ oauthAccount: account }) }
      : {},
    scope,
  );

const cap = (settings: { env: Record<string, string> }) =>
  settings.env["CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS"];

test("setup writes the cap of each known plan: 5 for Max 20x, 4 for Max 5x, and 3 for Pro", async () => {
  const max20 = await run({
    organizationType: "claude_max",
    organizationRateLimitTier: "default_claude_max_20x",
  });
  const max5 = await run({
    organizationType: "claude_max",
    organizationRateLimitTier: "default_claude_max_5x",
  });
  const pro = await run({ organizationType: "claude_pro" });
  expect([max20, max5, pro].map((r) => cap(r.settings))).toStrictEqual([
    "5",
    "4",
    "3",
  ]);
});

/** Runs setup with `account` and a user value `6` for the cap. */
const runWithSix = (account: object) =>
  runSetup({
    ".claude.json": JSON.stringify({ oauthAccount: account }),
    "settings.json": JSON.stringify({
      env: { CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "6" },
    }),
  });

test("Max 20x Cap and Cap Changed: the user value `6` becomes `5`", async () => {
  const { settings } = await runWithSix({
    organizationRateLimitTier: "default_claude_max_20x",
  });
  expect(cap(settings)).toBe("5");
});

test("Unknown Tier Cap: the user value `6` stays", async () => {
  const { settings } = await runWithSix({
    organizationRateLimitTier: "enterprise_usage_based",
  });
  expect(cap(settings)).toBe("6");
});

test("setup writes no cap for an unknown tier, and names the tier", async () => {
  const { settings, text } = await run({
    organizationType: "claude_enterprise",
    organizationRateLimitTier: "enterprise_usage_based",
  });
  expect(cap(settings)).toBeUndefined();
  expect(text).toContain("enterprise_usage_based");
});

test("setup writes no cap with no subscription login, and says so", async () => {
  const { settings, text } = await run();
  expect(cap(settings)).toBeUndefined();
  expect(text).toContain("CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS");
});

test("setup writes no cap in the shared project settings", async () => {
  const { settings } = await run(
    { organizationRateLimitTier: "default_claude_max_20x" },
    "project",
  );
  expect(cap(settings)).toBeUndefined();
});

const plan = (settings: { pluginConfigs?: Record<string, unknown> }) =>
  settings.pluginConfigs?.["claudetto@claudetto"];

test("Max 20x: setup writes the option `plan` of the tier", async () => {
  const { settings } = await run({
    organizationRateLimitTier: "default_claude_max_20x",
  });
  expect(plan(settings)).toStrictEqual({
    options: { plan: "default_claude_max_20x" },
  });
});

test("API Key and Unknown Tier: setup writes no option `plan`", async () => {
  const apiKey = await run();
  const unknown = await run({ organizationRateLimitTier: "enterprise_x" });
  expect([plan(apiKey.settings), plan(unknown.settings)]).toStrictEqual([
    undefined,
    undefined,
  ]);
});

test("setup writes `plan` under the `claudetto@*` id of the user, and keeps the other options", async () => {
  const { settings } = await runSetup({
    ".claude.json": JSON.stringify({
      oauthAccount: { organizationType: "claude_pro" },
    }),
    "settings.json": JSON.stringify({
      pluginConfigs: { "claudetto@mine": { options: { decide: "off" } } },
    }),
  });
  expect(settings.pluginConfigs).toStrictEqual({
    "claudetto@mine": { options: { decide: "off", plan: "claude_pro" } },
  });
});

test("setup writes no `UserPromptSubmit` hook", async () => {
  const { settings } = await run({
    organizationRateLimitTier: "default_claude_max_20x",
  });
  expect(settings.hooks?.UserPromptSubmit).toBeUndefined();
});
