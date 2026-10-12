// Lab tests of the `session.start` hook of the `decide` slice: it registers the tool `second_opinion`.
// The stub of `tool.register` records the spec that the hook gives, and the stub of the environment sets the key.
// The file is self-contained, because `just generate` copies it to `tests/` of the plugin, where it cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

/** Stubs for one test: the value of the key, and the list of the tool specs that the hook registers. */
const stub = (on: On, key: string): Array<Record<string, unknown>> => {
  mock.env(on, { TYPESAFE_API_KEY: key });
  const specs: Array<Record<string, unknown>> = [];
  on("tool.register", (_$, e) => {
    specs.push({ ...e });
    return { value: { tool: `mcp__dotclaude__${e.name}` } };
  });
  return specs;
};

const start = ($: Engine) =>
  $.session.start({ cwd: "/work/app", surface: null, isInteractive: false });

test("session start with no key registers `second_opinion` and passes the session on", async ($: Engine, on: On) => {
  const specs = stub(on, "");
  await start($);
  expect(specs).toHaveLength(1);
  expect(specs[0]).toMatchObject({ name: "second_opinion", isDeferred: false });
});

test("session start with a key registers the same tool with its input schema", async ($: Engine, on: On) => {
  const specs = stub(on, "typesafe-key");
  await start($);
  expect(specs).toHaveLength(1);
  expect(specs[0]).toMatchObject({ name: "second_opinion", isDeferred: false });
  expect(specs[0]?.["inputSchema"]).toMatchObject({ required: ["question"] });
});
