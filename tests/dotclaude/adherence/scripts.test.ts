// The script files that a `Bash` command runs, for the git ask and the write ask of the `adherence` hooks.
// The files are strings in a fake `read`. No command runs and no file is read.

import { expect, test } from "bun:test";
import { SCRIPT_FILES_MAX } from "../../../plugins/dotclaude/features/adherence/limits.ts";
import type { HookOutput } from "../../../plugins/dotclaude/lib/hook-io.ts";
import { decideAsk as decide } from "../../support/verdicts.ts";
import { filesByPath } from "./stub-fs.ts";

/** The `hookSpecificOutput` of an ask, as `decide` gives it. */
type Ask = HookOutput["hookSpecificOutput"];

const STASH = {
  "/w/x.py": "import os\nos.system('git stash')\n",
  "/w/run.sh": "#!/bin/sh\ngit reset --hard\n",
  "/w/run": "#!/usr/bin/env bash\ngit stash\n",
  "/w/fix.awk": 'BEGIN { system("git stash") }\n',
  "/home/me/x.py": "import os\nos.system('git stash')\n",
  "/w/tests/a.test.mjs": "assert.equal(gitReason('git stash'), 'ask')\n",
  "/w/tool.mjs":
    "readFileSync('tests/a.test.mjs'); readFileSync('biome.json')\n",
  "/w/edit.py": "import os\nos.system('sed -i s/a/b/ tests/a.test.mjs')\n",
};
/** The `hookSpecificOutput` fields that the `ask` tests read. */

const out = async (
  command: string,
  files: Record<string, string> = STASH,
): Promise<Ask | undefined> =>
  (
    await decide(
      { tool_name: "Bash", cwd: "/w", tool_input: { command } },
      { HOME: "/home/me" },
      { ...filesByPath(files) },
    )
  )?.hookSpecificOutput;
const asks = async (command: string, files?: Record<string, string>) =>
  expect((await out(command, files))?.permissionDecision, command).toBe("ask");

test("a script file that a program, a shell, or the command itself runs is read", async () => {
  for (const command of [
    "python3 x.py",
    "uv run x.py",
    "env A=b python3 -u x.py",
    "bash run.sh",
    "./run",
    "./run.sh",
    "awk -f fix.awk data.txt",
    "python3 ~/x.py",
    "chmod +x run.sh && ./run.sh",
  ])
    await asks(command);
});

test("a write form in a script file gets the write ask", async () => {
  const o = await out("python3 edit.py");
  expect(o?.permissionDecision).toBe("ask");
  expect(
    o?.permissionDecisionReason?.includes("`tests/a.test.mjs`"),
  ).toBeTruthy();
});

test("a path that a script file only names gets no ask, unlike a path in inline code", async () => {
  expect(await out("node tool.mjs")).toBe(undefined);
  await asks(`node -e "readFileSync('tests/a.test.mjs')"`);
});

test("a test run, a file tool, and an absent file are not read", async () => {
  for (const command of [
    "node --test tests/a.test.mjs",
    "npx jest tests/a.test.mjs",
    "python3 -m pytest tests/a.test.mjs",
    "bun test tests/a.test.mjs",
    "cp x.py y.py",
    "sed -i s/a/b/ x.py",
    "rm x.py",
    "python3 absent.py",
    "cat x.py",
  ])
    expect(await out(command), command).toBe(undefined);
});

test("the asks read at most `SCRIPT_FILES_MAX` files of one command", async () => {
  const files: Record<string, string> = {};
  const names: string[] = [];
  for (let n = 0; n <= SCRIPT_FILES_MAX; n++) {
    names.push(`f${n}.py`);
    files[`/w/f${n}.py`] =
      n === SCRIPT_FILES_MAX ? "os.system('git stash')" : "";
  }
  expect(await out(names.map((f) => `python3 ${f}`).join("; "), files)).toBe(
    undefined,
  );
  await asks(`python3 f${SCRIPT_FILES_MAX}.py`, files);
});

test("an array of options before the git subcommand is read as options", async () => {
  expect(await out(`git "\${GIT_FIXTURE[@]}" commit -q -m x`)).toBe(undefined);
  await asks(`git "\${GIT_FIXTURE[@]}" stash`);
  await asks("git $sub");
});
