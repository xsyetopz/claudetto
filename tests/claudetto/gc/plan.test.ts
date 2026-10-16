// The plan of a sweep is a pure function: the tests give entries and read the verdicts.

import { expect, test } from "bun:test";
import {
  type Entry,
  planSweep,
  sizeText,
} from "../../../plugins/claudetto/slices/gc/domain/plan.ts";

const DAY = 86_400_000;
const NOW = 100 * DAY;
const BOUNDS = { now: NOW, ageMaxMs: 7 * DAY, sizeMaxBytes: 1000 };

const entry = (
  path: string,
  over: Partial<Entry> & { age?: number } = {},
): Entry => {
  const { age = DAY, ...rest } = over;
  return {
    record: { path, kind: "temp", session: "s", cwd: "/p", time: NOW - age },
    real: path,
    isLink: false,
    size: 10,
    roots: ["/tmp"],
    held: false,
    ...rest,
  };
};

const actions = (entries: Entry[], bounds = BOUNDS) =>
  Object.fromEntries(
    planSweep(entries, bounds).verdicts.map((v) => [v.record.path, v.action]),
  );

test("an output older than the age bound goes, and a young one stays", () => {
  expect(
    actions([entry("/tmp/old", { age: 8 * DAY }), entry("/tmp/new")]),
  ).toEqual({ "/tmp/old": "remove", "/tmp/new": "keep" });
});

test("a live output stays even when it is old", () => {
  expect(actions([entry("/tmp/live", { age: 30 * DAY, held: true })])).toEqual({
    "/tmp/live": "keep",
  });
});

test("a path outside each root is skipped, and the root itself is skipped", () => {
  expect(
    actions([
      entry("/home/me/docs", { age: 30 * DAY }),
      entry("/tmp", { age: 30 * DAY }),
    ]),
  ).toEqual({ "/home/me/docs": "skip", "/tmp": "skip" });
});

test("a symlink is skipped, and a missing path is gone", () => {
  expect(
    actions([
      entry("/tmp/l", { age: 30 * DAY, isLink: true }),
      entry("/tmp/m", { real: null }),
    ]),
  ).toEqual({ "/tmp/l": "skip", "/tmp/m": "gone" });
});

test("over the size bound, the oldest go until the total is under the bound", () => {
  const plan = planSweep(
    [
      entry("/tmp/a", { age: 3 * DAY, size: 600 }),
      entry("/tmp/b", { age: 2 * DAY, size: 600 }),
      entry("/tmp/c", { age: 1 * DAY, size: 600 }),
    ],
    BOUNDS,
  );
  const by = Object.fromEntries(plan.verdicts.map((v) => [v.record.path, v]));
  expect(by["/tmp/a"]?.action).toBe("remove");
  expect(by["/tmp/b"]?.action).toBe("remove");
  expect(by["/tmp/c"]?.action).toBe("keep");
  expect(plan.removed).toBe(2);
  expect(plan.freed).toBe(1200);
});

test("a kept output inside an old folder keeps that folder", () => {
  expect(
    actions([
      entry("/tmp/dir", { age: 30 * DAY }),
      entry("/tmp/dir/job", { held: true }),
    ]),
  ).toEqual({ "/tmp/dir": "keep", "/tmp/dir/job": "keep" });
});

test("an output inside a removed folder is counted once", () => {
  const plan = planSweep(
    [
      entry("/tmp/dir", { age: 30 * DAY, size: 100 }),
      entry("/tmp/dir/f", { age: 30 * DAY, size: 40 }),
    ],
    BOUNDS,
  );
  expect(plan.removed).toBe(1);
  expect(plan.freed).toBe(100);
});

test("the size text has a unit", () => {
  expect(sizeText(512)).toBe("512 B");
  expect(sizeText(5 * 1024 ** 3)).toBe("5.0 GiB");
});
