// The two bounds of the `gc` sweep are pinned (design D6): 7 days and 5 GiB.

import { expect, test } from "bun:test";
import {
  AGE_MAX_MS,
  SIZE_MAX_BYTES,
} from "../../../plugins/claudetto/slices/gc/limits.ts";

test("the age bound is 7 days", () => {
  expect(AGE_MAX_MS).toBe(604_800_000);
});

test("the size bound is 5 GiB", () => {
  expect(SIZE_MAX_BYTES).toBe(5_368_709_120);
});
