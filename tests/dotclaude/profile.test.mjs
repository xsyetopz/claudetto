// The settings profile, the output style, the agents, and the hooks of the core plugin
// hold the values of `lib/budget.mjs`, and the files that Claude Code reads have the documented shape.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  BASH_OUTPUT_MAX_CHARS,
  CONTEXT_WINDOW,
} from "../../plugins/dotclaude/lib/budget.mjs";

const ROOT = path.join(import.meta.dirname, "../../plugins/dotclaude");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const json = (rel) => JSON.parse(read(rel));
test("the profile turns compaction and auto memory off, and sets the window", () => {
  const s = json("features/setup/profile.json");
  expect(s.autoCompactEnabled).toBe(false);
  expect(s.autoMemoryEnabled).toBe(false);
  expect(s.env.DISABLE_COMPACT).toBe("1");
  expect(Number(s.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS)).toBe(CONTEXT_WINDOW);
  expect(Number(s.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW)).toBe(CONTEXT_WINDOW);
  expect(s.bashOutputMaxChars).toBe(BASH_OUTPUT_MAX_CHARS);
  expect(s.permissions.disableBypassPermissionsMode).toBe("disable");
  expect(s.sandbox.enabled).toBe(true);
  expect(s.sandbox.allowUnsandboxedCommands).toBe(true);
});

test("the profile holds the five keys of the removed managed template, and no template ships", () => {
  const s = json("features/setup/profile.json");
  for (const key of [
    "autoCompactEnabled",
    "autoMemoryEnabled",
    "env",
    "permissions",
    "sandbox",
  ])
    expect(s[key]).toBeDefined();
  expect(
    fs.existsSync(path.join(ROOT, "templates/managed-settings.json")),
  ).toBe(false);
  expect(s.$schema).toEndWith("/schemas/claude-code-settings.json");
});

test("the profile asks before destructive git and publish commands", () => {
  const { ask, deny } = json("features/setup/profile.json").permissions;
  for (const rule of [
    "Bash(git push *--force*)",
    "Bash(git reset --hard*)",
    "Bash(npm publish*)",
    "Bash(sudo *)",
  ])
    expect(ask).toContain(rule);
  expect(deny).toContain("Read(~/.ssh/**)");
});

test("the profile sets no effort level, so each model keeps its default", () => {
  const s = json("features/setup/profile.json");
  expect(s.effortLevel).toBeUndefined();
  expect(s.env.CLAUDE_CODE_EFFORT_LEVEL).toBeUndefined();
});

test("the profile removes the large tools that it does not use, and the advisor", () => {
  const s = json("features/setup/profile.json");
  expect(s.enableArtifact).toBe(false);
  expect(s.enableWorkflows).toBe(false);
  for (const tool of ["ScheduleWakeup", "ReportFindings"])
    expect(s.permissions.deny).toContain(tool);
  expect(s.advisorModel).toBeUndefined();
});

test("the hooks are one module, command hooks for the auto-mode guard, and the report-now hook", () => {
  const hooks = json("hooks/hooks.json");
  expect(hooks.modules).toEqual(["./register.mjs"]);
  expect(Object.keys(hooks.hooks)).toEqual([
    "PreToolUse",
    "UserPromptSubmit",
    "PostToolUse",
    "Stop",
    "StopFailure",
    "SessionStart",
    "SessionEnd",
  ]);
  // The carry across `/clear` and the stop record of design D32, with the matcher values of probe 22.1.
  const context = 'node "${CLAUDE_PLUGIN_ROOT}/features/context/cli.mjs"';
  expect(hooks.hooks.StopFailure).toEqual([
    {
      matcher: "rate_limit|invalid_request",
      hooks: [{ type: "command", command: context }],
    },
  ]);
  expect(hooks.hooks.SessionStart).toEqual([
    { hooks: [{ type: "command", command: context }] },
  ]);
  expect(hooks.hooks.SessionEnd).toEqual([
    { matcher: "clear", hooks: [{ type: "command", command: context }] },
  ]);
  expect(hooks.hooks.PostToolUse[0].hooks[0].command).toBe(
    'node "${CLAUDE_PLUGIN_ROOT}/features/context/cli.mjs"',
  );
  // The groups for `features/reads` and `features/sembr` have their own tests.
  const guards = hooks.hooks.PreToolUse.filter(({ hooks: handlers }) =>
    handlers.every((h) => h.command.includes("features/guard/")),
  );
  expect(guards).toHaveLength(2);
  for (const { matcher, hooks: handlers } of guards)
    for (const h of handlers) {
      expect(h.command).toBe(
        'node "${CLAUDE_PLUGIN_ROOT}/features/guard/cli.mjs"',
      );
      if (matcher === "Bash") expect(h.if).toMatch(/^Bash\(.+ \*\)$/);
    }
});

// Design D31: a hook that cannot start lets the call through,
// because `onFailure: "block"` would block each guarded call until `node` works again.
test("no hook sets `onFailure`, so a hook that cannot start fails open", () => {
  const hooks = json("hooks/hooks.json");
  for (const groups of Object.values(hooks.hooks))
    for (const { hooks: handlers } of groups)
      for (const h of handlers) expect(h.onFailure).toBeUndefined();
});

test("the profile leaves retention to Claude Code", () => {
  expect(json("features/setup/profile.json").cleanupPeriodDays).toBeUndefined();
});

test("the profile has no cap on effort, the four roster models, and no haiku 4.5", () => {
  const s = json("features/setup/profile.json");
  expect(s.maxEffortLevel).toBe("max");
  expect(s.enforceAvailableModels).toBe(true);
  expect(s.availableModels).toEqual([
    "claude-opus-5-5",
    "claude-sonnet-5-5",
    "claude-haiku-5-5",
    "claude-fable-5-1",
  ]);
  expect(read("features/setup/profile.json")).not.toContain("claude-haiku-4-5");
});

test("the profile leaves the subagent cache lifetime to the eval-gated item (task 5.8)", () => {
  const s = json("features/setup/profile.json");
  expect(s.subagentPromptCacheTtl).toBeUndefined();
  expect(s.env.CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL).toBeUndefined();
});
