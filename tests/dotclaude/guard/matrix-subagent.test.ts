// The shared-checkout rule of the `guard` slice: denied in a subagent only, and the calls that a linked worktree keeps (spec P37, step 4).
// The stash and worktree commands are denied in a subagent in any checkout.
// A branch switch is denied in a subagent only in the main checkout, which the `.git` folder of the cwd shows.
// The main session keeps every command of this file, and each deny holds the exact command.

import { expect, test } from "bun:test";
import { linked, main, mainDeny, subagentDeny } from "./ports.ts";

/** The stash and worktree commands: denied in a subagent in the main checkout and in a linked worktree. */
const SUBAGENT_ANY_CHECKOUT = [
  "git stash",
  "git stash push -m x",
  "git stash pop",
  "git stash apply",
  "git worktree remove --force x",
];

/** The branch switches: denied in a subagent in the main checkout only. */
const SUBAGENT_MAIN_CHECKOUT = ["git checkout -b x", "git switch main"];

/** The calls that a subagent in a linked worktree keeps, with the stash list and the files that the checkout can name. */
const KEPT_IN_LINKED = [
  "git checkout -b x",
  "git switch main",
  "git stash list",
  "git status",
  "git diff",
  "git commit -m x",
  "git checkout HEAD -- src/a.ts",
  "git checkout HEAD -- missing.txt",
  "rm -rf node_modules",
  "rm -rf ./dist",
  'bash -c "bun test"',
  "git push origin feature",
];

test("a subagent is denied for each stash and worktree command, in any checkout", async () => {
  for (const command of SUBAGENT_ANY_CHECKOUT) {
    for (const cwd of [main, linked]) {
      const reason = await subagentDeny(command, cwd);
      expect(reason, `${command} in ${cwd}`).not.toBeNull();
      expect(reason, command).toContain(command);
    }
  }
});

test("a subagent in the main checkout is denied for a branch switch", async () => {
  for (const command of SUBAGENT_MAIN_CHECKOUT) {
    const reason = await subagentDeny(command, main);
    expect(reason, command).not.toBeNull();
    expect(reason, command).toContain(command);
  }
});

test("the main session keeps each command of the shared-checkout rule", async () => {
  for (const command of [...SUBAGENT_ANY_CHECKOUT, ...SUBAGENT_MAIN_CHECKOUT]) {
    expect(await mainDeny(command, main), command).toBeNull();
    expect(await mainDeny(command, linked), command).toBeNull();
  }
});

test("a subagent in a linked worktree keeps each call of the kept list", async () => {
  for (const command of KEPT_IN_LINKED) {
    expect(await subagentDeny(command, linked), command).toBeNull();
  }
});
