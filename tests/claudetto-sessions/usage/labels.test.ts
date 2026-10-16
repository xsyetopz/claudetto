// Tests of the labels and the counts of the usage report (sessions rows 82 and 83): an unknown model, and one label for one count.

import { expect, test } from "bun:test";
import { textOf } from "../../../plugins/claudetto-sessions/slices/usage/domain/text.ts";
import { callCost } from "../../../src/plugins/claudetto-sessions/slices/usage/domain/parse.ts";
import { report } from "../../../src/plugins/claudetto-sessions/slices/usage/domain/report.ts";
import type { Store } from "../../../src/plugins/claudetto-sessions/slices/usage/ports.ts";

const NOW = new Date().toISOString();

/** A store with one transcript, `main.jsonl`, that holds `lines`. */
const storeOf = (lines: object[]): Store => {
  const text = lines.map((line) => JSON.stringify(line)).join("\n");
  return {
    read: async (file: string) => (file.endsWith("main.jsonl") ? text : null),
    list: async () => [],
    tree: async () => ["main.jsonl"],
    mtime: async () => Date.now(),
  } as unknown as Store;
};

const call = (id: string, model: string, usage: object) => ({
  type: "assistant",
  timestamp: NOW,
  message: { id, model, stop_reason: "end_turn", usage, content: [] },
});

const prompt = { type: "user", timestamp: NOW, message: { content: "hi" } };
const since = new Date(Date.now() - 86_400_000);
const options = { configDir: "/nowhere" };

test("a model with no price keeps its token counts, and the report names the model", async () => {
  const usage = { input_tokens: 1000, cache_read_input_tokens: 250_000 };
  const cost = callCost("claude-3-opus-20240229", usage);
  expect(cost).toMatchObject({ context: 251_000, read: 250_000, total: 0 });
  expect(cost.priced).toBe(false);
  const r = await report(
    storeOf([prompt, call("a", "claude-3-opus-20240229", usage)]),
    "/r",
    since,
    options,
  );
  expect(r.cacheHitRate.all).toBeGreaterThan(99);
  expect(r.unknownModels).toStrictEqual({
    calls: 1,
    models: ["claude-3-opus-20240229"],
  });
  expect(textOf(r, 1, null).join("\n")).toContain(
    "Calls with a model that has no price: 1 (claude-3-opus-20240229)",
  );
});

test("a report with only known models has no unknown-model line", async () => {
  const r = await report(
    storeOf([prompt, call("a", "claude-sonnet-5-5", { input_tokens: 10 })]),
    "/r",
    since,
    options,
  );
  expect(r.unknownModels.calls).toBe(0);
  expect(textOf(r, 1, null).join("\n")).not.toContain("no price");
});

test("one prompt and three calls give 1 turn and 3 calls, each under its own label", async () => {
  const usage = { input_tokens: 10 };
  const r = await report(
    storeOf([
      prompt,
      call("a", "claude-sonnet-5-5", usage),
      call("b", "claude-sonnet-5-5", usage),
      call("c", "claude-sonnet-5-5", usage),
    ]),
    "/r",
    since,
    options,
  );
  expect(r.mainTurns).toStrictEqual({ wake: 0, other: 1 });
  expect(r.delegation.mainCalls).toBe(3);
  const text = textOf(r, 1, null).join("\n");
  expect(text).toContain(
    "Main turns (prompts) started by background agents: 0 of 1",
  );
  expect(text).toContain("in 3 main calls");
  expect(text).not.toContain("main turns,");
});
