// The sweep on a real disk, in temp folders that the test makes.
// The record, the sessions folder, the temp root, and the folder of "the user" are all under one folder of the test.
// No test points the sweep at a real folder of the user.

import { beforeEach, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { sweep } from "../../../plugins/claudetto/slices/gc/adapters/cli.ts";
import type { GcRecord } from "../../../plugins/claudetto/slices/gc/domain/record.ts";
import { tmpDir } from "../../support/repo.ts";

const DAY = 86_400_000;
const NOW = Date.now();

let base: string;
let temp: string;
let outside: string;

beforeEach(() => {
  base = fs.realpathSync(tmpDir("gc-sweep"));
  temp = path.join(base, "tmp");
  outside = path.join(base, "user");
  fs.mkdirSync(temp);
  fs.mkdirSync(outside);
  fs.mkdirSync(path.join(base, "sessions"));
  fs.mkdirSync(path.join(base, "gc"));
});

/** Makes a folder with one file of `bytes` bytes in `dir`. */
const folder = async (
  dir: string,
  name: string,
  bytes = 10,
): Promise<string> => {
  const p = path.join(dir, name);
  fs.mkdirSync(p, { recursive: true });
  await Bun.write(path.join(p, "f"), "x".repeat(bytes));
  return p;
};

const record = (p: string, over: Partial<GcRecord> = {}): GcRecord => ({
  path: p,
  kind: "temp",
  session: "dead",
  cwd: base,
  time: NOW - 8 * DAY,
  ...over,
});

const write = (records: GcRecord[], name = "dead") =>
  Bun.write(path.join(base, "gc", `${name}.json`), JSON.stringify(records));

const run = (over: Partial<Parameters<typeof sweep>[0]> = {}) =>
  sweep({
    gcDir: path.join(base, "gc"),
    sessionsDir: path.join(base, "sessions"),
    temps: [temp],
    now: NOW,
    ageMaxMs: 7 * DAY,
    sizeMaxBytes: 5 * 1024 ** 3,
    dryRun: false,
    isAlive: (pid) => pid === process.pid,
    ...over,
  });

const session = (id: string, cwd = base, pid = process.pid) =>
  Bun.write(
    path.join(base, "sessions", `${pid}.json`),
    JSON.stringify({ pid, sessionId: id, cwd }),
  );

test("an old recorded folder in a live root goes, and the record goes with it", async () => {
  const old = await folder(temp, "old");
  await write([record(old)]);
  const out = await run();
  expect(fs.existsSync(old)).toBe(false);
  expect(out.plan.removed).toBe(1);
  expect(out.text).toContain("Removed 1 path");
  expect(fs.existsSync(path.join(base, "gc", "dead.json"))).toBe(false);
});

test("a young folder stays, and so does its record", async () => {
  const young = await folder(temp, "young");
  await write([record(young, { time: NOW - DAY })]);
  await run();
  expect(fs.existsSync(young)).toBe(true);
  expect(fs.existsSync(path.join(base, "gc", "dead.json"))).toBe(true);
});

test("a folder of a live session stays, and a folder of the ending session goes", async () => {
  const mine = await folder(temp, "mine");
  await write([record(mine, { session: "live" })], "live");
  await session("live");
  await run();
  expect(fs.existsSync(mine)).toBe(true);
  await run({ ending: "live" });
  expect(fs.existsSync(mine)).toBe(false);
});

test("a folder that holds the folder of a live session stays", async () => {
  const dir = await folder(temp, "wt");
  await write([record(dir)]);
  await session("other", dir);
  await run();
  expect(fs.existsSync(dir)).toBe(true);
});

test("a path outside each root stays, and the report names it", async () => {
  const mine = await folder(outside, "docs");
  await write([record(mine)]);
  const out = await run();
  expect(fs.existsSync(mine)).toBe(true);
  expect(out.text).toContain(`skip`);
  expect(out.text).toContain("outside each allowed root");
});

test("a symlink in the root is not followed, and its target stays", async () => {
  const target = await folder(outside, "secret");
  const link = path.join(temp, "link");
  fs.symlinkSync(target, link);
  await write([record(link)]);
  const out = await run();
  expect(fs.existsSync(path.join(target, "f"))).toBe(true);
  expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
  expect(out.text).toContain("symlink");
});

test("a path behind a symlinked folder stays", async () => {
  const target = await folder(outside, "secret");
  const link = path.join(temp, "dirlink");
  fs.symlinkSync(outside, link);
  await write([record(path.join(link, "secret"))]);
  await run();
  expect(fs.existsSync(path.join(target, "f"))).toBe(true);
});

test("over the size bound, the oldest folder goes", async () => {
  const a = await folder(temp, "a", 100);
  const b = await folder(temp, "b", 100);
  await write([
    record(a, { time: NOW - 3 * DAY }),
    record(b, { time: NOW - 2 * DAY }),
  ]);
  await run({ sizeMaxBytes: 150 });
  expect(fs.existsSync(a)).toBe(false);
  expect(fs.existsSync(b)).toBe(true);
});

test("a dry run lists the paths and the total, and removes nothing", async () => {
  const old = await folder(temp, "old", 2048);
  await write([record(old)]);
  const before = await Bun.file(path.join(base, "gc", "dead.json")).text();
  const out = await run({ dryRun: true });
  expect(fs.existsSync(old)).toBe(true);
  expect(await Bun.file(path.join(base, "gc", "dead.json")).text()).toBe(
    before,
  );
  expect(out.text).toContain(`would remove 2.0 KiB ${old}`);
  expect(out.text).toContain("Dry run: 1 path would go");
});
