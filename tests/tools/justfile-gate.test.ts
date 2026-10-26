// The cost bound of the `eval` recipe of the `justfile`.

import { expect, test } from "bun:test";
import path from "node:path";
import { EVAL_MAX_COST_USD } from "../../tools/limits.ts";
import { REPO } from "../support/repo.ts";

const JUSTFILE = await Bun.file(path.join(REPO, "justfile")).text();

test("the cost bound of the `eval` recipe is the bound in `tools/limits.ts` (review row 127)", () => {
  const recipe = JUSTFILE.slice(JUSTFILE.indexOf("\neval *args:"));
  const value = /--max-cost-usd (\S+)/.exec(recipe)?.[1];
  expect(value).toBe(String(EVAL_MAX_COST_USD));
});
