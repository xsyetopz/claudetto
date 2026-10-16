// The read commands of the trace of 2026-10-12 get no ask, over a CI file, a test file, a limits file, `biome.json`, and plain source (package P36).
// The commands are strings and the test runs none.
// The shell edits in place of the trace (`sed -i` forms) are not here, as they ask.

import { expect, test } from "bun:test";
import { asks, bash } from "./calls.ts";

const FILES = [
  ".github/workflows/check.yml",
  "tests/a.test.ts",
  "src/plugins/claudetto/slices/asks/limits.ts",
  "biome.json",
  "src/app.ts",
];

/** The read forms of the trace for the file `f`. */
const forms = (f: string): string[] => [
  `sed -n '1,20p' ${f}`,
  `sed 's/a/b/' ${f}`,
  `sed -n '/x/p' ${f} | head`,
  `sed -e 's/a/b/' ${f} > /tmp/out`,
  `cat ${f} | sed 's/a/b/'`,
  `grep -n x ${f} | sed 's/:.*//'`,
  `awk '{print $1}' ${f}`,
  `jq . ${f}`,
  `yq '.on' ${f}`,
  `head -5 ${f}`,
  `wc -l ${f}`,
  `diff ${f} /tmp/x`,
  `git diff -- ${f}`,
  `perl -ne 'print if /x/' ${f}`,
  `rg x ${f}`,
  `cut -d: -f1 ${f}`,
  `sort ${f}`,
  `tr a b < ${f}`,
  `xargs echo < ${f}`,
  `cp ${f} /tmp/x`,
  `python3 tools/check.py ${f}`,
  `bun run lint ${f}`,
  `npx prettier --check ${f}`,
  `Get-Content ${f}`,
  `type ${f}`,
  `findstr x ${f}`,
];

for (const file of FILES) {
  test(`the read commands of the trace over \`${file}\` get no ask`, async () => {
    const files = { [`/w/${file}`]: "x" };
    const asked: string[] = [];
    for (const command of forms(file))
      if (await asks(bash(command), files)) asked.push(command);
    expect(asked).toEqual([]);
  });
}
