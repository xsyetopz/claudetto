// Lab tests of the hooks of the `decide` slice for `AskUserQuestion`: they ask Jev only with the option `jev` and a key.
// The stub of `process.run` stands for the Jev CLI and records each run, so no network call goes out.
// The file is self-contained, because `just generate` copies it to `tests/` of the plugin, where it cannot import a relative file.

import type { On, PluginOptions } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const answers = (confidence: number) =>
  JSON.stringify({ pick_0: { choice: "sql", confidence } });

/** Stubs for one test: the key, the confidence of the pick, and the list of the process runs. */
const stub = (on: On, key: string, confidence = 0.9): (readonly string[])[] => {
  mock.env(on, { TYPESAFE_API_KEY: key });
  const runs: (readonly string[])[] = [];
  on("process.run", (_$, e) => {
    runs.push(e.argv);
    return {
      value: {
        exitCode: 0,
        stdout: answers(confidence),
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

const STORE = {
  question: "Which store?",
  header: "Store",
  multiSelect: false,
  options: [
    { label: "sql", description: "relations" },
    { label: "kv", description: "keys" },
  ],
};

const COLOR = {
  question: "Which color?",
  header: "Color",
  multiSelect: false,
  options: [
    { label: "red", description: "warm" },
    { label: "blue", description: "cool" },
  ],
};

const ask = ($: Engine, questions = [STORE]) =>
  $.tool.call({ tool: "AskUserQuestion", questions });

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

test(
  "with the option `jev` and a sure pick, Jev answers and the built-in tool does not run",
  option("jev"),
  async ($: Engine, on: On) => {
    stub(on, "typesafe-key", 0.9);
    const seen = builtIn(on);
    const answer = await ask($);
    expect(seen.input).toBeUndefined();
    expect(JSON.stringify(answer)).toContain('"Which store?":"sql"');
    expect(JSON.stringify(answer)).toContain("Jev answered");
    expect(JSON.stringify(answer)).toContain("0.90");
  },
);

test(
  "with the option `jev` and an unsure pick, the dialog stays",
  option("jev"),
  async ($: Engine, on: On) => {
    stub(on, "typesafe-key", 0.55);
    const seen = builtIn(on);
    await ask($);
    expect(seen.input).toBeDefined();
    expect(JSON.stringify(seen.input)).not.toContain("Jev picks");
  },
);

const describeAsk = ($: Engine, on: On) => {
  on("tool.describe", () => ({ description: "Asks the user." }));
  return $.tool.describe({
    tool: "AskUserQuestion",
    description: "Asks the user.",
    provider: { plugin: "engine", tier: "core" },
  });
};

test(
  "`tool.describe` of `AskUserQuestion` adds the line for Jev with the option `jev` and a key",
  option("jev"),
  async ($: Engine, on: On) => {
    mock.env(on, { TYPESAFE_API_KEY: "typesafe-key" });
    const answer = await describeAsk($, on);
    expect(answer.description).toStartWith("Asks the user.");
    expect(answer.description).toContain("Jev may answer");
  },
);

test(
  "`tool.describe` of `AskUserQuestion` stays as it is with no key",
  option("jev"),
  async ($: Engine, on: On) => {
    mock.env(on, { TYPESAFE_API_KEY: "" });
    expect((await describeAsk($, on)).description).toBe("Asks the user.");
  },
);

test(
  "with one sure pick and one unsure pick, the dialog gets the note of Jev",
  option("jev"),
  async ($: Engine, on: On) => {
    mock.env(on, { TYPESAFE_API_KEY: "typesafe-key" });
    on("process.run", () => ({
      value: {
        exitCode: 0,
        stdout: JSON.stringify({
          pick_0: { choice: "sql", confidence: 0.9 },
          pick_1: { choice: "red", confidence: 0.55 },
        }),
        stderr: "",
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }));
    const seen = builtIn(on);
    await ask($, [STORE, COLOR]);
    expect(JSON.stringify(seen.input)).toContain("Jev picks");
  },
);
