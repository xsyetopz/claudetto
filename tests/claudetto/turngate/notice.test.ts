// Tests of the transcript notices of the `turngate` slice (D5).
// Task 3.5 removed the cap notice with `MAX_BLOCKS`, so the failed-judge notice is the one that stays.
// Claude Code draws each `ui.log` line under the name of the plugin, so the text has no `claudetto` of its own.

import { expect, test } from "bun:test";
import { oneLine } from "../../../plugins/claudetto/kernel/text.ts";
import { NOTICE_FAILED } from "../../../plugins/claudetto/slices/turngate/prompts.ts";

const isOneLineWithOneName = (notice: string) => {
  expect(notice.split("\n")).toHaveLength(1);
  expect(notice.match(/claudetto/g)?.length ?? 0).toBeLessThanOrEqual(1);
};

test("the failed-judge notice is one line with `claudetto` at most once", () => {
  isOneLineWithOneName(
    oneLine(NOTICE_FAILED({ cause: "Error: claudetto judge\n  at x" })),
  );
});

test("`oneLine` folds each line break to ` · ` and drops empty lines", () => {
  expect(oneLine("a\n\n  b  \r\nc\n")).toBe("a · b · c");
  expect(oneLine("one")).toBe("one");
});
