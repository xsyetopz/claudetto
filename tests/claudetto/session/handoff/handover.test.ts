// The rules of the handover (task 6.2 and 6.3, spec `handover`): the case of a turn end, the path of a case, the steps of a path,
// and the handoff text that code builds with no model call.
// The hook lab (`plugins/claudetto/tests/handover.test.ts`) runs the handover path through the hooks module,
// and it cannot swap the path table, so these tests show the other two paths.

import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import { openChange } from "../../../../plugins/claudetto/modules/project/domain/change.ts";
import { passedChecks } from "../../../../plugins/claudetto/modules/project/domain/checks.ts";
import {
  handoffPath,
  withChange,
} from "../../../../plugins/claudetto/modules/session/handoff/compact.ts";
import {
  caseOf,
  decisionsOf,
  groupOf,
  handoverText,
  modelOf,
  optionOf,
  pathOf,
  stepsOf,
  userValuesOf,
} from "../../../../plugins/claudetto/modules/session/handoff/handover.ts";
import {
  HANDOVER_AGE_MS,
  HANDOVER_CONTEXT_TOKENS,
  PATH_TABLE,
  type PathRow,
} from "../../../../plugins/claudetto/modules/session/handoff/limits.ts";
import {
  ASK as ask,
  MESSAGES,
} from "../../../../plugins/claudetto/tests/stubs/messages.ts";

/** The line of `text` that starts with `key`. */
const lineOf = (text: string, key: string): string =>
  text.split("\n").find((line) => line.startsWith(key)) ?? "";

const END = {
  tokens: 1000,
  startedAt: 0,
  now: 1000,
  group: "3",
  before: "3",
};

test("Context Bound", () => {
  expect(caseOf({ ...END, tokens: HANDOVER_CONTEXT_TOKENS + 1 })).toBe(
    "context",
  );
  expect(caseOf({ ...END, tokens: HANDOVER_CONTEXT_TOKENS })).toBeNull();
});

test("Next Task Group", () => {
  expect(caseOf({ ...END, group: "4" })).toBe("group");
  expect(caseOf({ ...END, group: "3" })).toBeNull();
  expect(caseOf({ ...END, before: null, group: "4" })).toBeNull();
  expect(caseOf({ ...END, group: null })).toBeNull();
  expect(groupOf("6.2")).toBe("6");
  expect(groupOf(null)).toBeNull();
});

test("a session older than 8 hours is a case, and one of 8 hours is not", () => {
  expect(caseOf({ ...END, now: HANDOVER_AGE_MS + 1 })).toBe("age");
  expect(caseOf({ ...END, now: HANDOVER_AGE_MS })).toBeNull();
});

const rows = (path: PathRow["path"]): PathRow[] => [
  { case: "context", tokensMax: 200_000, path, model: "sonnet" },
  {
    case: "context",
    tokensMax: Number.POSITIVE_INFINITY,
    path: "handover",
    model: null,
  },
];

test("Cheaper Model Wins: the model column names the model of the first step", () => {
  expect(modelOf("context", 200_000, rows("handover"))).toBe("sonnet");
  expect(modelOf("context", 200_001, rows("handover"))).toBeNull();
  expect(modelOf("idle", 1, rows("handover"))).toBeNull();
});

test("the first step after a handover runs on `haiku` in each case (task 11.7)", () => {
  for (const kind of ["context", "idle", "group", "age"] as const)
    expect(modelOf(kind, 150_001)).toBe("haiku");
});

test("Table Names Handover", () => {
  expect(pathOf("context", 200_000, "auto", rows("handover"))).toBe("handover");
});

test("Table Names Compact", () => {
  expect(pathOf("context", 200_000, "auto", rows("compact"))).toBe("compact");
  expect(stepsOf("compact", false)).toEqual(["compact"]);
});

test("Table Names Both", () => {
  expect(pathOf("context", 200_000, "auto", rows("handoff-then-compact"))).toBe(
    "handoff-then-compact",
  );
  expect(stepsOf("handoff-then-compact", false)).toEqual(["write", "compact"]);
});

