// `new` and `record`: the files that they write, and the input that they refuse.

import { expect, test } from "bun:test";
import { has, makeStore, read, run, TODAY } from "./helpers.ts";

test("new trivial writes only change.md with a task", async () => {
  const root = makeStore();
  const r = await run(root, "new", "fix-typo", "--size", "trivial");
  expect(r.code).toBe(0);
  expect(read(root, "spec/changes/fix-typo/change.md")).toContain("# fix-typo");
  expect(has(root, "spec/changes/fix-typo/specs")).toBe(false);
  expect(has(root, "spec/changes/fix-typo/state.json")).toBe(false);
});

test("new medium is the default and writes a delta file", async () => {
  const root = makeStore();
  expect((await run(root, "new", "add-x")).code).toBe(0);
  expect(has(root, "spec/changes/add-x/change.md")).toBe(true);
  expect(has(root, "spec/changes/add-x/specs/capability.md")).toBe(true);
  expect(has(root, "spec/changes/add-x/design.md")).toBe(false);
});

test("new large writes design, packages, and a state with one planned package", async () => {
  const root = makeStore();
  expect((await run(root, "new", "big", "--size", "large")).code).toBe(0);
  for (const f of ["design.md", "packages.md", "packages/01-first.md"]) {
    expect(has(root, `spec/changes/big/${f}`)).toBe(true);
  }
  const state = JSON.parse(read(root, "spec/changes/big/state.json"));
  expect(state).toStrictEqual({
    schema: 1,
    lanes: { P01: "planned" },
    events: [],
    handoff: null,
  });
});

test("a new change of each size passes validate", async () => {
  for (const size of ["trivial", "medium", "large"]) {
    const root = makeStore();
    await run(root, "new", "c1", "--size", size);
    const r = await run(root, "validate", "c1");
    expect({ size, err: r.err, code: r.code }).toStrictEqual({
      size,
      err: [],
      code: 0,
    });
  }
});

test("new stops on an existing change, a bad size, a bad id, and a missing id", async () => {
  const root = makeStore();
  await run(root, "new", "c1");
  expect((await run(root, "new", "c1")).code).toBe(1);
  expect((await run(root, "new", "c2", "--size", "huge")).code).toBe(2);
  expect((await run(root, "new", "c2", "--size")).code).toBe(2);
  expect((await run(root, "new", "../x")).code).toBe(2);
  expect((await run(root, "new", "archive")).code).toBe(2);
  expect((await run(root, "new")).code).toBe(2);
  expect(has(root, "spec/changes/c2")).toBe(false);
});

test("record writes a dated file and keeps a second record of the same text", async () => {
  const root = makeStore();
  const first = await run(root, "record", "Fix the $& crash");
  const second = await run(root, "record", "Fix the $& crash");
  expect(first.code).toBe(0);
  expect(first.out).toStrictEqual([`spec/hotfixes/${TODAY}-fix-the-crash.md`]);
  expect(second.out).toStrictEqual([
    `spec/hotfixes/${TODAY}-fix-the-crash-2.md`,
  ]);
  expect(read(root, first.out[0] ?? "")).toContain(
    "# Hotfix: Fix the $& crash",
  );
});

test("record stops with no text", async () => {
  const root = makeStore();
  expect((await run(root, "record")).code).toBe(2);
  expect(has(root, "spec/hotfixes")).toBe(false);
});

test("an unknown command stops with the usage", async () => {
  const r = await run(makeStore(), "toString");
  expect(r.code).toBe(2);
  expect(r.err).toHaveLength(1);
});
