// The file-print deny (spec context-bound, design D22) with commands as strings.
// No command runs. `count` is a stub for the line count of the named file, and no file is read.

import { expect, test } from "bun:test";
import type { Count } from "../../../plugins/dotclaude/features/reads/rules.ts";
import type { Verdict } from "../../support/verdicts.ts";
import { decideRead as decide } from "../../support/verdicts.ts";

/** The `hookSpecificOutput` fields of a `PreToolUse` deny that this test reads. */
const specificOf = (out: Verdict | undefined) => out?.hookSpecificOutput;

const CWD = "/work/app";
// The print rule gives a path with `/` only, on every platform, as `lib/paths.ts` does.
const FILE = "/work/app/docs/design.md";
const run = (command: string, count: Count = async () => 100) =>
  decide({ tool_name: "Bash", cwd: CWD, tool_input: { command } }, count);
const reason = async (command: string, count?: Count) =>
  specificOf(await run(command, count))?.permissionDecisionReason as string;
/** The `Read` arguments that the reason of the print rule carries. */
const readArgs = async (command: string, count?: Count) => {
  const text = await reason(command, count);
  const num = (key: string) => {
    const m = new RegExp(`\`${key}\` (\\d+)`).exec(text);
    return m ? Number(m[1]) : undefined;
  };
  return {
    file: /`file_path` `([^`]+)`/.exec(text)?.[1],
    offset: num("offset"),
    limit: num("limit"),
  };
};

test("`cat F` is denied with the absolute path and no range", async () => {
  const specific = specificOf(await run("cat docs/design.md"));
  expect(specific?.hookEventName).toBe("PreToolUse");
  expect(specific?.permissionDecision).toBe("deny");
  expect(await readArgs("cat docs/design.md")).toStrictEqual({
    file: FILE,
    limit: undefined,
    offset: undefined,
  });
});

test("`sed -n 'a,bp' F` names `Read` with `offset a` and `limit b-a+1`", async () => {
  expect(await readArgs("sed -n '40,80p' docs/design.md")).toStrictEqual({
    file: FILE,
    offset: 40,
    limit: 41,
  });
  expect(await readArgs('sed -n "7p" docs/design.md')).toMatchObject({
    offset: 7,
    limit: 1,
  });
});

test("`head F`, `head -n N F`, and `head -N F` name `Read` from line 1", async () => {
  const from1 = (limit: number) => ({ file: FILE, offset: 1, limit });
  expect(await readArgs("head docs/design.md")).toStrictEqual(from1(10));
  expect(await readArgs("head -n 30 docs/design.md")).toStrictEqual(from1(30));
  expect(await readArgs("head -5 docs/design.md")).toStrictEqual(from1(5));
});

test("`tail F` names `Read` at the last lines, from the line count", async () => {
  expect(await readArgs("tail docs/design.md")).toMatchObject({
    offset: 91,
    limit: 10,
  });
  expect((await readArgs("tail -n 20 docs/design.md")).offset).toBe(81);
  expect(await readArgs("tail -n 500 docs/design.md")).toMatchObject({
    offset: 1,
    limit: 100,
  });
  expect((await readArgs("tail -n +50 docs/design.md")).offset).toBe(50);
});

test("a bounded pipe, a redirect, and a range in a list stay allowed", async () => {
  for (const command of [
    "grep -n D22 docs/design.md | head -5",
    "cat docs/design.md > copy.md",
    "sed -n '1,5p' docs/design.md; ls",
  ])
    expect(await run(command)).toBe(undefined);
});

test("a print in a pipe, a list, or a substitution stays allowed, because `bashOutputMaxChars` bounds the output", async () => {
  for (const command of [
    "cat docs/design.md | grep D22",
    "cat docs/design.md && echo done",
    "cat $(ls docs)",
    "cat docs/design.md\nls",
  ])
    expect(await run(command)).toBe(undefined);
});

test("a command with an edit, a byte count, or another bounded form stays allowed", async () => {
  for (const command of [
    "sed -i 's/a/b/' docs/design.md",
    "head -c 2000 docs/design.md",
    "tail -f docs/design.md",
    "head -n -3 docs/design.md",
    "ls docs",
    "git log -n 5",
  ])
    expect(await run(command)).toBe(undefined);
});

test("more than one file, an option, a pattern print, and `git log` stay allowed", async () => {
  for (const command of [
    "cat a.md b.md",
    "cat -n docs/design.md",
    "sed -n '/x/p' docs/design.md",
    "git log",
  ])
    expect(await run(command)).toBe(undefined);
});

test("a generated file gets no `Read` call", async () => {
  expect(await run("tail -n 50 run.log")).toBe(undefined);
  for (const command of [
    "cat node_modules/p/index.js",
    "cat bun.lock",
    "cat dist/app.min.js",
  ])
    expect(await run(command)).toBe(undefined);
});

test("a file in a temp folder is denied, because a project can be in a temp folder", async () => {
  for (const command of ["head /tmp/out.txt", "cat /private/tmp/p/notes.txt"])
    expect(await run(command)).not.toBe(undefined);
});

test("a file that does not exist or has no lines stays allowed", async () => {
  expect(await run("cat missing.md", async () => null)).toBe(undefined);
  expect(await run("tail missing.md", async () => null)).toBe(undefined);
  expect(await run("tail empty.md", async () => 0)).toBe(undefined);
});

test("a tool other than `Bash`, and a payload with no command, give no output", async () => {
  expect(
    await decide({
      tool_name: "Read",
      cwd: CWD,
      tool_input: { command: "cat a" },
    }),
  ).toBe(undefined);
  expect(await decide({ tool_name: "Bash", cwd: CWD, tool_input: {} })).toBe(
    undefined,
  );
  expect(await decide(undefined)).toBe(undefined);
});