test("the first row whose size bound holds the context decides", () => {
  expect(pathOf("context", 200_001, "auto", rows("compact"))).toBe("handover");
});

test("the steps of a handover are the file, `/clear`, and the resume, which holds the held prompt", () => {
  expect(stepsOf("handover", false)).toEqual(["write", "clear", "resume"]);
  expect(stepsOf("handover", true)).toEqual(["write", "clear", "resume"]);
  expect(stepsOf("compact", true)).toEqual(["compact", "held"]);
});

test("Auto: a `group` case up to 75k tokens compacts, and each other case hands over (task 11.6)", () => {
  expect(PATH_TABLE[0]).toMatchObject({ case: "group", tokensMax: 75_000 });
  expect(pathOf("group", 75_000, "auto")).toBe("compact");
  expect(pathOf("group", 75_001, "auto")).toBe("handover");
  for (const kind of ["context", "idle", "age"] as const)
    expect(pathOf(kind, 1, "auto")).toBe("handover");
  expect(pathOf("context", 150_001, undefined)).toBe("handover");
});

test("Handover: the option forces a handover for a case that the table maps to compact", () => {
  expect(pathOf("context", 1, "handover", rows("compact"))).toBe("handover");
});

test("Built-In: the option starts no path", () => {
  expect(pathOf("context", 1, "built-in", rows("compact"))).toBeNull();
});

test("an unknown option value is `auto`", () => {
  expect(optionOf({ compaction: "handoff" })).toBe("auto");
  expect(optionOf({ compaction: "handover" })).toBe("handover");
  expect(optionOf({ compaction: "built-in" })).toBe("built-in");
  expect(optionOf(undefined)).toBe("auto");
});

test("Ruled-Out Option", () => {
  const [decision] = decisionsOf(MESSAGES);
  expect(decision?.question).toBe("Which store?");
  expect(decision?.chosen).toBe("sql");
  expect(decision?.ruledOut).toEqual(["files", "kv"]);
  const text = handoverText(MESSAGES);
  const decided = lineOf(text, "Decisions of the user");
  expect(decided).toContain("Which store?");
  expect(decided).toContain("`sql`");
  const ruledOut = lineOf(text, "Options that the user ruled out");
  expect(ruledOut).toContain("`files`");
  expect(ruledOut).toContain("`kv`");
  expect(ruledOut).not.toContain("`sql`");
});

test("a multi-select answer rules out only the options that the user left", () => {
  const multi = {
    ...ask,
    text: 'User has answered your questions: "Which store?"="sql, kv".',
  };
  const [decision] = decisionsOf([
    { ...MESSAGES[1], toolUses: [multi] } as SessionMessage,
  ]);
  expect(decision?.ruledOut).toEqual(["files"]);
});

test("the values of the user in backticks are in the handoff, and a value of a tool result is not", () => {
  const tool = { ...ask, tool: "Read", text: "Value `from-a-tool`" };
  const messages = [
    ...MESSAGES,
    { role: "assistant", text: "", toolUses: [tool] } as SessionMessage,
  ];
  expect(userValuesOf(messages)).toEqual(["csv"]);
  const values = lineOf(handoverText(messages), "Values of the user");
  expect(values).toContain("`csv`");
  expect(values).not.toContain("from-a-tool");
});

test("a handover has no call of the model: it is a pure text of the messages", () => {
  const text = handoverText(MESSAGES);
  expect(text).toContain("Task: Build the export.");
  expect(text).toContain("> Use `csv`, not JSON.");
});

test("a second handover keeps the first one whole and takes the goal from it, not from a newer refinement", () => {
  const first = handoverText(MESSAGES);
  const resumed: SessionMessage[] = [
    {
      role: "user",
      text: `This is the handoff.\n\n${first}`,
      toolUses: [],
      handle: "r0",
    },
    { role: "user", text: "Next, add `json`.", toolUses: [], handle: "r1" },
  ];
  const second = handoverText(resumed);
  expect(second).toContain("Task: Build the export.");
  expect(lineOf(second, "Options that the user ruled out")).not.toContain("`");
  expect(second).toContain(first);
  expect(userValuesOf(resumed)).toEqual(["json"]);
});

