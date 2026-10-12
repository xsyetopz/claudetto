// Tests of the git matchers that read paths and options: `checkout` without `--`, `clean` with a dry run, `rm` with `--cached`, and the force push.
// Each deny holds the exact command, and each allowed command reads no deny text.
// The commands are strings for `onBashCall`, and no command runs.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { tmpDir } from "../../support/repo.ts";
import { mainDeny } from "./ports.ts";

/** A folder with a folder `docs` and a file `file.txt`: a branch named `docs` would clash with the folder. */
const root = tmpDir("dc-guard-git-paths");
fs.mkdirSync(path.join(root, "docs"), { recursive: true });
await Bun.write(path.join(root, "file.txt"), "x\n");

/** The deny of `command` in the main session, which must hold the exact command. */
const denied = async (command: string) => {
  const reason = await mainDeny(command, root);
  expect(reason, command).not.toBeNull();
  expect(reason, command).toContain(command);
};

/** The allowed command in the main session: no deny text is given. */
const allowed = async (command: string) => {
  expect(await mainDeny(command, root), command).toBeNull();
};

test("checkout reads its first word as a revision when there is no --", async () => {
  await allowed("git checkout docs");
  await allowed("git checkout main file.txt");
  await denied("git checkout HEAD docs");
  await denied("git checkout HEAD -- docs");
});

test("checkout still denies a pathspec with no -- in its first word", async () => {
  await denied("git checkout .");
  await denied("git checkout *.ts");
  await denied("git checkout :/docs");
  await denied("git checkout HEAD .");
});

test("a dry run of clean is allowed, and a clean without one is denied", async () => {
  await allowed("git clean -nf");
  await allowed("git clean --dry-run -f");
  await allowed("git clean -n -d");
  await denied("git clean -fd");
});

test("git with a subcommand that a substitution wrote is denied, and a substitution in another word is not", async () => {
  await denied("git $(echo reset) --hard");
  await denied("git `echo reset` --hard");
  await allowed("git log $(echo HEAD)");
});

test("rm with --cached only unstages, so it is allowed", async () => {
  await allowed("git rm --cached -rf .");
  await allowed("git rm --cached docs");
});

test("a force push with no branch and a push of another branch are allowed", async () => {
  await allowed("git push --force");
  await allowed("git push origin +feature");
  await allowed("git push -u origin feature");
});

test("rm of a path that stays inside the folder is allowed after normalization", async () => {
  await allowed("rm -rf .");
  await allowed("rm -rf ./docs/../docs");
  await allowed("rm -rf /tmp/p37-missing/../p37-missing");
});
