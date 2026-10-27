// The cost bound of the `eval` recipe of the `justfile`.

import { expect, test } from "bun:test";
import path from "node:path";
import { file as bunFile } from "bun";
import { EVAL_MAX_COST_USD } from "../../tools/limits.ts";
import { REPO } from "../support/repo.ts";

const MAX_COST_USD_RE = /--max-cost-usd (\S+)/;

const JUSTFILE = await bunFile(path.join(REPO, "justfile")).text();

test("the cost bound of the `eval` recipe is the bound in `tools/limits.ts` (review row 127)", () => {
	const recipe = JUSTFILE.slice(JUSTFILE.indexOf("\neval *args:"));
	const value = MAX_COST_USD_RE.exec(recipe)?.[1];
	expect(value).toBe(String(EVAL_MAX_COST_USD));
});