test("the next open task of the change is the task, not a prompt that only read files", () => {
  const read: SessionMessage[] = [
    { role: "user", text: "Read these 6 files.", toolUses: [], handle: "h0" },
  ];
  const text = handoverText(read, "none", "- [ ] 2.1 Add the retry limit");
  expect(text).toContain("Task: 2.1 Add the retry limit");
});

test("a resumed session with no new prompt keeps the task of the earlier handover", () => {
  const first = handoverText(MESSAGES);
  const resumed: SessionMessage[] = [
    {
      role: "user",
      text: `This is the handoff.\n\n${first}`,
      toolUses: [],
      handle: "r0",
    },
  ];
  expect(handoverText(resumed)).toContain("Task: Build the export.");
});

test("Open Change: the path of a handoff is in `.claudetto/handoffs/`, and the header names no change folder file", () => {
  const path = handoffPath(new Date("2026-10-23T10:10:10Z"));
  expect(path).toBe(".claudetto/handoffs/handoff-20261023T101010Z.md");
  const change = openChange([
    { name: "release-0-3-0-alpha-2", tasks: "- [x] 3.1 A\n- [ ] 3.2 B\n" },
  ]);
  expect(path).not.toContain("openspec/changes");
  expect(withChange("- Next.\n", change)).not.toContain("handoff.md");
});

test("Box with No Check Is Open", () => {
  const change = openChange([
    { name: "c", tasks: "- [x] 6.1 A\n- [ ] 6.2 B\n" },
  ]);
  const none = withChange("- Next.\n", change, passedChecks(MESSAGES));
  expect(lineOf(none, "Open tasks")).toContain("`6.1`");
  expect(lineOf(none, "Done tasks")).not.toContain("`6.1`");
  const bash = {
    role: "assistant" as const,
    text: "",
    toolUses: [
      {
        tool_use_id: "b",
        tool: "Bash",
        input: { command: "just lab" },
        text: "ok",
      },
    ],
  };
  const passed = withChange("- Next.\n", change, passedChecks([bash]));
  expect(lineOf(passed, "Done tasks")).toContain("`6.1`");
  expect(lineOf(passed, "Open tasks")).not.toContain("`6.1`");
});

const command = (name: string, args = ""): SessionMessage => ({
  role: "user",
  text: `<command-name>/${name}</command-name>\n            <command-message>${name}</command-message>\n            <command-args>${args}</command-args>`,
  toolUses: [],
  handle: name,
});

test("Command Prompt: a command with no arguments is no task, and a command with arguments is `/name args`", () => {
  const caveat: SessionMessage = {
    role: "user",
    text: "<local-command-caveat>Caveat: the command below ran locally.</local-command-caveat>",
    toolUses: [],
    handle: "c0",
  };
  const after = [caveat, command("clear"), ...MESSAGES];
  expect(handoverText(after)).toContain("Task: Build the export.");
  expect(handoverText(after)).not.toContain("command-name");
  expect(handoverText([command("claudetto:apply", "2.1")])).toContain(
    "Task: /claudetto:apply 2.1",
  );
});

test("a resumed handoff whose task is a command takes the task from the next prompt, not from the command", () => {
  const bad = handoverText([command("clear")]).replace(
    /^Task: .*$/m,
    "Task: <command-name>/clear</command-name>",
  );
  const resumed: SessionMessage[] = [
    {
      role: "user",
      text: `This is the handoff.\n\n${bad}`,
      toolUses: [],
      handle: "r0",
    },
    { role: "user", text: "Fix the handoff task.", toolUses: [], handle: "r1" },
  ];
  const text = handoverText(resumed);
  expect(text).toContain("Task: Fix the handoff task.");
  expect(text).toContain(bad);
});
