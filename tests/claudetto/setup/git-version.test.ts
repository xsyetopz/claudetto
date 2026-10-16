// Tests of the git version note of `claudetto-setup settings`.
// The `git` here is a STUB program in a temporary `bin` folder that prints a fixed version.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  gitIsNew,
  parseGitVersion,
} from "../../../plugins/claudetto/slices/setup/domain/git-version.ts";
import { writeProgram } from "../../support/fake-program.ts";
import { PLUGINS, tmpDir } from "../../support/repo.ts";

const SCRIPT = path.join(PLUGINS, "claudetto/bin/claudetto-setup");

/** Runs the preview of `settings` with a `git` stub that prints `version`, or with no `git` when `version` is `undefined`. */
const preview = async (version: string | undefined) => {
  const root = tmpDir("dc-gitver");
  const bin = path.join(root, "bin");
  for (const dir of [bin, path.join(root, "config"), path.join(root, "p")])
    fs.mkdirSync(dir);
  if (version !== undefined)
    await writeProgram(
      bin,
      "git",
      `if (process.argv[2] === "--version") console.log(${JSON.stringify(version)}); else process.exit(1);\n`,
    );
  const r = Bun.spawnSync(
    [process.execPath, "--no-env-file", SCRIPT, "settings"],
    {
      env: {
        CLAUDE_CONFIG_DIR: path.join(root, "config"),
        CLAUDE_PROJECT_DIR: path.join(root, "p"),
        PATH: bin,
      },
    },
  );
  return r.stdout.toString();
};

test("the version parser reads the numbers of a plain and an Apple version", () => {
  expect(parseGitVersion("git version 2.54.0 (Apple Git-157)")).toEqual({
    major: 2,
    minor: 54,
  });
  expect(parseGitVersion("not git")).toBeUndefined();
  expect(gitIsNew("git version 2.53.0")).toBe(false);
  expect(gitIsNew("git version 2.54.0 (Apple Git-157)")).toBe(true);
  expect(gitIsNew("git version 3.0.1")).toBe(true);
  expect(gitIsNew("git version 1.99.0")).toBe(false);
  expect(gitIsNew("")).toBe(false);
});

test("git 2.53.0 gives a note that names the checks that do not run", async () => {
  const out = await preview("git version 2.53.0");
  expect(out).toContain("git version 2.53.0");
  expect(out).toContain("`commit-msg`");
  expect(out).toContain("`pre-push`");
});

test("git 2.54.0 from Apple gives no note", async () => {
  const out = await preview("git version 2.54.0 (Apple Git-157)");
  expect(out).not.toContain("2.54 or later");
});

test("a missing git gives a note that says that git is missing", async () => {
  const out = await preview(undefined);
  expect(out).toContain("no `git` program");
  expect(out).toContain("`pre-push`");
});
