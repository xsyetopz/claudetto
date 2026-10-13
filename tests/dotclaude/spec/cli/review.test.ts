// `lane --note`, `review`, `retry`, and `drop`: the reason of a move, the verdict of a review, and the terminal lane `canceled`.

import { expect, test } from "bun:test";
import { read, run } from "./helpers.ts";
import { CHANGE, makePlan } from "./plan.ts";

/** The lines of `events.jsonl` after the header. */
const eventsOf = async (root: string) =>
  (await read(root, `${CHANGE}/events.jsonl`))
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

const lastEvent = async (root: string) => (await eventsOf(root)).at(-1);

test("a move to `blocked` and a move back need `--note`, and the note goes to the event", async () => {
  const root = await makePlan([{ id: "P01", lane: "review" }]);
  const refused = await run(root, "lane", "P01", "blocked");
  expect(refused.code).toBe(1);
  expect(refused.err.join("\n")).toContain("--note");
  expect((await run(root, "lane", "P01", "doing")).code).toBe(1);

  const moved = await run(root, "lane", "P01", "doing", "--note", "fix a test");
  expect(moved.code).toBe(0);
  expect(await lastEvent(root)).toMatchObject({
    package: "P01",
    lane: "doing",
    note: "fix a test",
  });
  expect(
    (await run(root, "lane", "P01", "blocked", "--note", "waits")).code,
  ).toBe(0);
  expect((await run(root, "lane", "P01", "planned")).code).toBe(1);
  expect((await run(root, "lane", "P01", "planned", "--note=later")).code).toBe(
    0,
  );
});

test("a move forward needs no note, and `--json` prints the move as one object", async () => {
  const root = await makePlan([{ id: "P01" }]);
  const r = await run(root, "lane", "P01", "doing", "--json");
  expect(r.code).toBe(0);
  expect(JSON.parse(r.out[0] ?? "")).toStrictEqual({
    change: "c1",
    package: "P01",
    from: "planned",
    to: "doing",
  });
});

test("`lane` refuses `canceled`, an unknown flag, and a flag with no value", async () => {
  const root = await makePlan([{ id: "P01" }]);
  expect((await run(root, "lane", "P01", "canceled")).code).toBe(2);
  expect((await run(root, "lane", "P01", "doing", "--force")).code).toBe(2);
  expect((await run(root, "lane", "P01", "blocked", "--note")).code).toBe(2);
});

test("`review approve` keeps the lane `review` and adds the verdict", async () => {
  const root = await makePlan([{ id: "P01", lane: "review" }]);
  const r = await run(root, "review", "P01", "approve", "--json");
  expect(r.code).toBe(0);
  expect(JSON.parse(r.out[0] ?? "")).toMatchObject({
    from: "review",
    to: "review",
    verdict: "approve",
  });
  expect(await lastEvent(root)).toMatchObject({
    lane: "review",
    verdict: "approve",
  });
});

test("`review reject` needs a finding and moves the package to `doing` with its findings", async () => {
  const root = await makePlan([{ id: "P01", lane: "review" }]);
  expect((await run(root, "review", "P01", "reject")).code).toBe(2);
  const r = await run(
    root,
    "review",
    "P01",
    "reject",
    "--finding",
    "a.ts: no test",
    "--finding",
    "b.ts: wrong exit status",
  );
  expect(r.code).toBe(0);
  expect(await lastEvent(root)).toMatchObject({
    lane: "doing",
    verdict: "reject",
    findings: ["a.ts: no test", "b.ts: wrong exit status"],
  });
});

test("only a package in `review` gets a verdict", async () => {
  const root = await makePlan([{ id: "P01", lane: "doing" }]);
  const r = await run(root, "review", "P01", "approve");
  expect(r.code).toBe(1);
  expect(await lastEvent(root)).toMatchObject({ lane: "doing" });
  expect(await lastEvent(root)).not.toHaveProperty("verdict");
});

test("`merge` refuses a package in `review` with no `approve`, and after a reject and a new review", async () => {
  const root = await makePlan([{ id: "P01", lane: "review" }]);
  const none = await run(root, "merge", "P01", "work");
  expect(none.code).toBe(1);
  expect(none.err.join("\n")).toContain("review P01 approve");

  await run(root, "review", "P01", "approve");
  await run(root, "retry", "P01");
  await run(root, "lane", "P01", "review");
  expect((await run(root, "merge", "P01", "work")).err.join("\n")).toContain(
    "review P01 approve",
  );
});

test("`retry` moves a rejected package to `doing` and prints the findings of the reject", async () => {
  const root = await makePlan([{ id: "P01", lane: "review" }]);
  await run(root, "review", "P01", "reject", "--finding", "a.ts: no test");
  await run(root, "lane", "P01", "review");
  const r = await run(root, "retry", "P01");
  expect(r.code).toBe(0);
  expect(r.out).toContain("- a.ts: no test");
  expect(await lastEvent(root)).toMatchObject({ lane: "doing", note: "retry" });
});

test("`retry` of a blocked package prints the note of the block, and `--json` gives both", async () => {
  const root = await makePlan([{ id: "P01", lane: "doing" }]);
  await run(root, "lane", "P01", "blocked", "--note", "needs a token");
  const r = await run(root, "retry", "P01", "--json");
  expect(r.code).toBe(0);
  expect(JSON.parse(r.out[0] ?? "")).toMatchObject({
    from: "blocked",
    to: "doing",
    findings: [],
    blocked: "needs a token",
  });
});

test("`retry` refuses a package that is not in `review` or `blocked`", async () => {
  const root = await makePlan([{ id: "P01", lane: "doing" }]);
  expect((await run(root, "retry", "P01")).code).toBe(1);
  expect(await lastEvent(root)).toMatchObject({ lane: "doing" });
});

test("`drop` needs a reason, sets the terminal lane `canceled`, and leaves the package out of the total", async () => {
  const root = await makePlan([{ id: "P01" }, { id: "P02", lane: "done" }]);
  expect((await run(root, "drop", "P01")).code).toBe(2);
  const r = await run(root, "drop", "P01", "--reason", "P02 covers it");
  expect(r.code).toBe(0);
  expect(await lastEvent(root)).toMatchObject({
    lane: "canceled",
    note: "P02 covers it",
  });
  expect((await run(root, "lane", "P01", "doing")).code).toBe(1);
  expect((await run(root, "drop", "P01", "--reason", "again")).code).toBe(1);
  expect((await run(root, "status", "c1")).out[0]).toBe("◆ c1 1/1");
});

test("a command that changes a lane gives exit 2 and its usage for a missing argument", async () => {
  const root = await makePlan([{ id: "P01" }]);
  for (const args of [
    ["review", "P01"],
    ["retry"],
    ["drop"],
    ["review", "P01", "maybe"],
  ])
    expect((await run(root, ...args)).code, args.join(" ")).toBe(2);
});
