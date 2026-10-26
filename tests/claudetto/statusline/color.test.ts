// The usage gradient between three stops, and the helpers of the width.

import { expect, test } from "bun:test";
import { colorOff } from "../../../plugins/claudetto/modules/statusline/color.ts";
import {
  truncate,
  width,
} from "../../../plugins/claudetto/modules/statusline/width.ts";
import { DARK, NO_COLOR } from "./support.ts";

const ESC = String.fromCharCode(27);
const style = (rgb: string) => `${ESC}[38;2;${rgb}mx${ESC}[0m`;

test("the gradient has the stop colors at the stop percents and holds them beyond", () => {
  const { level } = DARK;
  const green = style("78;186;101");
  const amber = style("255;193;7");
  const red = style("255;107;128");
  expect([0, 20].map((p) => level(p)("x"))).toStrictEqual([green, green]);
  expect(level(60)("x")).toBe(amber);
  expect([90, 100, 250].map((p) => level(p)("x"))).toStrictEqual([
    red,
    red,
    red,
  ]);
});

test("the gradient is linear between two stops", () => {
  const { level } = DARK;
  expect(level(40)("x")).toBe(style("167;190;54"));
  expect(level(75)("x")).toBe(style("255;150;68"));
});

test("with no color each style gives its text back, at each step", () => {
  const paint = NO_COLOR;
  for (const percent of [0, 20, 60, 100])
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
