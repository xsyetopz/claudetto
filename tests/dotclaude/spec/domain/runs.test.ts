// Tests of the runs of one wave: `domain/runs.ts` of the `spec` slice, with the cap of each tier (spec P35, step 5).

import { expect, test } from "bun:test";
import {
  capOf,
  parseSample,
  resetOf,
  runsAllowed,
  type UsageSample,
  windowRuns,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/runs.ts";
import { USAGE_SAMPLE_MAX_MS } from "../../../../src/plugins/dotclaude/slices/spec/limits.ts";

const NOW = Date.UTC(2026, 9, 12, 10, 0, 0);
const SECONDS = NOW / 1000;
/** The caps of the tiers of `setup`: Pro, Max 5x, and Max 20x. */
const TIER_CAPS = [5, 10, 20];

/** A window that is in use by `used` percent, and resets in an hour. */
const open = (used: number) => ({
  used_percentage: used,
  resets_at: SECONDS + 3600,
});

const sample = (
  five: number | null,
  week: number | null,
  savedAt = NOW,
): UsageSample => ({
  savedAt,
  rate_limits: {
    ...(five === null ? {} : { five_hour: open(five) }),
    ...(week === null ? {} : { seven_day: open(week) }),
  },
});

test("`capOf` reads plain digits of at least one, and gives the Claude Code default of 20 for any other value", () => {
  expect(capOf("5")).toBe(5);
  expect(capOf("20")).toBe(20);
  expect(capOf(undefined)).toBe(20);
  expect(capOf("")).toBe(20);
  expect(capOf("0")).toBe(20);
  expect(capOf("-2")).toBe(20);
  expect(capOf("1.5")).toBe(20);
  expect(capOf("many")).toBe(20);
});

test("`windowRuns` gives the cap for an empty window and no runs for a full one", () => {
  for (const cap of TIER_CAPS) {
    expect(windowRuns(cap, open(0), NOW), `empty ${cap}`).toBe(cap);
    expect(windowRuns(cap, open(100), NOW), `full ${cap}`).toBe(0);
  }
});

test("`windowRuns` gives the share of the free part of the cap, rounded down", () => {
  expect(windowRuns(10, open(16), NOW)).toBe(8);
  expect(windowRuns(10, open(50), NOW)).toBe(5);
  expect(windowRuns(20, open(80), NOW)).toBe(4);
  expect(windowRuns(10, open(150), NOW)).toBe(0);
});

test("`windowRuns` gives at least one run while a window is below 100 percent used", () => {
  expect(windowRuns(5, open(81), NOW)).toBe(1);
  expect(windowRuns(5, open(99), NOW)).toBe(1);
  expect(windowRuns(5, open(100), NOW)).toBe(0);
});

test("`resetOf` gives the latest reset of the full windows, and `null` when no window is full", () => {
  const later = { used_percentage: 100, resets_at: SECONDS + 7200 };
  const sooner = { used_percentage: 100, resets_at: SECONDS + 3600 };
  expect(
    resetOf(
      5,
      { savedAt: NOW, rate_limits: { five_hour: sooner, seven_day: later } },
      NOW,
    ),
  ).toBe(SECONDS + 7200);
  expect(resetOf(5, sample(81, null), NOW)).toBeNull();
  expect(resetOf(5, null, NOW)).toBeNull();
  expect(
    resetOf(
      5,
      { savedAt: NOW, rate_limits: { five_hour: { used_percentage: 100 } } },
      NOW,
    ),
  ).toBeNull();
});

test("`windowRuns` gives the cap for a window with no usage, or one that has reset", () => {
  expect(windowRuns(10, undefined, NOW)).toBe(10);
  expect(windowRuns(10, { resets_at: SECONDS + 60 }, NOW)).toBe(10);
  expect(
    windowRuns(10, { used_percentage: 100, resets_at: SECONDS - 1 }, NOW),
  ).toBe(10);
  expect(
    windowRuns(10, { used_percentage: 100, resets_at: SECONDS + 1 }, NOW),
  ).toBe(0);
});

test("`runsAllowed` gives the cap when no usage is known", () => {
  for (const cap of TIER_CAPS) {
    expect(runsAllowed(cap, null, NOW), `no sample ${cap}`).toBe(cap);
    expect(runsAllowed(cap, { savedAt: NOW }, NOW), `no limits ${cap}`).toBe(
      cap,
    );
  }
});

test("`runsAllowed` gives the cap for empty windows, and no run for a full window of either kind", () => {
  for (const cap of TIER_CAPS) {
    expect(runsAllowed(cap, sample(0, 0), NOW), `empty ${cap}`).toBe(cap);
    expect(runsAllowed(cap, sample(100, 0), NOW), `5h full ${cap}`).toBe(0);
    expect(runsAllowed(cap, sample(0, 100), NOW), `7d full ${cap}`).toBe(0);
  }
});

test("`runsAllowed` gives the lower of the 5h and the weekly windows", () => {
  expect(runsAllowed(10, sample(16, 80), NOW)).toBe(2);
  expect(runsAllowed(10, sample(16, 0), NOW)).toBe(8);
  expect(runsAllowed(20, sample(90, 50), NOW)).toBe(2);
});

test("`runsAllowed` allows one run when the sample is older than its bound", () => {
  const old = NOW - USAGE_SAMPLE_MAX_MS - 1;
  expect(runsAllowed(20, sample(0, 0, old), NOW)).toBe(1);
  expect(runsAllowed(20, sample(0, 0, NOW - USAGE_SAMPLE_MAX_MS), NOW)).toBe(
    20,
  );
});

test("`parseSample` reads a sample, and throws on text that is no sample", () => {
  expect(parseSample(JSON.stringify(sample(10, null)))).toStrictEqual(
    sample(10, null),
  );
  expect(() => parseSample("[]")).toThrow();
  expect(() => parseSample('{"rate_limits":{}}')).toThrow();
  expect(() => parseSample("not json")).toThrow();
});
