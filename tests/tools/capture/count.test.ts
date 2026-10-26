// `readCount` takes only a non-negative whole number as the count of a `count_tokens` reply.

import { expect, test } from "bun:test";
import { readCount } from "../../../dev/capture/domain/count.ts";

const reply = (value: unknown) => JSON.stringify({ input_tokens: value });

test("`readCount` accepts zero and a whole number", () => {
  expect(readCount(reply(0))).toBe(0);
  expect(readCount(reply(42))).toBe(42);
});

test.each([1.5, -3, "7", null, Number.MAX_SAFE_INTEGER + 2])(
  "`readCount` rejects the value %p",
  (value) => {
    expect(() => readCount(reply(value))).toThrow(/input_tokens/);
  },
);

test("`readCount` rejects a reply with no `input_tokens`", () => {
  expect(() => readCount("{}")).toThrow(/input_tokens/);
});
