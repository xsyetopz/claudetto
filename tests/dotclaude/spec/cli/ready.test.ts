// `ready`: the packages that are `planned`, with each dep `done`, and with `owns` that no `doing` or `review` package overlaps.

import { expect, test } from "bun:test";
import { run } from "./helpers.ts";
import { makePlan } from "./plan.ts";

test("ready prints the planned packages with done deps and no owns overlap with a busy package", async () => {
  const root = await makePlan([
    { id: "P01", lane: "done", owns: ["src/a/"] },
    { id: "P02", lane: "doing", owns: ["src/b/"] },
    { id: "P03", deps: ["P01"], owns: ["src/b/x.ts"] },
    { id: "P04", deps: ["P01"], owns: ["src/d/"] },
    { id: "P05", deps: ["P02"], owns: ["src/f/"] },
    { id: "P06", lane: "review", owns: ["src/e/"] },
    { id: "P07", owns: ["src/e/"] },
    { id: "P08", deps: ["P01"], owns: ["src/h/"] },
    { id: "P09", lane: "blocked", owns: ["src/i/"] },
    { id: "P10", lane: "done", owns: ["src/j/"] },
  ]);
  const r = await run(root, "ready", "c1");
  expect(r.code).toBe(0);
  expect(r.out).toStrictEqual(["P04", "P08"]);
});

test("ready does not count a done package as busy, and prints no id when none is ready", async () => {
  const root = await makePlan([
    { id: "P01", lane: "done", owns: ["src/a/"] },
    { id: "P02", owns: ["src/a/"], deps: ["P01"] },
  ]);
  expect((await run(root, "ready", "c1")).out).toStrictEqual(["P02"]);
  const none = await makePlan([
    { id: "P01", lane: "doing" },
    { id: "P02", deps: ["P01"] },
  ]);
  const r = await run(none, "ready", "c1");
  expect(r.code).toBe(0);
  expect(r.out.filter((l) => /^P\d+$/.test(l))).toStrictEqual([]);
});

test("ready stops on a change that does not exist", async () => {
  const root = await makePlan([{ id: "P01" }]);
  expect((await run(root, "ready", "nope")).code).toBe(1);
});

test("ready prints only the first of two planned packages whose owns overlap", async () => {
  const root = await makePlan([
    { id: "P01", owns: ["src/a/"] },
    { id: "P02", owns: ["src/a/x.ts"] },
    { id: "P03", owns: ["src/c/"] },
  ]);
  expect((await run(root, "ready", "c1")).out).toStrictEqual(["P01", "P03"]);
});
