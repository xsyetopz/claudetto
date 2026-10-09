// The levels of `features/context/limits.mjs` and the text of the context note (spec context-bound, design D32, D35).
// The levels are pinned against the client bounds, and each note against its size.

import { expect, test } from "bun:test";
import { contextLevel } from "../../plugins/dotclaude/features/context/levels.mjs";
import {
  CONTEXT_BLOCK_MARGIN,
  CONTEXT_HANDOFF_AT,
  CONTEXT_NOTICE_AT,
  HANDOFF_RESERVE,
  NOTE_MAX_BYTES,
} from "../../plugins/dotclaude/features/context/limits.mjs";
import {
  HANDOFF_STEPS,
  noteText,
} from "../../plugins/dotclaude/features/context/notes.mjs";
import { CONTEXT_WINDOW } from "../../plugins/dotclaude/lib/budget.mjs";

const at = (pct) => Math.ceil((CONTEXT_WINDOW * pct) / 100);

test("the levels are in order", () => {
  expect(0 < CONTEXT_NOTICE_AT).toBe(true);
  expect(CONTEXT_NOTICE_AT < CONTEXT_HANDOFF_AT).toBe(true);
  expect(CONTEXT_HANDOFF_AT < 100).toBe(true);
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

test("the level follows the share: none below the notice level, `notice`, then `handoff`", () => {
  expect(contextLevel(0)).toBeUndefined();
  expect(contextLevel(at(CONTEXT_NOTICE_AT) - 1)).toBeUndefined();
  expect(contextLevel(at(CONTEXT_NOTICE_AT))?.step).toBe("notice");
  expect(contextLevel(at(CONTEXT_HANDOFF_AT) - 1)?.step).toBe("notice");
  expect(contextLevel(at(CONTEXT_HANDOFF_AT))?.step).toBe("handoff");
  expect(contextLevel(at(100))?.step).toBe("handoff");
  expect(contextLevel(at(62))).toMatchObject({ tokens: at(62) });
  expect(contextLevel(at(62)).share).toBeCloseTo(62, 0);
});

test("the notice gives the figure, the tokens before the client block, and the small-slice rule, and no handoff steps", () => {
  const level = contextLevel(at(62));
  const text = noteText(level);
  const block = CONTEXT_WINDOW - CONTEXT_BLOCK_MARGIN;
  expect(text).toContain(`${level.tokens} tokens`);
  expect(text).toContain("62%");
  expect(text).toContain(`${block - level.tokens} tokens from now`);
  expect(text).toContain(
    `${block - level.tokens - HANDOFF_RESERVE} tokens are now free`,
  );
  expect(text).toContain("Start the slice only when it fits");
  expect(text).not.toContain(HANDOFF_STEPS);
  expect(text).not.toContain("/clear");
});

test("the handoff note adds the steps, `/clear`, and the resume command, and no `Status <date>:` step", () => {
  const text = noteText(contextLevel(at(82)));
  expect(text).toContain(HANDOFF_STEPS);
  expect(text).toContain("/clear");
  expect(text).toContain("/opsx:apply");
  expect(text).toContain("design.md");
  expect(text).not.toContain("Status");
});

test("each note is at most `NOTE_MAX_BYTES`, with compaction on or off", () => {
  for (const pct of [CONTEXT_NOTICE_AT, CONTEXT_HANDOFF_AT, 95])
    for (const off of [true, false])
      expect(
        Buffer.byteLength(noteText(contextLevel(at(pct)), { off })),
      ).toBeLessThanOrEqual(NOTE_MAX_BYTES);
});

test("no level gives no note", () => {
  expect(noteText(undefined)).toBeUndefined();
});
