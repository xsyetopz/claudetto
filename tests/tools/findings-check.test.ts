// `tools/findings-check.ts` fails while a row of `findings.md` has no passed check (D38).

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openRows } from "../../tools/findings-check.ts";
import { REPO } from "../support/repo.ts";

const HEAD =
  "| Surface | Fault | Source | Task | Check |\n| --- | --- | --- | --- | --- |\n";
const OPEN = `${HEAD}| \`a\` | none found | lab | none | \`just lab\` |\n| \`b\` | a fault | test | 3.4 | \`just lab\` |\n`;
const CLOSED = `${HEAD}| \`a\` | none found | lab | none | \`just lab\` |\n| \`b\` | a fault | test | 3.4, done in \`abc\` | \`just lab\` |\n| \`c\` | a fault | test | 5.1 (checked) | \`just lab\` |\n`;

test("`openRows` names a row whose task is not done", () => {
  expect(openRows(OPEN)).toEqual([{ line: 4, surface: "`b`", task: "3.4" }]);
});

test("`openRows` finds no row when each task is `none`, done, or checked", () => {
  expect(openRows(CLOSED)).toEqual([]);
});

const run = (findings: string) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "findings-"));
  const file = path.join(dir, "findings.md");
  try {
    fs.writeFileSync(file, findings);
    return Bun.spawnSync(
      [process.execPath, path.join(REPO, "tools/findings-check.ts"), file],
      { cwd: REPO, stdout: "pipe", stderr: "pipe" },
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

test("the tool exits 1 on a fixture with an open row", () => {
  const result = run(OPEN);
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("findings.md:4:");
});

test("the tool exits 0 on a fixture with no open row", () => {
  expect(run(CLOSED).exitCode).toBe(0);
});
