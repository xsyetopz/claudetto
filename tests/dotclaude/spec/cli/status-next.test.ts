// `status` and `next`: the counts, the lanes, and the choice of the next package.

import { expect, test } from "bun:test";
import { makeStore, run } from "./helpers.ts";
import { makePlan } from "./plan.ts";

test("status prints the done count and the lane of each package", async () => {
  const root = await makePlan([
    { id: "P01", lane: "done" },
    { id: "P02", lane: "doing" },
    { id: "P03", lane: "planned" },
  ]);
  const r = await run(root, "status", "c1");
  expect(r.code).toBe(0);
  expect(r.out[0]).toBe("◆ c1 1/3");
  expect(r.out).toContain("✓ P01 done");
  expect(r.out).toContain("● P02 doing");
  expect(r.out).toContain("○ P03 planned");
});

test("status with no id uses the active change", async () => {
  const root = await makePlan([{ id: "P01", lane: "doing" }]);
  const r = await run(root, "status");
  expect(r.code).toBe(0);
  expect(r.out[0]).toBe("◆ c1 0/1");
});

test("status stops on a missing change and on a change with no state", async () => {
  const root = await makePlan([{ id: "P01" }]);
  expect((await run(root, "status", "nope")).code).toBe(1);
  const bare = await makeStore({
    ".dotclaude/spec/changes/c2/change.md": "# c2\n",
  });
  const r = await run(bare, "status", "c2");
  expect(r.code).toBe(1);
  expect(r.out).toStrictEqual([]);
});

test("next prints the brief of the first ready package in list order", async () => {
  const root = await makePlan([
    { id: "P01", lane: "done" },
    { id: "P03", deps: ["P01"] },
    { id: "P02", deps: ["P01"] },
  ]);
  const r = await run(root, "next", "c1");
  expect(r.code).toBe(0);
  expect(r.out.join("\n")).toContain("id: P03");
  expect(r.out.join("\n")).not.toContain("id: P02");
});

test("next skips a package with an open dep, with no brief, or in review", async () => {
  const root = await makePlan([
    { id: "P01", lane: "doing" },
    { id: "P02", deps: ["P01"] },
    { id: "P03", brief: false },
    { id: "P04", lane: "review" },
  ]);
  const r = await run(root, "next", "c1");
  expect(r.out.join("\n")).toContain("id: P01");
  const only = await makePlan([
    { id: "P03", brief: false },
    { id: "P04", lane: "review" },
    { id: "P05", deps: ["P04"] },
  ]);
  const none = await run(only, "next", "c1");
  expect(none.code).toBe(0);
  expect(none.out).toHaveLength(1);
  expect(none.out[0]).not.toContain("id:");
});
