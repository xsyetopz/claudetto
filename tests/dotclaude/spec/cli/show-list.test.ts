// `show`, `deps`, `ready`, and `log`: one change or package, the wave graph, the ready set, and the events.

import { expect, test } from "bun:test";
import { makeChange, run } from "./read-fixture.ts";

const PACKAGES = [
  { id: "P1", owns: ["src/a/"], state: "done" },
  { id: "P2", deps: ["P1"], owns: ["src/b/"], state: "doing" },
  { id: "P3", deps: ["P1"], owns: ["src/b/x.ts"] },
  { id: "P4", deps: ["P1"], owns: ["src/d/"] },
  { id: "P5", deps: ["P2"], owns: ["src/f/"] },
  { id: "P6", state: "verified", owns: ["src/e/"] },
  { id: "P7", owns: ["src/e/"] },
  { id: "P8", deps: ["P1"], owns: ["src/h/"] },
  { id: "P9", state: "blocked", owns: ["src/i/"] },
  { id: "P10", deps: ["P1"], owns: ["src/d/y.ts"] },
];

const json = (out: string[]): unknown => JSON.parse(out.join(""));

test("show --json of a change gives its size, status, counts, and package states", async () => {
  const root = await makeChange(PACKAGES.slice(0, 3));
  const r = await run(root, "show", "c1", "--json");
  expect(r.code).toBe(0);
  expect(json(r.out)).toStrictEqual({
    id: "c1",
    size: "large",
    status: "implementing",
    states: { done: 1, doing: 1, planned: 1 },
    packages: [
      { id: "P1", state: "done" },
      { id: "P2", state: "doing" },
      { id: "P3", state: "planned" },
    ],
  });
});

test("show --json of a package gives its goal, deps with states, owns, verify, and events", async () => {
  const root = await makeChange(PACKAGES.slice(0, 3));
  const r = await run(root, "show", "c1", "P2", "--json");
  expect(r.code).toBe(0);
  expect(json(r.out)).toMatchObject({
    change: "c1",
    package: "P2",
    state: "doing",
    goal: "Goal of P2.",
    deps: [{ id: "P1", state: "done" }],
    owns: ["src/b/"],
    verify: "just test",
    events: [{ package: "P2", state: "doing" }],
  });
});

test("show exits 1 for a missing package or change, and 2 for wrong arguments", async () => {
  const root = await makeChange(PACKAGES.slice(0, 3));
  expect((await run(root, "show", "c1", "P99")).code).toBe(1);
  expect((await run(root, "show", "nope")).code).toBe(1);
  expect((await run(root, "show")).code).toBe(2);
  expect((await run(root, "show", "c1", "P1", "P2")).code).toBe(2);
});

test("ready prints the planned packages with done deps and no owns overlap with a busy package", async () => {
  const root = await makeChange(PACKAGES);
  const r = await run(root, "ready", "c1", "--json");
  expect(r.code).toBe(0);
  expect(json(r.out)).toStrictEqual(["P4", "P8"]);
});

test("ready does not offer two packages whose owns overlap, and gives an empty set when none is ready", async () => {
  const root = await makeChange([
    { id: "P1", state: "done" },
    { id: "P2", deps: ["P1"], owns: ["src/z/"] },
    { id: "P3", deps: ["P1"], owns: ["src/z/q.ts"] },
  ]);
  expect(json((await run(root, "ready", "c1", "--json")).out)).toStrictEqual([
    "P2",
  ]);
  const none = await makeChange([{ id: "P1", state: "doing" }]);
  const r = await run(none, "ready", "c1", "--json");
  expect(r.code).toBe(0);
  expect(json(r.out)).toStrictEqual([]);
});

test("deps --json gives the waves, blocked chains, overlaps, missing deps, and cycles", async () => {
  const root = await makeChange([
    { id: "P1", state: "blocked" },
    { id: "P2", deps: ["P1"], wave: 2, owns: ["src/a/"] },
    { id: "P3", deps: ["P9"], wave: 2, owns: ["src/a/b.ts"] },
    { id: "P4", deps: ["P5"], wave: 3 },
    { id: "P5", deps: ["P4"], wave: 3 },
  ]);
  const r = await run(root, "deps", "c1", "--json");
  expect(r.code).toBe(0);
  const graph = json(r.out) as Record<string, unknown>;
  expect(graph["waves"]).toMatchObject([
    { wave: 1, packages: [{ id: "P1", state: "blocked", deps: [] }] },
    { wave: 2, packages: [{ id: "P2" }, { id: "P3" }] },
    { wave: 3, packages: [{ id: "P4" }, { id: "P5" }] },
  ]);
  expect(graph["blocked"]).toStrictEqual([["P2", "P1"]]);
  expect(graph["overlaps"]).toStrictEqual([["P2", "P3"]]);
  expect(graph["missing"]).toStrictEqual([["P3", "P9"]]);
  expect([...(graph["cycles"] as string[])].sort()).toStrictEqual(["P4", "P5"]);
});

test("log prints one JSON event for each line, and --package keeps the events of one package", async () => {
  const root = await makeChange(PACKAGES.slice(0, 3));
  const all = await run(root, "log", "c1", "--json");
  expect(all.code).toBe(0);
  expect(all.out.map((l) => JSON.parse(l).state)).toStrictEqual([
    "implementing",
    "done",
    "doing",
  ]);
  const one = await run(root, "log", "c1", "--package", "P2", "--json");
  expect(one.out.map((l) => JSON.parse(l).package)).toStrictEqual(["P2"]);
});

test("log exits 1 when the change has no log, and 2 for a flag that it does not know", async () => {
  const root = await makeChange([], {
    files: { ".dotclaude/spec/changes/bare/change.md": "x" },
  });
  expect((await run(root, "log", "bare")).code).toBe(1);
  expect((await run(root, "log", "c1", "--nope")).code).toBe(2);
});
