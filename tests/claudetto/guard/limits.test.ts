// The guard slice keeps its own copy of a bound of the `decide` slice, because a slice imports no other slice.

import { expect, test } from "bun:test";
import { APPROVAL_MAX } from "../../../plugins/claudetto/slices/decide/limits.ts";
import { JEV_YES_MIN } from "../../../plugins/claudetto/slices/guard/limits.ts";

test("`JEV_YES_MIN` is `1 - APPROVAL_MAX`", () => {
  expect(JEV_YES_MIN).toBeCloseTo(1 - APPROVAL_MAX, 10);
});
