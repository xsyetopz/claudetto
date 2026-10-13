// `SpecStore.appendEvent`: two appends at once keep both lines, because each one adds to the end of the log.

import { expect, test } from "bun:test";
import { SpecStore } from "../../../../plugins/dotclaude/slices/spec/adapters/store.ts";
import { eventsText, makeStore, read } from "./helpers.ts";
import { CHANGE } from "./plan.ts";

const AT = "2026-10-12T10:00:00.000Z";

test("two appends at once keep both lines, in order", async () => {
  const root = await makeStore({
    [`${CHANGE}/events.jsonl`]: eventsText({ P01: "planned" }),
  });
  const store = new SpecStore(root);
  await Promise.all([
    store.appendEvent("c1", { at: AT, package: "P02", lane: "doing" }),
    store.appendEvent("c1", { at: AT, package: "P03", lane: "doing" }),
  ]);
  const lines = (await read(root, `${CHANGE}/events.jsonl`)).trim().split("\n");
  expect(lines).toHaveLength(4);
  expect(
    lines.slice(2).map((l) => (JSON.parse(l) as { package: string }).package),
  ).toStrictEqual(["P02", "P03"]);
});

test("an append after a torn last line removes the torn line first", async () => {
  const root = await makeStore({
    [`${CHANGE}/events.jsonl`]: `${eventsText({ P01: "planned" })}{"at":"2026`,
  });
  const store = new SpecStore(root);
  await store.appendEvent("c1", { at: AT, package: "P02", lane: "doing" });
  const lines = (await read(root, `${CHANGE}/events.jsonl`)).trim().split("\n");
  expect(lines).toHaveLength(3);
  expect(lines.map((l) => (JSON.parse(l) as { at: string }).at)).toContain(AT);
});
