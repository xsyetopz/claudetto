// `validate`: a valid plan, a failing brief, overlapping `owns`, and a bad dep.

import { expect, test } from "bun:test";
import { brief, eventsText, run } from "./helpers.ts";
import { CHANGE, makePlan } from "./plan.ts";

test("validate passes on a valid plan", async () => {
  const root = await makePlan([
    { id: "P01", owns: ["src/a/"] },
    { id: "P02", deps: ["P01"], owns: ["src/b/"] },
  ]);
  const r = await run(root, "validate", "c1");
  expect({ code: r.code, err: r.err }).toStrictEqual({ code: 0, err: [] });
});

test("validate fails on a torn last line of the log and names its file and line", async () => {
  const root = await makePlan([{ id: "P01" }], {
    [`${CHANGE}/events.jsonl`]: `${eventsText({ P01: "planned" })}{"at":"2026`,
  });
  const r = await run(root, "validate", "c1");
  expect(r.code).toBe(1);
  expect(r.err.join("\n")).toContain("events.jsonl:3");
});

test("validate fails on a brief with an empty section and names the package", async () => {
  const bad = brief("P01", [], ["src/a/"]).replace(
    /## Acceptance[\s\S]*?(?=## Boundaries)/,
    "",
  );
  const root = await makePlan([{ id: "P01" }], {
    [`${CHANGE}/packages/P01.md`]: bad,
  });
  const r = await run(root, "validate", "c1");
  expect(r.code).toBe(1);
  expect(r.err.join("\n")).toContain("P01");
  expect(r.err.join("\n")).toContain("Acceptance");
});

test("validate fails on overlapping owns of two open packages in one wave", async () => {
  const root = await makePlan([
    { id: "P01", owns: ["src/a/"] },
    { id: "P02", owns: ["src/a/b.ts"] },
  ]);
  const r = await run(root, "validate", "c1");
  expect(r.code).toBe(1);
  expect(r.err.join("\n")).toContain("wave.owns-overlap");
});

test("validate allows overlapping owns in different waves and with a done package", async () => {
  const waves = await makePlan([
    { id: "P01", owns: ["src/a/"], wave: 1 },
    { id: "P02", owns: ["src/a/"], wave: 2, deps: ["P01"] },
  ]);
  expect((await run(waves, "validate", "c1")).code).toBe(0);
  const done = await makePlan([
    { id: "P01", owns: ["src/a/"], lane: "done" },
    { id: "P02", owns: ["src/a/"] },
  ]);
  expect((await run(done, "validate", "c1")).code).toBe(0);
});

test("validate fails on a dep that does not exist and on a dep cycle", async () => {
  const missing = await makePlan([{ id: "P01", deps: ["P09"] }]);
  const a = await run(missing, "validate", "c1");
  expect(a.code).toBe(1);
  expect(a.err.join("\n")).toContain("plan.dep-missing");
  const cycle = await makePlan([
    { id: "P01", deps: ["P02"], owns: ["src/a/"] },
    { id: "P02", deps: ["P01"], owns: ["src/b/"] },
  ]);
  const b = await run(cycle, "validate", "c1");
  expect(b.code).toBe(1);
  expect(b.err.join("\n")).toContain("plan.dep-cycle");
});

test("validate fails on a checkbox that does not agree with the lane", async () => {
  const unchecked = await makePlan([
    { id: "P01", lane: "done", checked: false },
  ]);
  const a = await run(unchecked, "validate", "c1");
  expect(a.code).toBe(1);
  expect(a.err.join("\n")).toContain("plan.checkbox-lane");
  const checked = await makePlan([{ id: "P01", lane: "doing", checked: true }]);
  expect((await run(checked, "validate", "c1")).code).toBe(1);
  const agree = await makePlan([
    { id: "P01", lane: "done", owns: ["src/a/"] },
    { id: "P02", lane: "review", owns: ["src/b/"] },
  ]);
  expect((await run(agree, "validate", "c1")).code).toBe(0);
});

test("validate fails on an event whose package has no brief", async () => {
  const root = await makePlan([{ id: "P01", owns: ["src/a/"] }], {
    [`${CHANGE}/events.jsonl`]: eventsText({ P01: "planned", P09: "planned" }),
  });
  const r = await run(root, "validate", "c1");
  expect(r.code).toBe(1);
  expect(r.err.join("\n")).toContain("plan.event-no-package");
});

test("validate stops on a change that does not exist", async () => {
  const root = await makePlan([{ id: "P01" }]);
  expect((await run(root, "validate", "nope")).code).toBe(1);
});
