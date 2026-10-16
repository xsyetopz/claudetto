// The trigger of the auto compaction in the generated settings snippet, for each model family (task 3.4).
// The formula is the formula of the Claude Code 2.1.301 bundle:
// `E = window - min(maxOutputTokens, 20000)`, and the trigger is `min(floor(E * pct / 100), E - 13000)`.
// The client blocks the next request at `E - 3000`.

import { expect, test } from "bun:test";
import { SNIPPET } from "../../../plugins/claudetto/snippets.ts";
import {
  COMPACT_OUTPUT_RESERVE,
  HAIKU_HANDOFF_TRIGGER_TOKENS,
  HANDOFF_TRIGGER_TOKENS,
} from "../../../src/kernel/budget.ts";

type Settings = {
  env: Record<string, string>;
  autoCompactWindow: number;
  modelSettings: Record<string, { autoCompactWindow: number }>;
  availableModels: string[];
};

const settings = SNIPPET as unknown as Settings;

const effective = (window: number): number => window - COMPACT_OUTPUT_RESERVE;

const trigger = (window: number, pct: number): number =>
  Math.min(
    Math.floor((effective(window) * pct) / 100),
    effective(window) - 13_000,
  );

/** The window of `model`: its `modelSettings` window, or the top-level window. */
const windowOf = (model: string): number =>
  settings.modelSettings[model]?.autoCompactWindow ??
  settings.autoCompactWindow;

test("the snippet sets no key that turns the auto compaction off", () => {
  for (const key of [
    "DISABLE_COMPACT",
    "DISABLE_AUTO_COMPACT",
    "CLAUDE_CODE_AUTO_COMPACT_WINDOW",
  ])
    expect(settings.env[key], key).toBeUndefined();
  expect("autoCompactEnabled" in settings).toBe(false);
});

test("the auto compaction of each model family starts at or below its bound and before the client blocks", () => {
  const pct = Number.parseFloat(
    settings.env["CLAUDE_AUTOCOMPACT_PCT_OVERRIDE"] ?? "",
  );
  expect(pct > 0 && pct <= 100).toBe(true);
  const families = ["opus", "sonnet", "fable", "haiku"];
  for (const family of families) {
    const model = settings.availableModels.find((m) => m.includes(family));
    expect(model, family).toBeDefined();
    const window = windowOf(model as string);
    const bound =
      family === "haiku"
        ? HAIKU_HANDOFF_TRIGGER_TOKENS
        : HANDOFF_TRIGGER_TOKENS;
    const at = trigger(window, pct);
    expect(at, model).toBeLessThanOrEqual(bound);
    expect(at, model).toBeGreaterThan(bound - 100);
    expect(at, model).toBeLessThan(effective(window) - 3_000);
  }
});
