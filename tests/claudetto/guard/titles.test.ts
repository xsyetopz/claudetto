// Tests of the `Monitor` state and the `gh` title reader of the `guard` slice (task 10.4 and task 10.11).
// The tests give commands as strings and run none.

import { expect, test } from "bun:test";
import { fixTitles } from "../../../plugins/claudetto/slices/guard/domain/ghtitle.ts";
import {
  keepWatches,
  monitorIds,
  runningTask,
  withWatch,
} from "../../../plugins/claudetto/slices/guard/domain/monitors.ts";

test("a task runs until its deadline, and a task with no timeout runs until it is dropped", () => {
  const timed = withWatch({}, "tail -f a", "b1", 1_000, 5_000);
  expect(runningTask(timed, "tail -f a", 5_999)).toBe("b1");
  expect(runningTask(timed, "tail -f a", 6_000)).toBeUndefined();
  const open = withWatch({}, "tail -f a", "b2", 1_000, 0);
  expect(runningTask(open, "tail -f a", 9_999_999)).toBe("b2");
  expect(runningTask(open, "tail -f b", 1_000)).toBeUndefined();
});

test("a command named like an object key is no running task", () => {
  expect(runningTask({}, "constructor", 0)).toBeUndefined();
  expect(runningTask({}, "__proto__", 0)).toBeUndefined();
});

test("the running set keeps the entries of the `monitor` tasks of a `Stop`", () => {
  const watches = withWatch(withWatch({}, "a", "b1", 0, 0), "b", "b2", 0, 0);
  const live = monitorIds([
    { id: "b2", type: "monitor" },
    { id: "b1", type: "shell" },
  ]);
  expect(Object.keys(keepWatches(watches, (id) => live.has(id)))).toStrictEqual(
    ["b"],
  );
});

test("`--title` and `-t` of `gh pr create` and `gh issue create` get the Title Case", () => {
  expect(fixTitles('gh pr create --title "fix a bug in the parser"')).toBe(
    'gh pr create --title "Fix a Bug in the Parser"',
  );
  expect(fixTitles("gh issue create -t 'add `tool.call` hook'")).toBe(
    "gh issue create -t 'Add `tool.call` Hook'",
  );
  expect(fixTitles("gh pr create --title=fix-the-thing --draft")).toBe(
    "gh pr create --title=Fix-the-Thing --draft",
  );
  expect(fixTitles("cd /p && gh pr create -t 'a b' --body x")).toBe(
    "cd /p && gh pr create -t 'A B' --body x",
  );
});

test("a title in the right case, a title the shell expands, and another command stay as typed", () => {
  for (const command of [
    'gh pr create --title "Fix a Bug in the Parser"',
    'gh pr create --title "fix $(date)"',
    'gh pr create --title "fix `date`"',
    'gh pr create --title "$TITLE"',
    "gh pr list --title 'fix a bug'",
    "gh pr create --body 'fix -t a bug'",
    "ls -t 'old files' && gh pr create --body x",
    "git commit -m 'fix a bug'",
  ])
    expect(fixTitles(command)).toBeUndefined();
});

test("a body with a heredoc keeps its text", () => {
  const body = "--body \"$(cat <<'EOF'\n- t not a title\nEOF\n)\"";
  expect(fixTitles(`gh pr create --title 'add a thing' ${body}`)).toBe(
    `gh pr create --title 'Add a Thing' ${body}`,
  );
});
