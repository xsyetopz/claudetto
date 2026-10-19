// The budget reader finds each `trace.jsonl` under a folder and checks it against the tags of its case.

import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  budgetFaultsIn,
  caseTags,
  parseTrace,
} from "../../tools/run-budget.ts";

const tags = { a: ["max-tool-calls:1", "max-tokens:10"] };
const call = (name: string) =>
  JSON.stringify({
    type: "assistant",
    message: { content: [{ type: "tool_use", name, input: {} }] },
  });
const result = (n: number) =>
  JSON.stringify({
    type: "result",
    result: "ok",
    usage: { input_tokens: n, output_tokens: 0 },
  });

const stub = async (traces: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), "run-budget-"));
  for (const [path, text] of Object.entries(traces)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    await Bun.write(join(dir, path), text);
  }
  return dir;
};

test("a trace in budget has no fault", async () => {
  const dir = await stub({
    "e-1/a/trace.jsonl": `${call("Bash")}\n${result(5)}\n`,
  });
  expect(await budgetFaultsIn(dir, tags)).toEqual([]);
});

test("a trace over a bound is listed", async () => {
  const dir = await stub({
    "e-1/a/trace.jsonl": `${call("Bash")}\n${call("Edit")}\n${result(50)}\n`,
  });
  const faults = await budgetFaultsIn(dir, tags);
  expect(faults).toHaveLength(2);
  expect(faults.join()).toContain("max-tool-calls:1");
  expect(faults.join()).toContain("max-tokens:10");
});

test("--case names the case of each trace", async () => {
  const dir = await stub({ "e-1/trace.jsonl": `${call("A")}\n${call("B")}\n` });
  expect(await budgetFaultsIn(dir, tags)).toHaveLength(1);
  expect(await budgetFaultsIn(dir, tags, "a")).toHaveLength(1);
  expect((await budgetFaultsIn(dir, tags, "zzz")).join()).toContain("no case");
});

test("no trace, an unknown case, and a bad line are faults", async () => {
  expect(await budgetFaultsIn(await stub({}), tags)).toHaveLength(1);
  const bad = await stub({ "a/trace.jsonl": "not json\n" });
  expect((await budgetFaultsIn(bad, tags)).join()).toContain("no JSON");
  expect(parseTrace('{"type":"x"}\n\n')).toEqual({
    run: { events: [{ type: "x" }], files: {} },
  });
});

test("the tags of the real cases are read", async () => {
  const all = await caseTags(join(import.meta.dir, "../.."));
  expect(Object.keys(all).length).toBeGreaterThan(0);
});
