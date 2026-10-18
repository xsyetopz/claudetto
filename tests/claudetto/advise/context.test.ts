// The context cut of `advise`: the parts, the byte bound, and the limit of a turn, on a fixture of `$.session.messages()`.

import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import {
  clip,
  cutContext,
  isTurnFull,
} from "../../../src/plugins/claudetto/slices/advise/domain/advise.ts";
import { MAX_CALLS_PER_TURN } from "../../../src/plugins/claudetto/slices/advise/limits.ts";
import { ASK } from "../../../src/plugins/claudetto/slices/advise/prompts.ts";

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

const GOAL = JSON.stringify({
  steps: [{ title: "build" }, { title: "ship" }],
  step: 1,
  results: [
    { pass: true, output: "fine" },
    { pass: false, output: "error: boom\n" },
  ],
});
const LOG = [
  msg("user", "fix it"),
  msg("assistant", "trying", ["Bash"]),
  msg("user", ""),
];
const bytes = (text: string) => new TextEncoder().encode(text).length;
/** The bytes of the template with no content, which the bound does not count. */
const FRAME = bytes(ASK({ plan: "", failing: "", tail: "", question: "" }));
const cut = (over: Record<string, unknown>) =>
  cutContext({
    question: "Why?",
    messages: LOG,
    goalText: GOAL,
    limit: 1000,
    ...over,
  });

test("the prompt holds the question, the plan, the failing checks, and the conversation", () => {
  const text = cut({ question: " Why? " });
  expect(text).toContain("- 1. build\n> 2. ship");
  expect(text).toContain("Check 2: error: boom");
  expect(text).toContain("user: fix it\nassistant: trying [Bash]");
  expect(text.endsWith("Why?")).toBe(true);
});

test("with no goal, the plan and the failing checks are empty", () => {
  expect(cut({ goalText: "nope" })).not.toContain("Check");
  expect(cut({ goalText: null })).not.toContain("build");
});

test("the tail keeps the newest messages within the byte bound", () => {
  const messages = [msg("user", "old".repeat(100)), msg("assistant", "new")];
  const text = cut({ messages, goalText: null, limit: 40 });
  expect(text).toContain("assistant: new");
  expect(text).not.toContain("old");
});

test("a multi-byte tail, a multi-byte question, and a long failing output stay within the limit", () => {
  const long = JSON.stringify({
    steps: [{ title: "build" }],
    step: 0,
    results: [{ pass: false, output: "x".repeat(5000) }],
  });
  for (const over of [
    { messages: [msg("user", "é€😀".repeat(200))], goalText: null },
    { question: "😀é€".repeat(200), goalText: null },
    { goalText: long },
  ]) {
    expect(bytes(cut({ ...over, limit: 1000 })) - FRAME).toBeLessThanOrEqual(
      1000,
    );
  }
});

test("a cut drops the character that it splits", () => {
  expect(clip("a😀", 3)).toBe("a");
  expect(clip("😀a", 3, true)).toBe("a");
  expect(clip("abc", 10)).toBe("abc");
  expect(clip("abc", 0)).toBe("");
});

const ADVISE = "mcp__claudetto__advise";

test("the calls of a turn are counted from the last message of the user with text", () => {
  const calls = Array.from({ length: MAX_CALLS_PER_TURN }, () =>
    msg("assistant", "", [ADVISE]),
  );
  expect(isTurnFull([msg("user", "go"), ...calls.slice(1)], "x")).toBe(false);
  expect(isTurnFull([msg("user", "go"), ...calls], "x")).toBe(true);
  expect(isTurnFull([...calls, msg("user", "go")], "x")).toBe(false);
});
