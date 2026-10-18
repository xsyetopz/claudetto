// The context cut of `advise`: the parts, the byte bound, and the call counts, on a fixture of `$.session.messages()`.

import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import { refusal } from "../../../src/plugins/claudetto/slices/advise/domain/calls.ts";
import {
  cutContext,
  readGoal,
} from "../../../src/plugins/claudetto/slices/advise/domain/context.ts";
import {
  MAX_CALLS_PER_SESSION,
  MAX_CALLS_PER_TURN,
} from "../../../src/plugins/claudetto/slices/advise/limits.ts";

const msg = (
  role: "user" | "assistant",
  text: string,
  tools: string[] = [],
): SessionMessage => ({
  role,
  text,
  toolUses: tools.map((tool, i) => ({
    tool_use_id: `${text}${i}`,
    tool,
    input: {},
  })),
});

const GOAL = readGoal(
  JSON.stringify({
    steps: [
      { title: "build", checks: [] },
      { title: "ship", checks: [] },
    ],
    step: 1,
    results: [
      { pass: true, output: "fine" },
      { pass: false, output: "error: boom\n" },
    ],
  }),
);
const LOG = [
  msg("user", "fix it"),
  msg("assistant", "trying", ["Bash"]),
  msg("user", ""),
];

test("the context holds the question, the plan, the failing checks, and the conversation", () => {
  const cut = cutContext({
    question: " Why? ",
    messages: LOG,
    goal: GOAL,
    limit: 1000,
  });
  expect(cut.question).toBe("Why?");
  expect(cut.plan).toBe("- 1. build\n> 2. ship");
  expect(cut.failing).toBe("Check 2: error: boom");
  expect(cut.tail).toBe("user: fix it\nassistant: trying [Bash]");
});

test("with no goal, the plan and the failing checks are empty", () => {
  const cut = cutContext({
    question: "Why?",
    messages: LOG,
    goal: readGoal("nope"),
    limit: 1000,
  });
  expect([cut.plan, cut.failing]).toEqual(["", ""]);
});

test("the tail keeps the newest messages within the byte bound", () => {
  const messages = [msg("user", "old".repeat(100)), msg("assistant", "new")];
  const cut = cutContext({
    question: "Q",
    messages,
    goal: undefined,
    limit: 40,
  });
  expect(cut.tail).toBe("assistant: new");
  const total = cut.question.length + cut.tail.length;
  expect(total).toBeLessThanOrEqual(40);
});

test("a message longer than the room is cut at its start", () => {
  const cut = cutContext({
    question: "Q",
    messages: [msg("user", "a".repeat(100))],
    goal: undefined,
    limit: 11,
  });
  expect(cut.tail).toBe("a".repeat(10));
});

const ADVISE = "mcp__claudetto__advise";

test("the calls of a turn are counted from the last message of the user with text", () => {
  const calls = Array.from({ length: MAX_CALLS_PER_TURN }, () =>
    msg("assistant", "", [ADVISE]),
  );
  expect(refusal([msg("user", "go"), ...calls.slice(1)], "x")).toBeUndefined();
  expect(refusal([msg("user", "go"), ...calls], "x")).toContain("this turn");
  expect(refusal([...calls, msg("user", "go")], "x")).toBeUndefined();
});

test("the calls of a session are counted over all turns", () => {
  const turn = [msg("user", "go"), msg("assistant", "", [ADVISE])];
  const log = Array.from({ length: MAX_CALLS_PER_SESSION }, () => turn).flat();
  expect(refusal(log, "x")).toContain("this session");
});
