// Each eval case of the repository meets the rules of D25 (`tools/case-checks.ts`), and fails on its recorded bad run.
// A bad run is `{ events, files }` in `bad-runs/<case name>.json`, and no model grades it.

import { expect, test } from "bun:test";
import { parse } from "yaml";
import { caseFaultsIn } from "../../../tools/case-checks.ts";
import {
  failedGraders,
  runTokens,
  toolCalls,
} from "../../../tools/transcript-grade.ts";
import { REPO } from "../../support/repo.ts";

const DIR = `${REPO}/tests/claudetto/evals/bad-runs`;

test("each eval case names its metric, bounds, bad run, and split", async () => {
  expect(await caseFaultsIn(REPO)).toEqual([]);
});

for (const file of new Bun.Glob("*.json").scanSync(DIR)) {
  const name = file.replace(/\.json$/, "");
  test(`the case ${name} fails the grader that its bad run names`, async () => {
    const dir = `${REPO}/src/plugins/claudetto`;
    const found = await Promise.all(
      [...new Bun.Glob("**/evals/*/case.yaml").scanSync(dir)].map(async (f) =>
        parse(await Bun.file(`${dir}/${f}`).text()),
      ),
    );
    const doc = found.find((d) => d.name === name);
    expect(doc, `no case ${name}`).toBeTruthy();
    const run = await Bun.file(`${DIR}/${file}`).json();
    expect(run.fails, "the bad run names no grader").toBeTruthy();
    expect(failedGraders(doc.graders, run)).toContain(run.fails);
    expect(toolCalls(run)).toBeGreaterThan(0);
    expect(runTokens(run)).toBeGreaterThan(0);
  });
}
