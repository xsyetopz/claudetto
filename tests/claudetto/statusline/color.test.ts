// The color scale of three steps for each percent, and the helpers of the width.

import { expect, test } from "bun:test";
import { USAGE_LEVELS } from "../../../plugins/claudetto/kernel/budget.ts";
import { colorOff } from "../../../plugins/claudetto/slices/statusline/color.ts";
import {
  truncate,
  width,
} from "../../../plugins/claudetto/slices/statusline/width.ts";
import { DARK, NO_COLOR } from "./support.ts";

const ESC = String.fromCharCode(27);
const GREEN = `${ESC}[38;2;78;186;101mx${ESC}[0m`;
const YELLOW = `${ESC}[38;2;255;193;7mx${ESC}[0m`;
const RED = `${ESC}[38;2;255;107;128mx${ESC}[0m`;

const [warn, alarm] = USAGE_LEVELS;

test("the step of a percent changes at each bound of `USAGE_LEVELS`", () => {
  const { level } = DARK;
  const stepOf = (percent: number) => level(percent)("x");
  expect(stepOf(0)).toBe(GREEN);
  expect(stepOf(warn - 1)).toBe(GREEN);
  expect(stepOf(warn)).toBe(YELLOW);
  expect(stepOf(alarm - 1)).toBe(YELLOW);
  expect(stepOf(alarm)).toBe(YELLOW);
  expect(stepOf(alarm + 1)).toBe(RED);
  expect(stepOf(100)).toBe(RED);
  expect(stepOf(250)).toBe(RED);
});

test("with no color each style gives its text back, at each step", () => {
  const paint = NO_COLOR;
  for (const percent of [0, warn, alarm, 100])
    expect(paint.level(percent)("x")).toBe("x");
  expect(paint.bold("x")).toBe("x");
  expect(paint.dim("x")).toBe("x");
});

test("`NO_COLOR` turns the color off when it is set and not empty", () => {
  expect(colorOff({ NO_COLOR: "1" })).toBe(true);
  expect(colorOff({ NO_COLOR: "yes" })).toBe(true);
  expect(colorOff({ NO_COLOR: "" })).toBe(false);
  expect(colorOff({})).toBe(false);
});

test("a color sequence has no width, and a wide character has two columns", () => {
  expect(width(`${ESC}[31mabc${ESC}[0m`)).toBe(3);
  expect(width("⌂ a")).toBe(3);
  expect(width("漢字")).toBe(4);
});

test("a cut keeps the width bound, ends in `…`, and closes an open color", () => {
  expect(truncate("abcdef", 4)).toBe("abc…");
  expect(truncate("abcdef", 6)).toBe("abcdef");
  expect(truncate("abcdef", 0)).toBe("");
  const cut = truncate(`${ESC}[31mabcdef${ESC}[0m`, 4);
  expect(width(cut)).toBe(4);
  expect(cut.endsWith(`…${ESC}[0m`)).toBe(true);
  expect(width(truncate("漢字漢字", 5))).toBeLessThanOrEqual(5);
});
