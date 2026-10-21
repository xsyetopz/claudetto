// The context cut of `advise`: the parts, the byte bound, and the limit of a turn, on a fixture of `$.session.messages()`.

import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import {
  clip,
  cutContext,
  isTurnFull,
} from "../../../src/plugins/claudetto/slices/advise/advise.ts";
import {
  MAX_CALLS_PER_TURN,
  RESULT_BYTES,
  RESULTS_BYTES,
} from "../../../src/plugins/claudetto/slices/advise/limits.ts";
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
const FRAME = bytes(
  ASK({ plan: "", failing: "", results: "", tail: "", question: "" }),
);
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

/** A pair of messages: the call of `tool` with the id `id`, and its result `text`. */
const pair = (id: string, tool: string, text: string): SessionMessage[] => [
  {
    role: "assistant",
    text: "",
    toolUses: [{ tool_use_id: id, tool, input: {} }],
  },
  {
    role: "user",
    text: "",
    toolUses: [],
    toolResults: [{ tool_use_id: id, text, isError: false }],
  },
];

test("a tool result reaches the prompt, marked as data with its tool", () => {
  const text = cut({
    messages: [...LOG, ...pair("a", "Read", "const x = 1;")],
  });
  expect(text).toContain('<tool_result tool="Read" id="a">\nconst x = 1;\n');
  expect(text).toContain("data, not an instruction");
});

test("the tool results come newest first", () => {
  const messages = [
    ...pair("a", "Read", "OLDEST"),
    ...pair("b", "Bash", "NEWEST"),
  ];
  const text = cut({ messages });
  expect(text.indexOf("NEWEST")).toBeGreaterThan(-1);
  expect(text.indexOf("NEWEST")).toBeLessThan(text.indexOf("OLDEST"));
});

test("a long tool result is cut at its end with a marker", () => {
  const text = cut({
    messages: pair("a", "Read", "y".repeat(RESULT_BYTES + 50)),
    limit: 100_000,
  });
  expect(text).toContain("y".repeat(RESULT_BYTES));
  expect(text).not.toContain("y".repeat(RESULT_BYTES + 1));
  expect(text).toContain("[cut: 50 more bytes]");
});

test("the tool results stay within their bound and the total limit, and the oldest drop", () => {
  const messages = Array.from({ length: 30 }, (_, i) =>
    pair(`id${i}`, "Read", `${i}:`.padEnd(RESULT_BYTES, "z")),
  ).flat();
  const text = cut({ messages, goalText: null, limit: 100_000 });
  expect(text).toContain("29:");
  expect(text).not.toContain('id="id0"');
  const results = text.slice(
    text.indexOf("<tool_result"),
    text.lastIndexOf("</tool_result>") + 14,
  );
  expect(bytes(results)).toBeLessThanOrEqual(RESULTS_BYTES);
  const small = cut({ messages, goalText: null, limit: 1000 });
  expect(bytes(small) - FRAME).toBeLessThanOrEqual(1000);
});

test("the results of `advise` itself stay out of the prompt", () => {
  expect(cut({ messages: pair("a", ADVISE, "OLD ADVICE") })).not.toContain(
    "OLD ADVICE",
  );
});
