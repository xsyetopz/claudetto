// Lab tests of the `AskUserQuestion` hook of the `decide` slice: it asks Jev for a pick only with the option `jev`.
// The stub of `process.run` stands for the Jev CLI and records each run, so no network call goes out.
// The file is self-contained, because `just generate` copies it to `tests/` of the plugin, where it cannot import a relative file.

import type { On, PluginOptions } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const ANSWERS = JSON.stringify({
  kind_0: { choice: "facts", confidence: 0.9 },
  pick_0: { choice: "sql", confidence: 0.9 },
});

/** Stubs for one test: the key, and the list of the process runs. */
const stub = (on: On, key: string): (readonly string[])[] => {
  mock.env(on, { TYPESAFE_API_KEY: key });
  const runs: (readonly string[])[] = [];
  on("process.run", (_$, e) => {
    runs.push(e.argv);
    return {
      value: {
        exitCode: 0,
        stdout: ANSWERS,
        stderr: "",
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    };
  });
  return runs;
};

const option = (decide: string): { options: PluginOptions } => ({
  options: { decide },
});

const ask = ($: Engine) =>
  $.tool.call({
    tool: "AskUserQuestion",
    questions: [
      {
        question: "Which store?",
        header: "Store",
        multiSelect: false,
        options: [
          { label: "sql", description: "relations" },
          { label: "kv", description: "keys" },
        ],
      },
    ],
  });

/** Stubs the built-in tool, which answers with the input that the hook passes on. */
const builtIn = (on: On): { input: unknown } => {
  const seen = { input: undefined as unknown };
  on("tool.call", (_$, e, next) => {
    if (e.tool !== "AskUserQuestion") return next(e);
    seen.input = e;
    return { result: "ok" };
  });
  return seen;
};

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "with the option off, `AskUserQuestion` passes unchanged and no process runs",
  option("off"),
  async ($: Engine, on: On) => {
    const runs = stub(on, "typesafe-key");
    const seen = builtIn(on);
    await ask($);
    expect(runs).toEqual([]);
    expect(JSON.stringify(seen.input)).not.toContain("Jev");
  },
);

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "with the option `claude`, `AskUserQuestion` sends nothing to Jev",
  option("claude"),
  async ($: Engine, on: On) => {
    const runs = stub(on, "typesafe-key");
    builtIn(on);
    await ask($);
    expect(runs).toEqual([]);
  },
);

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "with the option `jev` and no key, `AskUserQuestion` sends nothing to Jev",
  option("jev"),
  async ($: Engine, on: On) => {
    const runs = stub(on, "");
    builtIn(on);
    await ask($);
    expect(runs).toEqual([]);
  },
);

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "with the option `jev` and a key, one run asks Jev for the questions",
  option("jev"),
  async ($: Engine, on: On) => {
    const runs = stub(on, "typesafe-key");
    builtIn(on);
    await ask($);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toContain("ask");
  },
);
