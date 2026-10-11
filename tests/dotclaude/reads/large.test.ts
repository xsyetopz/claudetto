// The file-print deny for a file too large to read (design D22, `$.fs.read` limit).
// The pure `printReason` gets `Infinity` from its `count`, and the read helper gets a file over `READ_MAX_BYTES`.
// A `.log` name marks a generated file, which the check allows, so the tests use a `.txt` name.
// No guarded command runs, and the test writes its file under the temp folder only.

import { expect, test } from "bun:test";
import path from "node:path";
import { READ_MAX_BYTES } from "../../../plugins/dotclaude/features/reads/limits.ts";
import { printReason } from "../../../plugins/dotclaude/features/reads/rules.ts";
import { tmpDir } from "../../support/repo.ts";
import { decideRead as decide } from "../../support/verdicts.ts";

const CWD = "/work/app";
const bash = (command: string, cwd = CWD) => ({
  tool_name: "Bash",
  cwd,
  tool_input: { command },
});
const tooLarge = async () => Infinity;

/** The `hookSpecificOutput` fields of a `PreToolUse` deny that this test reads. */

test("a tail print of a too large file names the file with no range", async () => {
  const reason = await printReason(bash("tail -n 3 big.txt"), tooLarge);
  expect(reason).toContain("/work/app/big.txt");
  expect(reason).not.toContain("`offset`");
  expect(reason).not.toContain("Infinity");
});

test("a cat print of a too large file is denied", async () => {
  const reason = await printReason(bash("cat big.txt"), tooLarge);
  expect(reason).toContain("/work/app/big.txt");
});

test("the read helper denies a file over `READ_MAX_BYTES` by its size", async () => {
  const file = path.join(tmpDir("reads-large"), "big.txt");
  await Bun.write(file, "a\n".repeat(READ_MAX_BYTES / 2 + 1));
  const out = await decide(bash(`tail -n 3 ${file}`, path.dirname(file)));
  const specific = out?.hookSpecificOutput;
  expect(specific?.permissionDecision).toBe("deny");
  expect(specific?.permissionDecisionReason).toContain(file);
  expect(specific?.permissionDecisionReason).not.toContain("`offset`");
});
