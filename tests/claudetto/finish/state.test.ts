// The state of a goal: read it back, and cut the check from the text of the command.

import { expect, test } from "bun:test";
import {
  checkOf,
  parseGoal,
} from "../../../plugins/claudetto/slices/finish/domain/state.ts";

test("a goal survives a write and a read", () => {
  expect(parseGoal(JSON.stringify({ check: "just check" }))).toEqual({
    check: "just check",
  });
});

test("the text `null`, an empty text, and a text that is not a goal read as no goal", () => {
  for (const text of ["null", "", "{", '{"steps":1}', '{"check":""}']) {
    expect(parseGoal(text)).toBeNull();
  }
});

test("the check is the text with one pair of backticks cut", () => {
  expect(checkOf(" `just check` ")).toBe("just check");
  expect(checkOf("just check")).toBe("just check");
});
