// The guard slice keeps its own copies of two bounds of the `decide` slice, because a slice imports no other slice.

import { expect, test } from "bun:test";
import {
  APPROVAL_MAX,
  ATTEMPT_TIMEOUT_MS,
} from "../../../plugins/claudetto/slices/decide/limits.ts";
import {
  JEV_TIMEOUT_MS,
  JEV_YES_MIN,
} from "../../../plugins/claudetto/slices/guard/limits.ts";

test("`JEV_TIMEOUT_MS` is one try of the TypeSafe client, `ATTEMPT_TIMEOUT_MS`", () => {
  expect(JEV_TIMEOUT_MS).toBe(ATTEMPT_TIMEOUT_MS);
});

test("`JEV_YES_MIN` is `1 - APPROVAL_MAX`", () => {
  expect(JEV_YES_MIN).toBeCloseTo(1 - APPROVAL_MAX, 10);
});
