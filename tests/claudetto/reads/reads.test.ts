// Tests of the pure parts of the `reads` slice: the rejection test, the call key, the line spans, the record of a file, and the test for the context.

import { expect, test } from "bun:test";
import {
  CLEARED_RESULT,
  coveringSpan,
  idsInContext,
  spanOf,
  spanText,
  withRead,
} from "../../../plugins/claudetto/slices/reads/domain/ranges.ts";
import {
  callKey,
  inputOf,
  isRejected,
  REJECTED_RESULT,
  remember,
} from "../../../plugins/claudetto/slices/reads/domain/rejected.ts";
import {
  MAX_SEEN_READS,
  READ_DEFAULT_LINES,
} from "../../../plugins/claudetto/slices/reads/limits.ts";

test("only an error with the engine text for a rejection is a rejection", () => {
  expect(isRejected({ isError: true, result: REJECTED_RESULT })).toBe(true);
  expect(isRejected({ isError: true, result: "ENOENT" })).toBe(false);
  expect(isRejected({ result: REJECTED_RESULT })).toBe(false);
  expect(isRejected({ isError: true })).toBe(false);
});

test("equal inputs give one key, whatever the order of the keys", () => {
  expect(callKey("Edit", { a: 1, b: { c: [1, 2], d: "x" } })).toBe(
    callKey("Edit", { b: { d: "x", c: [1, 2] }, a: 1 }),
  );
  expect(callKey("Edit", { a: 1 })).not.toBe(callKey("Edit", { a: 2 }));
  expect(callKey("Edit", { a: 1 })).not.toBe(callKey("Write", { a: 1 }));
});

test("the input of a call leaves out the fields of the engine", () => {
  expect(
    inputOf({ tool: "Read", tool_use_id: "t", agentId: "a", file_path: "/p" }),
  ).toStrictEqual({ file_path: "/p" });
});

test("a set drops its oldest values over the bound", () => {
  const set = new Set<string>();
  for (const v of ["a", "b", "c", "a"]) remember(set, v, 2);
  expect([...set]).toStrictEqual(["c", "a"]);
});

test("a read with no limit counts the default lines, and a limit above it is cut", () => {
  expect(spanOf(undefined, undefined)).toStrictEqual([1, READ_DEFAULT_LINES]);
  expect(spanOf(50, 31)).toStrictEqual([50, 80]);
  expect(spanOf(10, 99999)).toStrictEqual([10, 10 + READ_DEFAULT_LINES - 1]);
  expect(spanOf(0, -1)).toStrictEqual([1, READ_DEFAULT_LINES]);
  expect(spanText([1, 200])).toBe("1 to 200");
});

test("reads that touch each other cover a span across both, and a gap does not", () => {
  const seen = [
    { id: "a", span: [1, 100] },
    { id: "b", span: [101, 200] },
    { id: "c", span: [300, 400] },
  ] as const;
  expect(coveringSpan(seen, [90, 110])).toStrictEqual([1, 200]);
  expect(coveringSpan(seen, [150, 250])).toBeUndefined();
  expect(coveringSpan(seen, [310, 320])).toStrictEqual([300, 400]);
  expect(coveringSpan([], [1, 2])).toBeUndefined();
});

test("a changed file starts a new record, and the record keeps the bound", () => {
  const stat = { mtimeMs: 1, size: 10 };
  let record = withRead(undefined, stat, { id: "a", span: [1, 10] });
  record = withRead(record, stat, { id: "b", span: [11, 20] });
  expect(record.seen.length).toBe(2);
  expect(
    withRead(record, { mtimeMs: 2, size: 10 }, { id: "c", span: [1, 5] }).seen,
  ).toStrictEqual([{ id: "c", span: [1, 5] }]);
  for (let i = 0; i < MAX_SEEN_READS + 5; i++)
    record = withRead(record, stat, { id: `x${i}`, span: [1, 2] });
  expect(record.seen.length).toBe(MAX_SEEN_READS);
});

test("a result is in the context when its block is there and its content is not the cleared text", () => {
  const messages = [
    {
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "a", content: "text" },
        { type: "tool_result", tool_use_id: "b", content: CLEARED_RESULT },
        {
          type: "tool_result",
          tool_use_id: "c",
          content: [{ type: "text", text: CLEARED_RESULT }],
        },
        {
          type: "tool_result",
          tool_use_id: "d",
          content: [{ type: "text", text: "kept" }],
        },
      ],
    },
  ];
  expect(
    [...idsInContext(messages, new Set(["a", "b", "c", "d", "e"]))].sort(),
  ).toStrictEqual(["a", "d"]);
});
