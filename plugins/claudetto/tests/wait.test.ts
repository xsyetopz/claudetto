// Lab tests of the `gate.long-wait` hook: a subagent `Bash` call that can block past the cache TTL is denied (task 19.11).
// The stub of `tool.call` stands for core: it runs no tool, and it keeps the input that reached it.
// The file is self-contained, because a lab test cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const SUB = "a1";

/** Stubs core, the env `env`, and the settings `settings`. `seen` holds the input of each call that reached core. */
const stub = (
  on: On,
  env: Record<string, string> = {},
  settings: Record<string, unknown> = {},
) => {
  const seen: Record<string, unknown>[] = [];
  on("session.cwd", () => ({ value: "/p" }));
  mock.env(on, { HOME: "/u", ...env });
  on("settings.read", () => ({ value: settings }));
  on("tool.call", (_$, e) => {
    seen.push(e as unknown as Record<string, unknown>);
    return { result: "ok" };
  });
  return seen;
};

/** A `Bash` call of the subagent `agentId` (none for the main thread) with the fields in `extra`. */
const bash = ($: Engine, extra: Record<string, unknown>, agentId?: string) =>
  $.tool.call({
    tool: "Bash",
    command: "sleep 1",
    ...extra,
    ...(agentId === undefined ? {} : { agentId }),
  });

test("Long Wait: a subagent call with a `timeout` over the bound is denied with a reason that names `Monitor`, and core gets no call", async ($: Engine, on: On) => {
  const seen = stub(on);
  const v = await bash($, { timeout: 600_000 }, SUB);
  expect(v.deny).toContain("`Monitor`");
  expect(seen.length).toBe(0);
});

test("Long Wait: a subagent call with no `timeout` and a `BASH_DEFAULT_TIMEOUT_MS` over the bound is denied", async ($: Engine, on: On) => {
  stub(on, { BASH_DEFAULT_TIMEOUT_MS: "600000" });
  const v = await bash($, {}, SUB);
  expect(v.deny).toContain("`Monitor`");
});

test("Long Wait: a subagent call with a `timeout` under the bound runs, also under a long default", async ($: Engine, on: On) => {
  const seen = stub(on, { BASH_DEFAULT_TIMEOUT_MS: "600000" });
  expect((await bash($, { timeout: 60_000 }, SUB)).deny).toBeUndefined();
  expect(seen.length).toBe(1);
});

test("Long Wait: a subagent call with no `timeout` and no default runs, because 120 s is under the bound", async ($: Engine, on: On) => {
  const seen = stub(on);
  expect((await bash($, {}, SUB)).deny).toBeUndefined();
  expect(seen.length).toBe(1);
});

test("Long Wait: a background call, a main-thread call, and a call of another tool run", async ($: Engine, on: On) => {
  const seen = stub(on);
  const bg = await bash($, { timeout: 600_000, run_in_background: true }, SUB);
  const main = await bash($, { timeout: 600_000 });
  const read = await $.tool.call({
    tool: "Read",
    file_path: "/p/a",
    agentId: SUB,
  });
  expect([bg.deny, main.deny, read.deny]).toStrictEqual([
    undefined,
    undefined,
    undefined,
  ]);
  expect(seen.length).toBe(3);
});

test("Long Wait: with a `1h` TTL in the env, the long call runs", async ($: Engine, on: On) => {
  stub(on, { CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL: "1h" });
  expect((await bash($, { timeout: 600_000 }, SUB)).deny).toBeUndefined();
});

test("Long Wait: with a `1h` TTL in the settings, the long call runs", async ($: Engine, on: On) => {
  stub(on, {}, { subagentPromptCacheTtl: "1h" });
  expect((await bash($, { timeout: 600_000 }, SUB)).deny).toBeUndefined();
});

test("Long Wait: with `ENABLE_PROMPT_CACHING_1H`, the long call runs", async ($: Engine, on: On) => {
  stub(on, { ENABLE_PROMPT_CACHING_1H: "1" });
  expect((await bash($, { timeout: 600_000 }, SUB)).deny).toBeUndefined();
});
