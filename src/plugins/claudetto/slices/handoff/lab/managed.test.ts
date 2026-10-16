// Lab tests of the managed-environments notice of the `handoff` slice (spec `handoff`, "Managed environments").
// The stubs answer the managed settings, the env, and the state file of Claude Code,
// and record each `$.ui.log` line and each registered command.
// The `setup` slice reads the same facts at session start, and `mock.session` takes its note.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

/** What the stubs answer: the managed settings, and the plan of the organization in the state file. */
type World = { policy?: Record<string, unknown>; plan?: string };

/** The stubs for `world`, and the `$.ui.log` lines and the `register` lines, in order. */
const engine = (on: On, world: World = {}): string[] => {
  const logs: string[] = [];
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("settings.read", (_$, e) => ({
    value: e.source === "policy" ? (world.policy ?? {}) : {},
  }));
  on("session.turns", () => ({ value: 0 }));
  mock.env(on, { HOME: "/home/u" });
  mock.session(on);
  on("fs.read", (_$, e) => {
    if (e.path !== "/home/u/.claude.json") throw new Error("missing");
    const account = world.plan ? { organizationType: world.plan } : {};
    return { value: JSON.stringify({ oauthAccount: account }) };
  });
  on("tool.register", (_$, e) => ({
    value: { tool: `mcp__claudetto__${e.name}` },
  }));
  on("command.register", (_$, e) => {
    logs.push(`register ${e.name}`);
    return { value: { command: e.name } };
  });
  on("ui.log", (_$, e) => {
    logs.push(e.text);
    return { value: undefined };
  });
  return logs;
};

const start = ($: Engine) =>
  $.session.start({ cwd: "/p", surface: null, isInteractive: true });

/** The notice lines in `logs`. */
const notices = (logs: string[]) =>
  logs.filter((line) => line.startsWith("The handoff of a compaction is off"));

// biome-ignore lint/plugin: a test name
test("a seated guard from managed settings gives one notice with the `appendPlugins` entry", async ($: Engine, on: On) => {
  const logs = engine(on, { policy: { permissions: { deny: [] } } });
  await start($);
  const found = notices(logs);
  expect(found).toHaveLength(1);
  expect(found[0]).toContain('`"appendPlugins": ["claudetto@claudetto"]`');
  expect(found[0]).toContain(
    '`"enabledPlugins": {"claudetto@claudetto": true}`',
  );
});

// biome-ignore lint/plugin: a test name
test("a seated guard from a Team plan with no managed settings gives one notice", async ($: Engine, on: On) => {
  const logs = engine(on, { plan: "claude_team" });
  await start($);
  expect(notices(logs)).toHaveLength(1);
});

test("`claudetto` in `appendPlugins` gives no notice", async ($: Engine, on: On) => {
  const logs = engine(on, {
    policy: {
      appendPlugins: ["claudetto@claudetto"],
      enabledPlugins: { "claudetto@claudetto": true },
    },
    plan: "claude_enterprise",
  });
  await start($);
  expect(notices(logs)).toEqual([]);
});

// biome-ignore lint/plugin: a test name
test("a machine with no managed settings and a personal plan gives no notice", async ($: Engine, on: On) => {
  const logs = engine(on, { plan: "claude_max" });
  await start($);
  expect(notices(logs)).toEqual([]);
});

// biome-ignore lint/plugin: a test name
test("a managed `prependPlugins` that does not name the guard gives no notice", async ($: Engine, on: On) => {
  const logs = engine(on, { policy: { prependPlugins: ["audit@corp"] } });
  await start($);
  expect(notices(logs)).toEqual([]);
});

// biome-ignore lint/plugin: a test name
test("a managed `prependPlugins` that names the guard gives one notice", async ($: Engine, on: On) => {
  const logs = engine(on, {
    policy: { prependPlugins: ["cc-plugin-sec-default@builtin"] },
  });
  await start($);
  expect(notices(logs)).toHaveLength(1);
});

// biome-ignore lint/plugin: a test name
test("with the notice, the session start still registers `/handoff`", async ($: Engine, on: On) => {
  const logs = engine(on, { plan: "claude_team" });
  await start($);
  expect(notices(logs)).toHaveLength(1);
  expect(logs).toContain("register handoff");
});
