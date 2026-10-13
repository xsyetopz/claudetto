// `status`, `next`, and `list`: the states of the packages, the next brief, and the changes of the store.

import { expect, test } from "bun:test";
import {
  CHANGES,
  changeText,
  logText,
  makeChange,
  run,
} from "./read-fixture.ts";

const PACKAGES = [
  { id: "P1", state: "done" },
  { id: "P2", deps: ["P1"], state: "doing" },
  { id: "P3", deps: ["P1"], wave: 2 },
  { id: "P4", deps: ["P2"], wave: 3, state: "canceled" },
];

test("status --json counts the packages by state and leaves out canceled ones from the total", async () => {
  const root = await makeChange(PACKAGES);
  const r = await run(root, "status", "c1", "--json");
  expect(r.code).toBe(0);
  expect(JSON.parse(r.out.join(""))).toMatchObject({
    id: "c1",
    status: "implementing",
    done: 1,
    total: 3,
    states: { done: 1, doing: 1, planned: 1, canceled: 1 },
    packages: [
      { id: "P1", state: "done" },
      { id: "P2", state: "doing" },
      { id: "P4", state: "canceled" },
      { id: "P3", state: "planned" },
    ],
  });
});

test("status with no id reads the active change, and exits 1 for a missing change", async () => {
  const root = await makeChange(PACKAGES);
  const active = await run(root, "status", "--json");
  expect(active.code).toBe(0);
  expect(JSON.parse(active.out.join("")).id).toBe("c1");
  const missing = await run(root, "status", "nope");
  expect(missing.code).toBe(1);
  expect(missing.out).toStrictEqual([]);
});

test("status exits 2 for a flag that it does not know", async () => {
  const root = await makeChange(PACKAGES);
  expect((await run(root, "status", "c1", "--nope")).code).toBe(2);
});

test("next prints the brief of the first package with done deps, in the order of wave", async () => {
  const root = await makeChange([
    { id: "P1", state: "done" },
    { id: "P3", deps: ["P1"], wave: 2 },
    { id: "P2", deps: ["P9"], wave: 1 },
  ]);
  const r = await run(root, "next", "c1");
  expect(r.code).toBe(0);
  expect(r.out.join("\n")).toContain("id: P3");
});

test("next exits 0 and prints no brief when no package is ready", async () => {
  const root = await makeChange([{ id: "P1", state: "done" }]);
  const r = await run(root, "next", "c1");
  expect(r.code).toBe(0);
  expect(r.out.join("\n")).not.toContain("kind: package");
});

test("list --json gives the open and the archived changes with their size, status, and counts", async () => {
  const root = await makeChange(PACKAGES, {
    files: {
      [`${CHANGES}/archive/2026-01-01-old/change.md`]: changeText(
        "old",
        "archived",
        "trivial",
      ),
      [`${CHANGES}/archive/2026-01-01-old/events.jsonl`]: logText(
        "archived",
        [],
      ),
    },
  });
  const r = await run(root, "list", "--json");
  expect(r.code).toBe(0);
  expect(JSON.parse(r.out.join(""))).toStrictEqual([
    {
      id: "c1",
      archived: false,
      size: "large",
      status: "implementing",
      states: { done: 1, doing: 1, planned: 1, canceled: 1 },
    },
    {
      id: "2026-01-01-old",
      archived: true,
      size: "trivial",
      status: "archived",
      states: {},
    },
  ]);
});

test("list reports a change whose log it cannot read, and still exits 0", async () => {
  const root = await makeChange(PACKAGES, {
    files: { [`${CHANGES}/old/events.jsonl`]: '{"schema":1}\n' },
  });
  const r = await run(root, "list", "--json");
  expect(r.code).toBe(0);
  const old = JSON.parse(r.out.join("")).find(
    (c: { id: string }) => c.id === "old",
  );
  expect(old.problem).toBeString();
  expect(old.states).toStrictEqual({});
});
