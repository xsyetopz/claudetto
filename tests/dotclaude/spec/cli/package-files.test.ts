// A package file with no line in `events.jsonl` is a `planned` package for `lane`, `status`, and `validate`.

import { expect, test } from "bun:test";
import { brief, read, run } from "./helpers.ts";
import { CHANGE, makePlan } from "./plan.ts";

/** A change with `P01` done and the file `24-tiers.md` for `P24`, which `events.jsonl` does not list. */
const planWithFile = (owns: string[] = ["src/p24/"]): Promise<string> =>
  makePlan([{ id: "P01", lane: "done", owns: ["src/a/"] }], {
    [`${CHANGE}/packages/24-tiers.md`]: brief("P24", [], owns),
  });

test("lane writes the lane of a package that has a file and no lane", async () => {
  const root = await planWithFile();
  const r = await run(root, "lane", "P24", "done");
  expect(r.code).toBe(0);
  const lines = (await read(root, `${CHANGE}/events.jsonl`))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { package: string; lane: string });
  expect(lines.at(-1)).toMatchObject({ package: "P24", lane: "done" });
  expect(lines.filter((l) => l.package === "P24")).toHaveLength(1);
});

test("status counts a package that has a file and no lane as planned", async () => {
  const root = await planWithFile();
  const r = await run(root, "status", "c1");
  expect(r.out).toContain("◆ c1 1/2");
  expect(r.out).toContain("○ P24 planned");
});

test("next gives the brief of a package that has a file and no lane", async () => {
  const root = await planWithFile();
  const r = await run(root, "next", "c1");
  expect(r.out.join("\n")).toContain("id: P24");
});

test("validate treats a package that has a file and no lane as open", async () => {
  // `P24` is open and overlaps `P01` only when `P01` is open too.
  const root = await planWithFile(["src/a/"]);
  const r = await run(root, "validate", "c1");
  expect(r.code).toBe(0);
});
