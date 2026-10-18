// Lab tests of the `session.start` hook of the `decide` slice: it registers the tool `second_opinion` only when the option `decide` is not `off`.
// The stub of `tool.register` records the spec that the hook gives.
// The file is self-contained, because `just generate` copies it to `tests/` of the plugin, where it cannot import a relative file.

import type { On, PluginOptions } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

/** Stubs for one test: the list of the specs of `second_opinion` that the hook registers. The tool of another slice, such as `ai_policy`, is not in the list. */
const stub = (on: On): Array<Record<string, unknown>> => {
  mock.env(on, { TYPESAFE_API_KEY: "typesafe-key" });
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  const specs: Array<Record<string, unknown>> = [];
  on("tool.register", (_$, e) => {
    if (e.name === "second_opinion") specs.push({ ...e });
    return { value: { tool: `mcp__claudetto__${e.name}` } };
  });
  return specs;
};

const start = ($: Engine) =>
  $.session.start({ cwd: "/work/app", surface: null, isInteractive: false });

const option = (decide?: string): { options: PluginOptions } => ({
  options: decide === undefined ? {} : { decide },
});

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "with the option left out, session start registers no tool and passes the session on",
  option(),
  async ($: Engine, on: On) => {
    const specs = stub(on);
    const out = await start($);
    expect(specs).toEqual([]);
    expect(out.cwd).toBe("/work/app");
  },
);

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "with the option off, session start registers no tool and passes the session on",
  option("off"),
  async ($: Engine, on: On) => {
    const specs = stub(on);
    await start($);
    expect(specs).toEqual([]);
  },
);

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "with the option `claude`, session start registers `second_opinion`",
  option("claude"),
  async ($: Engine, on: On) => {
    const specs = stub(on);
    await start($);
    expect(specs).toHaveLength(1);
    expect(specs[0]).toMatchObject({
      name: "second_opinion",
      isDeferred: false,
    });
  },
);

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "with the option `jev`, session start registers the tool with its input schema",
  option("jev"),
  async ($: Engine, on: On) => {
    const specs = stub(on);
    await start($);
    expect(specs).toHaveLength(1);
    expect(specs[0]?.["inputSchema"]).toMatchObject({ required: ["question"] });
  },
);

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "the `decide` handler runs on an interactive start and on a non-interactive start",
  option("claude"),
  async ($: Engine, on: On) => {
    const specs = stub(on);
    for (const isInteractive of [true, false])
      await $.session.start({ cwd: "/work/app", surface: null, isInteractive });
    expect(specs).toHaveLength(2);
  },
);
