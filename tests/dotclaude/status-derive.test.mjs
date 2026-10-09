// The derived values and the reset-credit parser of the status line.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  parseCredits,
  readCredits,
} from "../../plugins/dotclaude/features/statusline/credits.mjs";
import {
  cacheLeft,
  cacheStats,
  headroom,
  pace,
  rates,
} from "../../plugins/dotclaude/features/statusline/derive.mjs";

const H = 3600;
const NOW = 1_000_000;
const window = (used, passedHours) => ({
  used_percentage: used,
  resets_at: NOW + (5 - passedHours) * H,
});

test("pace: a deficit is the used percentage minus the elapsed percentage", () => {
  expect(pace(window(62, 2.5), NOW, 5 * H).delta).toBe(12);
  expect(pace(window(20, 2.5), NOW, 5 * H).delta).toBe(-30);
});

test("pace: no pace in the first 3% of the window, or for a window that is not current", () => {
  expect(pace(window(5, 0.1), NOW, 5 * H)).toBeNull();
  expect(pace(window(5, 0.2), NOW, 5 * H)).not.toBeNull();
  expect(
    pace({ used_percentage: 5, resets_at: NOW - 1 }, NOW, 5 * H),
  ).toBeNull();
  expect(
    pace({ used_percentage: 5, resets_at: NOW + 6 * H }, NOW, 5 * H),
  ).toBeNull();
  expect(pace({ resets_at: NOW + H }, NOW, 5 * H)).toBeNull();
});

test("run-out: the time is `now + (100 - used) * elapsed / used`, and only before the reset", () => {
  // 2.5 h gone and 62% used: 38% more takes 38 / 62 * 2.5 h.
  const p = pace(window(62, 2.5), NOW, 5 * H);
  expect(p.runOutAt).toBeCloseTo(NOW + (38 / 62) * 2.5 * H, 5);
  expect(pace(window(20, 2.5), NOW, 5 * H).runOutAt).toBeNull();
  expect(pace(window(100, 2.5), NOW, 5 * H).runOutAt).toBeNull();
  expect(pace(window(0, 2.5), NOW, 5 * H).runOutAt).toBeNull();
});

test("cache: hit, informative misses, and the time left", () => {
  const cache = {
    hit_ratio: 0.876,
    misses: 6,
    miss_causes: { ttl_expired_5m: 2, model_changed: 1, system_changed: 3 },
    last_miss_cause: { causes: ["model_changed", "system_changed"] },
  };
  expect(cacheStats(cache)).toEqual({
    hit: 88,
    misses: 3,
    last: "system_changed",
  });
  expect(cacheStats({})).toEqual({ hit: null, misses: 0, last: null });
  expect(cacheLeft({ warm: true, expires_at: NOW + 90 }, NOW)).toBe(90);
  expect(cacheLeft({ warm: false, expires_at: NOW + 90 }, NOW)).toBe(0);
  expect(cacheLeft({ warm: true, expires_at: NOW - 5 }, NOW)).toBe(0);
});

test("rates: cost and changed lines for each hour of the session", () => {
  const cost = {
    total_cost_usd: 6,
    total_duration_ms: 2 * 3_600_000,
    total_lines_added: 200,
    total_lines_removed: 100,
  };
  expect(rates(cost)).toEqual({ costPerHour: 3, linesPerHour: 150 });
  expect(rates({ ...cost, total_duration_ms: 1000 })).toBeNull();
  expect(rates({ total_duration_ms: 3_600_000 }).costPerHour).toBeNull();
});

test("headroom is the tokens left and never below `0`", () => {
  expect(headroom(100_000, 300_000)).toBe(200_000);
  expect(headroom(400_000, 300_000)).toBe(0);
});

// The known shape of `cachedUsageUtilization` from Claude Code 2.1.289, pinned as a fixture.
const FETCHED = Date.parse("2026-10-04T12:00:00Z");
const iso = (hours) => new Date(FETCHED + hours * H * 1000).toISOString();
const grant = (over) => ({
  resets_left: 1,
  resets_total: 2,
  starts_at: iso(-24),
  ends_at: iso(24 * 8),
  paused: false,
  usable_now: true,
  ...over,
});
const FIXTURE = {
  fetchedAtMs: FETCHED,
  utilization: {
    five_hour: { utilization: 9, resets_at: iso(2) },
    cedar_ember: {
      eligible: true,
      grants: [
        grant({ resets_left: 2, ends_at: iso(48) }),
        grant({ starts_at: null, ends_at: null }),
      ],
    },
  },
};

test("credits: the known shape gives the usable count and the earliest expiry", () => {
  expect(parseCredits(FIXTURE.utilization.cedar_ember, FETCHED)).toEqual({
    left: 3,
    until: (FETCHED + 48 * H * 1000) / 1000,
  });
  const only = (g) => parseCredits({ eligible: true, grants: [g] }, FETCHED);
  expect(only(grant({ ends_at: null }))).toEqual({ left: 1, until: null });
  for (const bad of [
    grant({ paused: true }),
    grant({ usable_now: false }),
    grant({ ends_at: iso(-1) }),
    grant({ starts_at: iso(1) }),
    grant({ resets_left: 0 }),
    grant({ resets_left: "2" }),
  ])
    expect(only(bad)).toBeNull();
});

test("credits: an unknown shape gives `null` and no error", () => {
  for (const shape of [
    null,
    3,
    "x",
    {},
    { eligible: false, grants: [grant()] },
    { eligible: true },
    { eligible: true, grants: {} },
    { eligible: true, grants: [null, 4] },
  ])
    expect(parseCredits(shape, FETCHED)).toBeNull();
});

test("credits: the usage cache file is read, and a stale, absent, or odd file gives `null`", () => {
  // A new folder for each file, because `cached` keys its result by the path.
  const dirs = [];
  const env = (content) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dc-credits-"));
    dirs.push(dir);
    if (content !== undefined)
      fs.writeFileSync(path.join(dir, ".claude.json"), content);
    return { CLAUDE_CONFIG_DIR: dir };
  };
  try {
    const file = (copy) => JSON.stringify({ cachedUsageUtilization: copy });
    expect(readCredits(env(file(FIXTURE)), FETCHED + 60_000).left).toBe(3);
    expect(readCredits(env(file(FIXTURE)), FETCHED + 2 * H * 1000)).toBeNull();
    expect(
      readCredits(
        env(file({ ...FIXTURE, utilization: { cedar_ember: 5 } })),
        FETCHED,
      ),
    ).toBeNull();
    expect(
      readCredits(env(file({ fetchedAtMs: FETCHED })), FETCHED),
    ).toBeNull();
    expect(readCredits(env("not json"), FETCHED)).toBeNull();
    expect(readCredits(env(), FETCHED)).toBeNull();
  } finally {
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
  }
});
