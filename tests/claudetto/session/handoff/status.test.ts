// The status of a handoff comes from checks, not from the model text (task 3.12, D48).
// The done list holds only the checked tasks of `tasks.md` with a passed check of the task.
// A checked box with no passed check of its task is open (task 6.2, "Box with No Check Is Open").

import { expect, test } from "bun:test";
import { openChange } from "../../../../plugins/claudetto/modules/project/domain/change.ts";
import {
  passedChecks,
  taskLines,
} from "../../../../plugins/claudetto/modules/project/domain/checks.ts";
import { withChange } from "../../../../plugins/claudetto/modules/session/handoff/compact.ts";

/** The line of `text` that starts with `key`. */
const lineOf = (text: string, key: string): string =>
  text.split("\n").find((line) => line.startsWith(key)) ?? "";

const TASK_ID = /`\d+\.\d+`/;
const OPEN = "Open tasks";
const DONE = "Done tasks";
const PASSED = "Passed checks";

const change = openChange([
  {
    name: "add-export",
    tasks:
      "- [x] 1.1 First\n- [ ] 1.2 Second\n- [x] 1.3 Third\n- [ ] 1.4 Fourth\n",
  },
]);

test("Box with No Check Is Open", () => {
  const text = withChange("- Next.\n", change);
  expect(lineOf(text, OPEN)).toContain("`1.1`");
  expect(lineOf(text, OPEN)).toContain("`1.3`");
  expect(lineOf(text, DONE)).not.toMatch(TASK_ID);
});

test("a checked box with a passed check is done", () => {
  const text = withChange("- Next.\n", change, ["just lab"]);
  expect(lineOf(text, DONE)).toContain("`1.1`");
  expect(lineOf(text, DONE)).toContain("`1.3`");
  expect(lineOf(text, OPEN)).not.toMatch(TASK_ID);
});

test("a task line that names a check needs that check, and a line that names none needs any passed check", () => {
  const tasks =
    "- [x] 2.1 Add the gate. Verify: `just lab`.\n- [x] 2.2 Add the doc.\n- [ ] 2.3 Next\n";
  const named = openChange([{ name: "c", tasks }]);
  const lines = taskLines(tasks);
  const other = withChange("- Next.\n", named, ["just check"], lines);
  expect(lineOf(other, OPEN)).toContain("`2.1`");
  expect(lineOf(other, DONE)).toContain("`2.2`");
  expect(lineOf(other, DONE)).not.toContain("`2.1`");
  const same = withChange("- Next.\n", named, ["just lab"], lines);
  expect(lineOf(same, OPEN)).not.toMatch(TASK_ID);
  expect(lineOf(same, DONE)).toContain("`2.1`");
  expect(lineOf(same, DONE)).toContain("`2.2`");
  const longer = withChange("- Next.\n", named, ["just lab x"], lines);
  expect(lineOf(longer, OPEN)).not.toMatch(TASK_ID);
});

const bash = (id: string, command: string, isError?: true) => ({
  role: "assistant" as const,
  text: "All checks pass, the work is DONE.",
  toolUses: [
    {
      tool_use_id: id,
      tool: "Bash",
      input: { command },
      text: "out",
      ...(isError ? { isError } : {}),
    },
  ],
});

test("the done list holds only checks that passed, not a claim of the model", () => {
  const checks = passedChecks([
    bash("a", "just test tests/x.test.ts"),
    bash("b", "just lab", true),
    bash("c", "just check || true"),
    { role: "assistant", text: "just check passes", toolUses: [] },
  ]);
  expect(checks).toEqual(["just test tests/x.test.ts"]);
  const text = withChange("- Next.\n", change, checks);
  expect(lineOf(text, PASSED)).toContain("`just test tests/x.test.ts`");
  expect(text).not.toContain("`just lab`");
});

test("a later failure of a check removes its earlier pass", () => {
  const checks = passedChecks([
    bash("a", "just check"),
    bash("b", "just check", true),
  ]);
  expect(checks).toEqual([]);
  expect(lineOf(withChange("- Next.\n", change, checks), PASSED)).not.toContain(
    "`",
  );
});

test("with no open change, the passed checks still show", () => {
  expect(
    lineOf(withChange("- Next.\n", null, ["just check"]), PASSED),
  ).toContain("`just check`");
  expect(withChange("- Next.\n", null)).toBe("- Next.\n");
});
