// The check of the tool input and the mode of the `decide` option, and the error text of a failed route.

import { expect, test } from "bun:test";
import {
  modeOf,
  parseInput,
} from "../../../plugins/claudetto/slices/decide/domain/request.ts";
import { resultText } from "../../../plugins/claudetto/slices/decide/domain/text.ts";

test("two options with one key fail the input check", () => {
  const out = parseInput({
    question: "Which?",
    options: [{ key: "a" }, { key: "b" }, { key: "a" }],
  });
  expect(out.ok).toBe(false);
});

test("options with distinct keys pass the input check", () => {
  const out = parseInput({
    question: "Which?",
    options: [{ key: "a" }, { key: "b" }, { key: "c" }],
  });
  expect(out.ok && out.request.options).toHaveLength(3);
});

test("the mode is `off` when the option is missing or unknown", () => {
  expect(modeOf({})).toBe("off");
  expect(modeOf({ decide: "everyone" })).toBe("off");
});

test("the mode is the value of the option when it is listed", () => {
  expect(modeOf({ decide: "claude" })).toBe("claude");
  expect(modeOf({ decide: "jev" })).toBe("jev");
});

test("the result of a route with no answer carries the error text of the run", () => {
  const text = resultText({
    source: "none",
    cause: "failed",
    detail: "socket closed",
  });
  expect(text).toContain("socket closed");
});
