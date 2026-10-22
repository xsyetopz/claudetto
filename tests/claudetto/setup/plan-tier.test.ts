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

test("setup writes the cap of each known plan: 6 for Max 20x, 4 for Max 5x, and 2 for Pro", async () => {
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
    "6",
    "4",
    "2",
  ]);
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

test("setup offers no code-intelligence tool, and writes no `UserPromptSubmit` hook", async () => {
  const { settings, text } = await run({
    organizationRateLimitTier: "default_claude_max_20x",
  });
  expect(settings.hooks?.UserPromptSubmit).toBeUndefined();
  expect(text.toLowerCase()).not.toMatch(/codegraph|lsp|code intelligence/);
});
