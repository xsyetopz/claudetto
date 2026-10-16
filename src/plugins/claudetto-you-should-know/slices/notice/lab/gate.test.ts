// Lab tests of the gate and of the run with no screen: the cached value `tengu_jolly_dewdrop`, the one notice when it is off, and the topic as context in `-p`.
// The stubs answer the state file, the surfaces, and the model calls. No model call goes out.

import type { ModelCompleteResult, On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const NO_USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

const answered = (text: string): ModelCompleteResult => ({
  isAnswered: true,
  text,
  usage: NO_USAGE,
});

const TOPIC =
  // biome-ignore lint/plugin: the topic is test input data
  "Ten tries with no delay can hit the rate limit of the API faster.";
const EDIT = {
  file_path: "/p/src/retry.mjs",
  old_string: "3",
  new_string: "10",
};

type World = {
  /** The text of the state file, or `undefined` when the file is missing. */
  readonly file?: string;
  readonly surfaces: readonly ("terminal" | "desktop")[];
  readonly env?: Record<string, string>;
};

const flag = (value: unknown) =>
  JSON.stringify({ cachedGrowthBookFeatures: { tengu_jolly_dewdrop: value } });

/** Stubs for one test. Returns what the stubs saw: each read path, each prompt, and each transcript line. */
const setup = (on: On, world: World) => {
  const seen = {
    reads: [] as string[],
    prompts: [] as string[],
    lines: [] as string[],
  };
  const clock = mock.clock(on);
  mock.env(on, world.env ?? { HOME: "/home/u" });
  on("fs.read", (_$, e) => {
    seen.reads.push(e.path);
    if (world.file === undefined) throw new Error("ENOENT");
    return { value: world.file };
  });
  on("session.surfaces", () => ({ value: world.surfaces }));
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("turn.start", (_$, e) => ({ turnId: e.turnId }));
  on("tool.check", () => ({ decision: "allow" as const }));
  on("tool.call", () => ({ result: "ok", context: ["other"] }));
  on("model.complete", (_$, e) => {
    seen.prompts.push(e.prompt);
    return {
      value: answered(
        JSON.stringify({ topic: TOPIC, id: "a-topic", claims: [] }),
      ),
    };
  });
  on("ui.log", (_$, e) => {
    if (e.to !== "debug") seen.lines.push(e.text);
    return { value: undefined };
  });
  return { seen, clock };
};

/** A session start, a turn, and one edit that is checked. */
const edit = async ($: Engine, clock: ReturnType<typeof mock.clock>) => {
  await $.session.start({ cwd: "/p", surface: null, isInteractive: true });
  await $.turn.start({ text: "Raise the tries.", turnId: "t1" });
  await $.tool.check({ tool: "Edit", input: EDIT, tool_use_id: "toolu_1" });
  for (let i = 0; i < 5; i++) await clock.advance(0);
};

test("a session with the flag on makes the check", async ($: Engine, on: On) => {
  const { seen, clock } = setup(on, {
    file: flag(true),
    surfaces: ["terminal"],
  });
  await edit($, clock);
  expect(seen.prompts.length).toBe(1);
  expect(seen.lines).toStrictEqual([]);
  expect(seen.reads).toStrictEqual(["/home/u/.claude.json"]);
});

test("a session with the flag off makes no check and says why once", async ($: Engine, on: On) => {
  const { seen, clock } = setup(on, {
    file: flag(false),
    surfaces: ["terminal"],
  });
  await edit($, clock);
  await $.turn.start({ text: "Again.", turnId: "t2" });
  await $.tool.check({ tool: "Edit", input: EDIT, tool_use_id: "toolu_2" });
  for (let i = 0; i < 5; i++) await clock.advance(0);
  expect(seen.prompts).toStrictEqual([]);
  expect(seen.lines.length).toBe(1);
  expect(seen.lines[0]).toContain("tengu_jolly_dewdrop");
});

// biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
test("a state file with no value, and a missing state file, count as off", async ($: Engine, on: On) => {
  const none = setup(on, { file: "{}", surfaces: ["terminal"] });
  await edit($, none.clock);
  expect(none.seen.prompts).toStrictEqual([]);
  expect(none.seen.lines.length).toBe(1);
});

test("a missing state file counts as off", async ($: Engine, on: On) => {
  const { seen, clock } = setup(on, { surfaces: ["terminal"] });
  await edit($, clock);
  expect(seen.prompts).toStrictEqual([]);
  expect(seen.lines.length).toBe(1);
});

// biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
test("the flag is read from the config folder when `CLAUDE_CONFIG_DIR` is set", async ($: Engine, on: On) => {
  const { seen, clock } = setup(on, {
    file: flag(true),
    surfaces: ["terminal"],
    env: { HOME: "/home/u", CLAUDE_CONFIG_DIR: "/cfg" },
  });
  await edit($, clock);
  expect(seen.reads).toStrictEqual(["/cfg/.claude.json"]);
  expect(seen.prompts.length).toBe(1);
});

// biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
test("a run with no screen gives the topic to Claude as context with the result of the edit", async ($: Engine, on: On) => {
  const { seen, clock } = setup(on, { file: flag(true), surfaces: [] });
  await edit($, clock);
  expect(seen.prompts.length).toBe(1);
  const out = await $.tool.call({ tool: "Edit", ...EDIT });
  expect(out.context).toStrictEqual(["other", expect.stringContaining(TOPIC)]);
  expect(out.context?.[1]).toContain("side check by a model");
  const again = await $.tool.call({ tool: "Edit", ...EDIT });
  expect(again.context).toStrictEqual(["other"]);
});

// biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
test("a run with no screen waits for the check before the verdict returns", async ($: Engine, on: On) => {
  const { seen, clock } = setup(on, { file: flag(true), surfaces: [] });
  await $.session.start({ cwd: "/p", surface: null, isInteractive: false });
  await $.turn.start({ text: "Raise the tries.", turnId: "t1" });
  // No `clock.advance`: the verdict returns after the model call, and the note is there.
  await $.tool.check({ tool: "Edit", input: EDIT, tool_use_id: "toolu_1" });
  expect(seen.prompts.length).toBe(1);
  const out = await $.tool.call({ tool: "Edit", ...EDIT });
  expect(out.context?.length).toBe(2);
  void clock;
});
