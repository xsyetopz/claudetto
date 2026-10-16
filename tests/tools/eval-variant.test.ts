// `just eval-variant` runs two paid arms, so each arm must keep its sandbox and trace, as `just eval` does.

import { expect, test } from "bun:test";
import { compareArgs } from "../../tools/eval-variant.ts";

test("the compare arguments keep the temp folder of each arm (review row 126)", () => {
  const args = compareArgs("/tmp/tree", ["--case", "x"]);
  expect(args).toContain("--keep-temp");
  expect(args.slice(-2)).toStrictEqual(["--case", "x"]);
});
