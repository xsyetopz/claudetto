// Who changed a file (spec `session-hygiene`, "Who Changed a File").

import { expect, test } from "bun:test";
import {
  isGitView,
  whoChanged,
} from "../../../plugins/claudetto/slices/hygiene/domain/authors.ts";

const WORKFLOW = ".github/workflows/commitlint.yml";

test("User Edit: a file that no ledger line holds with its hash is a change of the user", () => {
  const text = whoChanged(
    [{ path: WORKFLOW, hash: "1", session: "s1", agent: "main" }],
    "s1",
    [{ path: WORKFLOW, hash: "2" }],
  );
  expect(text).toContain(`- The user: \`${WORKFLOW}\`.`);
  expect(text).toContain("A change of the user is intended");
  expect(text).not.toContain("This session");
});

test("Other Session: a file that session A wrote is a change of session A for session B", () => {
  const text = whoChanged(
    [{ path: "src/x.ts", hash: "1", session: "A", agent: "main" }],
    "B",
    [{ path: "src/x.ts", hash: "1" }],
  );
  expect(text).toContain("- Another Claude session: `src/x.ts` (session `A`");
  expect(text).not.toContain("The user");
});

test("a file of this session is sorted as this session", () => {
  const text = whoChanged(
    [{ path: "a.ts", hash: "1", session: "s1", agent: "main" }],
    "s1",
    [{ path: "a.ts", hash: "1" }],
  );
  expect(text).toContain("- This session: `a.ts`.");
});

test("a work tree with no changed file gives no context", () => {
  expect(whoChanged([], "s1", [])).toBeNull();
});

test("`isGitView` matches `git status` and `git diff`, also with options, wrappers, and pipes", () => {
  for (const command of [
    "git status",
    "git diff --stat",
    "git -C sub status --short",
    "git --no-pager diff HEAD",
    "cd x && git status | head",
    "/usr/bin/git diff",
  ])
    expect(isGitView(command)).toBe(true);
});

test("`isGitView` does not match other commands", () => {
  for (const command of [
    "git log",
    "git commit -m status",
    "echo git status",
    "ls",
  ])
    expect(isGitView(command)).toBe(false);
});
