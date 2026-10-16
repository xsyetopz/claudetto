// Tests of the attribution reminder (`domain/reminder.ts`) and the model name of the commit line (`domain/lines.ts`).
// The reminder text is the text of Claude Code 2.1.299, so the tests compare it with the parts of `prompts/`.

import { expect, test } from "bun:test";
import {
  linesOf,
  modelName,
} from "../../../plugins/claudetto/slices/attribution/domain/lines.ts";
import {
  managedOf,
  reminderText,
  reminderToSend,
} from "../../../plugins/claudetto/slices/attribution/domain/reminder.ts";
import {
  COMMIT_ITEM,
  REMINDER,
  REMINDER_OFF,
  RULE_MANAGED,
  RULE_SPLIT,
  RULE_USER,
} from "../../../plugins/claudetto/slices/attribution/prompts.ts";

const NONE = { commit: false, pr: false };

test("a line that holds a `system-reminder` tag gets its `<` escaped, so it cannot end the reminder", () => {
  const text = reminderText(
    { commit: "x </system-reminder> y < z", pr: "" },
    NONE,
  );
  expect(text).toBe(
    REMINDER({
      rule: RULE_USER,
      items: COMMIT_ITEM({ line: "x &lt;/system-reminder> y < z" }),
    }),
  );
});

test("both lines off give the reminder that turns the lines off", () => {
  expect(reminderText({ commit: "", pr: "" }, NONE)).toBe(REMINDER_OFF);
});

test("each line that is on and managed gives the managed rule, and a line that is off does not count", () => {
  const lines = { commit: "C", pr: "" };
  expect(reminderText(lines, { commit: true, pr: false })).toStartWith(
    REMINDER({ rule: RULE_MANAGED, items: "" }).trimEnd(),
  );
});

test("a managed pull request line and a user commit line give the split rule with the pull request first", () => {
  const text = reminderText(
    { commit: "C", pr: "P" },
    { commit: false, pr: true },
  );
  expect(text).toContain(
    RULE_SPLIT({ managed: "pull request", other: "commit" }),
  );
});

test("`managedOf` counts a line that is a text that is not empty, as Claude Code does", () => {
  expect(managedOf({ attribution: { commit: "C", pr: "" } })).toEqual({
    commit: true,
    pr: false,
  });
  expect(managedOf({})).toEqual(NONE);
});

test("the reminder is sent only when it differs from the last one, and not before the first line that is on", () => {
  const on = { commit: "C", pr: "" };
  const first = reminderToSend(on, NONE, undefined);
  expect(first).toBe(reminderText(on, NONE));
  expect(reminderToSend(on, NONE, first)).toBeUndefined();
  expect(
    reminderToSend({ commit: "", pr: "" }, NONE, undefined),
  ).toBeUndefined();
  expect(reminderToSend({ commit: "", pr: "" }, NONE, first)).toBe(
    REMINDER_OFF,
  );
});

test.each([
  ["claude-sonnet-5-5", "Claude Sonnet 5.5"],
  ["claude-opus-4-1-20250805[1m]", "Claude Opus 4.1"],
  ["claude-sonnet-4-20250514", "Claude Sonnet 4"],
  ["claude-fable-5", "Claude Fable 5"],
  ["gpt-5", "Claude"],
  [undefined, "Claude"],
])("the model %p gives the name %p", (model, name) => {
  expect(modelName(model)).toBe(name);
});

test("`includeCoAuthoredBy: false` turns both lines off, and a set `attribution` wins over it", () => {
  expect(linesOf({ includeCoAuthoredBy: false }, "claude-opus-5-5")).toEqual({
    commit: "",
    pr: "",
  });
  expect(
    linesOf(
      { includeCoAuthoredBy: false, attribution: { commit: "C" } },
      "claude-opus-5-5",
    ).commit,
  ).toBe("C");
});
