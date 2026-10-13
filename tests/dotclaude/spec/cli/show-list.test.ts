// `show`, `list`, `deps`, and `log`: the read commands of a change and of one package.

import { expect, test } from "bun:test";
import { run } from "./helpers.ts";
import { makePlan } from "./plan.ts";

const ARCHIVED = ".dotclaude/spec/changes/archive/2026-01-01-old";

test("`show <id> <package>` prints the lane, the goal, the deps with their lanes, the owns, and the events", async () => {
  const root = await makePlan([
    { id: "P01", lane: "done" },
    { id: "P02", deps: ["P01"], owns: ["src/b/"] },
  ]);
  await run(root, "lane", "P02", "doing");
  const r = await run(root, "show", "c1", "P02");
  expect(r.code).toBe(0);
  expect(r.out.slice(0, 5)).toStrictEqual([
    "P02  doing  (c1)",
    "Goal of P02.",
    "Deps: P01 done",
    "Owns: src/b/",
    "Verify: just test",
  ]);
  expect(r.out.slice(5).map((l) => l.split("  ").slice(1))).toStrictEqual([
    ["P02", "planned"],
    ["P02", "doing"],
  ]);
});

test("`show --json` gives the package as one object, with at most 5 events", async () => {
  const root = await makePlan([{ id: "P01", lane: "doing" }]);
  for (let i = 0; i < 3; i++) {
    await run(root, "lane", "P01", "blocked", "--note", `b${i}`);
    await run(root, "lane", "P01", "doing");
  }
  const shown = JSON.parse(
    (await run(root, "show", "c1", "P01", "--json")).out[0] ?? "",
  );
  expect(shown).toMatchObject({ change: "c1", package: "P01", lane: "doing" });
  expect(shown.events).toHaveLength(5);
  expect(shown.events.at(-1)).toMatchObject({ lane: "doing" });
});

test("`show <id>` prints the size and the lane of each package, and refuses an unknown package", async () => {
  const root = await makePlan([{ id: "P01", lane: "done" }, { id: "P02" }]);
  const r = await run(root, "show", "c1");
  expect(r.out).toStrictEqual(["◆ c1  large", "P01  done", "P02  planned"]);
  expect((await run(root, "show", "c1", "P09")).code).toBe(1);
  expect((await run(root, "show")).code).toBe(2);
});

test("`list` prints the open and the archived changes with the size and the lane counts", async () => {
  const root = await makePlan([{ id: "P01", lane: "done" }, { id: "P02" }], {
    ".dotclaude/spec/changes/m1/change.md": "# m1\n",
    ".dotclaude/spec/changes/m1/specs/a.md": "# a\n",
    [`${ARCHIVED}/change.md`]: "# old\n",
  });
  const r = await run(root, "list");
  expect(r.out).toStrictEqual([
    "open  c1  large  ○ 1  ✓ 1",
    "open  m1  medium  -",
    "archived  2026-01-01-old  trivial  -",
  ]);
  const rows = JSON.parse((await run(root, "list", "--json")).out[0] ?? "");
  expect(rows[0]).toStrictEqual({
    id: "c1",
    archived: false,
    size: "large",
    lanes: { done: 1, planned: 1 },
  });
});

test("`deps` prints the waves, a chain that a blocked dep stops, and an `owns` overlap in one wave", async () => {
  const root = await makePlan([
    { id: "P01", lane: "blocked", owns: ["src/a/"] },
    { id: "P02", deps: ["P01"], owns: ["src/a/x.ts"] },
    { id: "P03", deps: ["P02"], wave: 2, owns: ["src/c/"] },
  ]);
  const r = await run(root, "deps", "c1");
  expect(r.out).toStrictEqual([
    "Wave 1",
    "  ✗ P01",
    "  ○ P02 <- P01",
    "Wave 2",
    "  ○ P03 <- P02",
    "Blocked: P02 -> P01 (blocked)",
    "Blocked: P03 -> P02 -> P01 (blocked)",
    "Overlap: P01 and P02 own the same paths in one wave.",
  ]);
  const graph = JSON.parse(
    (await run(root, "deps", "c1", "--json")).out[0] ?? "",
  );
  expect(graph.blocked).toStrictEqual([
    ["P02", "P01"],
    ["P03", "P02", "P01"],
  ]);
  expect(graph.overlaps).toStrictEqual([["P01", "P02"]]);
});

test("`deps` shows a canceled dep as a stop, and a done or canceled package has no overlap", async () => {
  const root = await makePlan([
    { id: "P01", lane: "canceled", owns: ["src/a/"] },
    { id: "P02", deps: ["P01"], owns: ["src/a/"] },
  ]);
  const graph = JSON.parse(
    (await run(root, "deps", "c1", "--json")).out[0] ?? "",
  );
  expect(graph.blocked).toStrictEqual([["P02", "P01"]]);
  expect(graph.overlaps).toStrictEqual([]);
});

test("`log` prints each event as one line, and `--package` keeps the events of one package", async () => {
  const root = await makePlan([{ id: "P01" }, { id: "P02" }]);
  await run(root, "lane", "P01", "doing");
  await run(root, "lane", "P01", "blocked", "--note", "waits");
  const all = await run(root, "log", "c1");
  expect(all.out).toHaveLength(4);
  const one = await run(root, "log", "c1", "--package", "P01");
  expect(one.out.map((l) => l.split("  ").slice(1))).toStrictEqual([
    ["P01", "planned"],
    ["P01", "doing"],
    ["P01", "blocked", "note: waits"],
  ]);
  const json = await run(root, "log", "c1", "--package", "P01", "--json");
  expect(JSON.parse(json.out.at(-1) ?? "")).toMatchObject({
    lane: "blocked",
    note: "waits",
  });
});

test("`log` of a change with no `events.jsonl` gives exit 1", async () => {
  const root = await makePlan([{ id: "P01" }], {
    ".dotclaude/spec/changes/m1/change.md": "# m1\n",
  });
  expect((await run(root, "log", "m1")).code).toBe(1);
});
