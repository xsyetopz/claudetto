// `lane`: the move of a package, the event, the refusal in a linked git worktree, and the stop on an unknown `schema`.

import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { makeStore, read, run, TODAY } from "./helpers.ts";
import { CHANGE, makePlan } from "./plan.ts";

const git = (cwd: string, ...args: string[]): void => {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
};

const stateOf = (root: string) =>
  JSON.parse(read(root, `${CHANGE}/state.json`)) as {
    lanes: Record<string, string>;
    events: { at: string; package: string; lane: string }[];
  };

test("lane moves a package and adds an event with the time", async () => {
  const root = makePlan([{ id: "P01" }, { id: "P02" }]);
  const r = await run(root, "lane", "P01", "doing");
  expect(r.code).toBe(0);
  const state = stateOf(root);
  expect(state.lanes).toStrictEqual({ P01: "doing", P02: "planned" });
  expect(state.events).toStrictEqual([
    { at: `${TODAY}T10:00:00.000Z`, package: "P01", lane: "doing" },
  ]);
  await run(root, "lane", "P01", "done");
  expect(stateOf(root).events.map((e) => e.lane)).toStrictEqual([
    "doing",
    "done",
  ]);
});

test("lane stops on a bad lane, a missing argument, and an unknown package", async () => {
  const root = makePlan([{ id: "P01" }]);
  const before = read(root, `${CHANGE}/state.json`);
  expect((await run(root, "lane", "P01", "finished")).code).toBe(2);
  expect((await run(root, "lane", "P01")).code).toBe(2);
  expect((await run(root, "lane", "P09", "done")).code).toBe(1);
  expect(read(root, `${CHANGE}/state.json`)).toBe(before);
});

test("lane stops when two changes have the package", async () => {
  const root = makePlan([{ id: "P01" }]);
  const other = makePlan([{ id: "P01" }]);
  fs.cpSync(path.join(other, CHANGE), path.join(root, "spec/changes/c2"), {
    recursive: true,
  });
  const r = await run(root, "lane", "P01", "doing");
  expect(r.code).toBe(1);
  expect(stateOf(root).lanes.P01).toBe("planned");
});

test("lane stops on a state with a schema that it does not know", async () => {
  const root = makeStore({
    [`${CHANGE}/state.json`]: JSON.stringify({
      schema: 2,
      lanes: { P01: "planned" },
      events: [],
      handoff: null,
    }),
  });
  const before = read(root, `${CHANGE}/state.json`);
  const r = await run(root, "lane", "P01", "doing");
  expect(r.code).toBe(1);
  expect(r.err.length).toBeGreaterThan(0);
  expect(read(root, `${CHANGE}/state.json`)).toBe(before);
  expect((await run(root, "status", "c1")).code).toBe(1);
});

test("lane works in the main checkout and is refused in a linked worktree", async () => {
  const main = makePlan([{ id: "P01" }]);
  git(main, "init", "-q", "-b", "main");
  git(main, "add", "-A");
  git(
    main,
    "-c",
    "user.name=t",
    "-c",
    "user.email=t@t",
    "commit",
    "-q",
    "-m",
    "init",
  );
  expect((await run(main, "lane", "P01", "doing")).code).toBe(0);

  const linked = `${main}-linked`;
  git(main, "worktree", "add", "-q", "-b", "side", linked);
  try {
    const before = read(linked, `${CHANGE}/state.json`);
    const r = await run(linked, "lane", "P01", "done");
    expect(r.code).toBe(1);
    expect(read(linked, `${CHANGE}/state.json`)).toBe(before);
    expect(stateOf(main).lanes.P01).toBe("doing");
  } finally {
    fs.rmSync(linked, { recursive: true, force: true });
  }
});
