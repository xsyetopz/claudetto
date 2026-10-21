// The cases in `tests/compare/` need the arms of `tools/compare-builtins.ts`, so no plain eval run may pick them up.
// `claude plugin eval` reads `plugins/claudetto/evals/`, and `tools/tuning-cases.ts` reads `**/evals/*/case.yaml`.

import { expect, test } from "bun:test";
import { parse } from "yaml";
import { tuningCasesIn } from "../../../tools/tuning-cases.ts";
import { REPO } from "../../support/repo.ts";

const COMPARE = "tests/compare/*/case.yaml";

const names = async (): Promise<string[]> => {
  const out: string[] = [];
  for await (const f of new Bun.Glob(COMPARE).scan(REPO))
    out.push(parse(await Bun.file(`${REPO}/${f}`).text()).name);
  return out;
};

test("a compare case is in no generated eval folder and no tuning list", async () => {
  const compare = await names();
  expect(compare.length).toBeGreaterThan(0);
  const tuning = await tuningCasesIn(REPO);
  for (const name of compare) {
    expect(tuning).not.toContain(name);
    expect(
      await Bun.file(
        `${REPO}/plugins/claudetto/evals/${name}/case.yaml`,
      ).exists(),
    ).toBe(false);
  }
});
