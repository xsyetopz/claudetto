// `lane`: the move of a package, the event, the refusal in a linked git worktree, and the stop on an unknown `schema`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { eventsText, makeStore, read, run, TODAY } from "./helpers.ts";
import { CHANGE, makePlan } from "./plan.ts";

const git = (cwd: string, ...args: string[]): void => {
  const r = Bun.spawnSync(["git", ...args], { cwd });
  if (r.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
  }
};

type Line = { at: string; package: string; lane: string };

/** The lines of `events.jsonl` after the header, and the last lane of each package. */
const stateOf = async (root: string) => {
  const [, ...lines] = (await read(root, `${CHANGE}/events.jsonl`))
    .trim()
    .split("\n");
  const events = lines.map((line) => JSON.parse(line) as Line);
  return {
    lanes: Object.fromEntries(events.map((e) => [e.package, e.lane])),
    events,
  };
};

test("lane moves a package and adds an event with the time", async () => {
  const root = await makePlan([{ id: "P01" }, { id: "P02" }]);
  const r = await run(root, "lane", "P01", "doing");
  expect(r.code).toBe(0);
  const state = await stateOf(root);
  expect(state.lanes).toStrictEqual({ P01: "doing", P02: "planned" });
  expect(state.events.slice(2)).toStrictEqual([
    { at: `${TODAY}T10:00:00.000Z`, package: "P01", lane: "doing" },
  ]);
  await run(root, "lane", "P01", "done");
  expect(
    (await stateOf(root)).events.slice(2).map((e) => e.lane),
  ).toStrictEqual(["doing", "done"]);
});

test("lane stops on a bad lane, a missing argument, and an unknown package", async () => {
  const root = await makePlan([{ id: "P01" }]);
  const before = await read(root, `${CHANGE}/events.jsonl`);
  expect((await run(root, "lane", "P01", "finished")).code).toBe(2);
  expect((await run(root, "lane", "P01")).code).toBe(2);
  expect((await run(root, "lane", "P09", "done")).code).toBe(1);
  expect(await read(root, `${CHANGE}/events.jsonl`)).toBe(before);
});

test("lane stops when two changes have the package", async () => {
  const root = await makePlan([{ id: "P01" }]);
  const other = await makePlan([{ id: "P01" }]);
  fs.cpSync(
    path.join(other, CHANGE),
    path.join(root, ".dotclaude/spec/changes/c2"),
    {
      recursive: true,
    },
  );
  const r = await run(root, "lane", "P01", "doing");
  expect(r.code).toBe(1);
  expect((await stateOf(root)).lanes["P01"]).toBe("planned");
});

test("lane stops on a log with a schema that it does not know", async () => {
  const root = await makeStore({
    [`${CHANGE}/events.jsonl`]: eventsText({ P01: "planned" }, 2),
  });
  const before = await read(root, `${CHANGE}/events.jsonl`);
  const r = await run(root, "lane", "P01", "doing");
  expect(r.code).toBe(1);
  expect(r.err.length).toBeGreaterThan(0);
  expect(await read(root, `${CHANGE}/events.jsonl`)).toBe(before);
  expect((await run(root, "status", "c1")).code).toBe(1);
});

test("lane works in the main checkout and is refused in a linked worktree", async () => {
  const main = await makePlan([{ id: "P01" }]);
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
    const before = await read(linked, `${CHANGE}/events.jsonl`);
    const r = await run(linked, "lane", "P01", "done");
    expect(r.code).toBe(1);
    expect(await read(linked, `${CHANGE}/events.jsonl`)).toBe(before);
    expect((await stateOf(main)).lanes["P01"]).toBe("doing");
  } finally {
    fs.rmSync(linked, { recursive: true, force: true });
  }
});
