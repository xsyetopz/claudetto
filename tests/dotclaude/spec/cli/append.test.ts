// `SpecStore.appendEvent`: two appends at once keep both lines, and a torn last line does not join the new line.

import { expect, test } from "bun:test";
import path from "node:path";
import { SpecStore } from "../../../../src/plugins/dotclaude/slices/spec/adapters/store.ts";
import { CHANGES, makeStore } from "./read-fixture.ts";

const AT = "2026-10-12T10:00:00.000Z";
const LOG = `${CHANGES}/c1/events.jsonl`;
const HEADER = `${JSON.stringify({ schema: 2 })}\n${JSON.stringify({ at: AT, state: "implementing" })}\n`;

const linesOf = async (root: string): Promise<Record<string, unknown>[]> =>
  (await Bun.file(path.join(root, LOG)).text())
    .split("\n")
    .filter((l) => l !== "")
    .map((l) => JSON.parse(l));

test("two appends at once keep both lines, in order", async () => {
  const root = await makeStore({ [LOG]: HEADER });
  const store = new SpecStore(root);
  await Promise.all([
    store.appendEvent("c1", { at: AT, package: "P2", state: "doing" }),
    store.appendEvent("c1", { at: AT, package: "P3", state: "doing" }),
  ]);
  const lines = await linesOf(root);
  expect(lines).toHaveLength(4);
  expect(lines.slice(2).map((l) => l["package"])).toEqual(["P2", "P3"]);
});

test("an append after a torn last line removes the torn line first", async () => {
  const root = await makeStore({ [LOG]: `${HEADER}{"at":"2026` });
  await new SpecStore(root).appendEvent("c1", {
    at: AT,
    package: "P2",
    state: "doing",
  });
  const lines = await linesOf(root);
  expect(lines).toHaveLength(3);
  expect(lines.at(-1)).toMatchObject({ package: "P2", state: "doing" });
});

test("an append after a last line with no line end starts a new line and keeps the old one", async () => {
  const root = await makeStore({ [LOG]: HEADER.trimEnd() });
  await new SpecStore(root).appendEvent("c1", {
    at: AT,
    package: "P2",
    state: "doing",
  });
  const lines = await linesOf(root);
  expect(lines).toHaveLength(3);
  expect(lines[1]).toMatchObject({ state: "implementing" });
});
