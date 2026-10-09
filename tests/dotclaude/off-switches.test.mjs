// The off switches of the profile (design D14): the forced-off keys, the built-in plugins,
// the never-set list, the eval-gated items, and the claude.ai switches.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  GATED,
  withGated,
} from "../../plugins/dotclaude/features/setup/gated.mjs";
import { neverSetViolations } from "../../plugins/dotclaude/lib/never-set.mjs";

const ROOT = path.join(import.meta.dirname, "../..");
const PROFILE = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "plugins/dotclaude/features/setup/profile.json"),
    "utf8",
  ),
);

test("the profile turns off the built-in plugins, and keeps `plugin-authoring` and `sec-default`", () => {
  const { enabledPlugins } = PROFILE;
  for (const name of [
    "agents-md",
    "claude-test",
    "diff",
    "mermaid",
    "mods-guide",
    "responsive-mode",
    "telemetry",
    "tips",
    "you-should-know",
  ])
    expect(enabledPlugins[`cc-plugin-${name}@builtin`]).toBe(false);
  expect(enabledPlugins["cc-plugin-plugin-authoring@builtin"]).toBeUndefined();
  expect(enabledPlugins["cc-plugin-sec-default@builtin"]).toBeUndefined();
  expect(PROFILE.skillOverrides["plugin-authoring"]).toBe("name-only");
});

test("the profile forces off the parts of design D14", () => {
  expect(PROFILE).toMatchObject({
    spinnerTipsEnabled: false,
    feedbackSurveyRate: 0,
    feedbackDrafts: "off",
    fastMode: false,
    disableAgentView: true,
    disableRemoteControl: true,
    syncClaudeAiSkills: false,
    syncClaudeAiPlugins: false,
    disableClaudeAiConnectors: true,
  });
  expect(PROFILE.env).toMatchObject({
    CLAUDE_CODE_DISABLE_CFC_PROMPT: "1",
    CLAUDE_CODE_DISABLE_CRON: "1",
    CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "1",
    CLAUDE_CODE_DISABLE_TERMINAL_TITLE: "1",
    CLAUDE_CODE_ATTRIBUTION_HEADER: "0",
    CLAUDE_CODE_AUTO_CONNECT_IDE: "false",
    CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL: "1",
    CLAUDE_CODE_TODO_REMINDER_MODE: "off",
  });
  for (const rule of ["Agent(claude-code-guide)", "Agent(statusline-setup)"])
    expect(PROFILE.permissions.deny).toContain(rule);
});

test("the profile denies the `computer-use` server, the only lever that 2.13 found", () => {
  expect(PROFILE.permissions.deny).toContain("mcp__computer-use");
});

test("the profile sets nothing of the never-set list", () => {
  expect(neverSetViolations(PROFILE)).toEqual([]);
});

test("the never-set check fails on a fixture that sets `CLAUDE_CODE_EFFORT_LEVEL`, and names it", () => {
  const fixture = {
    ...PROFILE,
    env: { ...PROFILE.env, CLAUDE_CODE_EFFORT_LEVEL: "high" },
    disableAllHooks: true,
  };
  expect(neverSetViolations(fixture)).toEqual([
    "disableAllHooks",
    "env.CLAUDE_CODE_EFFORT_LEVEL",
  ]);
});

test("a never-set entry with a banned value is flagged only for that value", () => {
  expect(
    neverSetViolations({ env: { CLAUDE_CODE_ENABLE_TASKS: "0" } }),
  ).toEqual(["env.CLAUDE_CODE_ENABLE_TASKS"]);
  expect(
    neverSetViolations({ env: { CLAUDE_CODE_ENABLE_TASKS: "1" } }),
  ).toEqual([]);
});

test("the eval-gated items are not in the profile, and `--with` adds each one", () => {
  const text = JSON.stringify(PROFILE);
  for (const word of ["DISABLE_TELEMETRY", "NONESSENTIAL_TRAFFIC"])
    expect(text).not.toContain(word);
  expect(Object.keys(GATED).sort()).toEqual([
    "nonessential-traffic",
    "subagent-cache-1h",
    "telemetry",
  ]);
  expect(PROFILE.subagentPromptCacheTtl).toBeUndefined();
  expect(withGated(PROFILE, ["subagent-cache-1h"]).subagentPromptCacheTtl).toBe(
    "1h",
  );
  const all = withGated(PROFILE, Object.keys(GATED));
  expect(all.env.DISABLE_TELEMETRY).toBe("1");
  expect(all.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBe("1");
  expect(PROFILE.env.DISABLE_TELEMETRY).toBeUndefined();
  expect(() => withGated(PROFILE, ["nope"])).toThrow("nope");
});

test("the profile holds the items that the eval of 2026-10-08 moved", () => {
  expect(PROFILE.includeGitInstructions).toBe(false);
  expect(PROFILE.permissions.deny).toEqual(
    expect.arrayContaining([
      "EnterPlanMode",
      "ExitPlanMode",
      "TaskCreate",
      "TaskGet",
      "TaskList",
      "TaskStop",
      "TaskUpdate",
    ]),
  );
  for (const item of ["plan-mode", "task-tools", "git-instructions"])
    expect(GATED).not.toHaveProperty(item);
});
