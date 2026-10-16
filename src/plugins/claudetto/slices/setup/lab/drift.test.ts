// Lab tests of the `session.start` drift check of the `setup` slice.
// The stubs answer the reads of the module, and a `ui.log` stub records the notice that the check shows.
// The check appends nothing to the conversation, so the model never reads the notice.
// The file is self-contained, because `just generate` copies it to `tests/` of the plugin, where it cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

/**
 * Stubs for a session with no drift in the facts that the stubs give.
 * `settings` is the merged settings, and a missing value makes the read fail.
 * A failed read gives no line, so the settings are the only fact that the tests below change.
 */
const stub = (on: On, settings?: Record<string, unknown>) => {
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("settings.read", (_$, e) => {
    if (e.source === "policy") return { value: {} };
    if (!settings) throw new Error("no settings");
    return { value: settings };
  });
  on("session.turns", () => ({ value: 0 }));
  mock.env(on, {});
  // The `decide` handler of `session.start` registers its tool in the same start.
  on("tool.register", (_$, e) => ({
    value: { tool: `mcp__claudetto__${e.name}` },
  }));
  const shown: string[] = [];
  on("ui.log", (_$, e) => {
    shown.push(e.text);
    return { value: undefined };
  });
  return { shown, session: mock.session(on) };
};

const start = ($: Engine) =>
  $.session.start({ cwd: "/work/app", surface: null, isInteractive: false });

test("no drift adds no text", async ($: Engine, on: On) => {
  const { shown, session } = stub(on);
  await start($);
  expect(shown).toEqual([]);
  expect(session.appended()).toEqual([]);
});

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("a settings file without the snippet names the missing values and the setup skill", async ($: Engine, on: On) => {
  const { shown, session } = stub(on, { syncClaudeAiSkills: false });
  await start($);
  expect(session.appended()).toEqual([]);
  const [note] = shown;
  expect(note).toContain("`syncClaudeAiPlugins`");
  expect(note).not.toContain("`syncClaudeAiSkills`");
  expect(note).toContain("`/claudetto:setup`");
});
