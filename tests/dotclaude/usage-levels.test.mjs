// The levels of `features/context/limits.mjs` and the text of the level notes (spec usage-awareness, design D32).
// The levels are pinned against the client bounds and the status line, and each note against its size.

import { expect, test } from "bun:test";
import { newLevels } from "../../plugins/dotclaude/features/context/levels.mjs";
import {
  CONTEXT_BLOCK_MARGIN,
  CONTEXT_HANDOFF_AT,
  CONTEXT_NOTICE_AT,
  HANDOFF_RESERVE,
  NOTE_MAX_BYTES,
  RATE_HANDOFF_AT,
  RATE_HANDOFF_MINUTES,
  RATE_NOTICE_AT,
} from "../../plugins/dotclaude/features/context/limits.mjs";
import { noteText } from "../../plugins/dotclaude/features/context/notes.mjs";
import {
  CONTEXT_WINDOW,
  USAGE_LEVELS,
} from "../../plugins/dotclaude/lib/budget.mjs";

const NOW = 1_800_000_000;

test("the levels are in order, and the usage levels are the levels that the status line marks", () => {
  expect(0 < CONTEXT_NOTICE_AT).toBe(true);
  expect(CONTEXT_NOTICE_AT < CONTEXT_HANDOFF_AT).toBe(true);
  expect(CONTEXT_HANDOFF_AT < 100).toBe(true);
  expect([RATE_NOTICE_AT, RATE_HANDOFF_AT]).toEqual(USAGE_LEVELS);
  expect(RATE_NOTICE_AT < RATE_HANDOFF_AT).toBe(true);
  expect(RATE_HANDOFF_MINUTES).toBeGreaterThan(0);
});

test("the notice keeps `HANDOFF_RESERVE` free below the client block, and the handoff note fires before that reserve", () => {
  const block = CONTEXT_WINDOW - CONTEXT_BLOCK_MARGIN;
  const notice = (CONTEXT_WINDOW * CONTEXT_NOTICE_AT) / 100;
  const handoff = (CONTEXT_WINDOW * CONTEXT_HANDOFF_AT) / 100;
  expect(notice).toBeLessThan(block - HANDOFF_RESERVE);
  expect(handoff + HANDOFF_RESERVE).toBeLessThanOrEqual(block);
});

test("a handoff of 20K tokens from `CONTEXT_HANDOFF_AT` ends before the client warning at the window minus 40K", () => {
  const start = (CONTEXT_WINDOW * CONTEXT_HANDOFF_AT) / 100;
  expect(start + 20_000).toBeLessThanOrEqual(CONTEXT_WINDOW - 40_000);
});

const context = (step, pct) => ({
  id: `context:${step}`,
  kind: "context",
  step,
  tokens: Math.ceil((CONTEXT_WINDOW * pct) / 100),
  share: pct,
});
const usage = (step, pct, kind = "five_hour") => ({
  id: `${kind}@${NOW + 3600}:${step}`,
  kind,
  step,
  used_percentage: pct,
  resets_at: NOW + 3600,
  run_out_at: NOW + 600,
});

const NOTES = {
  "context notice": [[context("notice", CONTEXT_NOTICE_AT)], 60],
  "context handoff": [[context("handoff", CONTEXT_HANDOFF_AT)], 80],
  "usage notice": [[usage("notice", RATE_NOTICE_AT)], 10],
  "usage handoff": [[usage("handoff", RATE_HANDOFF_AT)], 10],
  "all handoffs": [
    [
      context("handoff", CONTEXT_HANDOFF_AT),
      usage("handoff", RATE_HANDOFF_AT),
      usage("handoff", RATE_HANDOFF_AT, "seven_day"),
    ],
    80,
  ],
};

for (const [name, [levels, share]] of Object.entries(NOTES))
  test(`the ${name} note is at most \`NOTE_MAX_BYTES\``, () => {
    const text = noteText(levels, { share, off: true, now: NOW });
    expect(Buffer.byteLength(text)).toBeLessThanOrEqual(NOTE_MAX_BYTES);
  });

test("no new level gives no note", () => {
  expect(noteText([])).toBeUndefined();
  const fired = new Set(["context:notice", "context:handoff"]);
  expect(
    newLevels([context("notice", 85), context("handoff", 85)], fired),
  ).toEqual([]);
});
