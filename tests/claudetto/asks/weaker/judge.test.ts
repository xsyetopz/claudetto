// The test judge (package P36): a small model reads the lines that a call adds to a test file that exists.
// The judge only makes a verdict stricter, and a reply that is not a verdict asks.
// The model call is a stub, and no file is read.

import { expect, test } from "bun:test";
import {
  marked,
  parseVerdict,
  type Reply,
  remembered,
} from "../../../../plugins/claudetto/slices/asks/domain/testjudge.ts";
import {
  TEST_JUDGE_CONTEXT_LINES,
  TEST_JUDGE_MAX_CHARS,
  TEST_JUDGE_WHY_MAX_CHARS,
} from "../../../../plugins/claudetto/slices/asks/limits.ts";
import { edit, judgedCall, write } from "../calls.ts";

const FILE = "/w/tests/a.test.ts";
const SRC = 'test("a", () => {\n  expect(f()).toBe(1);\n});\n';
const ONE = "  expect(f()).toBe(1);\n";
const ADD = `${ONE}  expect(f(2)).toBe(2);\n`;
const NEW_FILE_HINT = "A new test in a new test file needs no check";

const run = (reply: Parameters<typeof judgedCall>[2]) =>
  judgedCall(edit(FILE, ONE, ADD), { [FILE]: SRC }, reply);

test("a `weaker: false` reply gives no ask", async () => {
  const { reason, prompts } = await run({ text: '{"weaker":false}' });
  expect(prompts.length).toBe(1);
  expect(reason).toBeUndefined();
});

test("a reply with no answer asks with the cause and the hint for a new file", async () => {
  const { reason } = await run({ cause: "timeout after 15000 ms" });
  expect(reason).toContain("timeout after 15000 ms");
  expect(reason).toContain(NEW_FILE_HINT);
});

test("a reply that is not JSON asks", async () => {
  const { reason } = await run({ text: "It looks fine." });
  expect(reason).toContain("the reply is not a verdict");
});

test("a `weaker: true` reply asks with the line and a cut reason", async () => {
  const why = "w".repeat(TEST_JUDGE_WHY_MAX_CHARS + 50);
  const text = JSON.stringify({ weaker: true, line: "return;", why });
  const { reason } = await run({ text });
  expect(reason).toContain("return;");
  expect(reason).toContain(`${"w".repeat(TEST_JUDGE_WHY_MAX_CHARS)}…`);
  expect(reason).not.toContain("w".repeat(TEST_JUDGE_WHY_MAX_CHARS + 1));
});

test("a text over the bound asks with no model call", async () => {
  const now = `${SRC}const v = [\n${"  1,\n".repeat(TEST_JUDGE_MAX_CHARS / 4)}];\n`;
  const { reason, prompts } = await judgedCall(
    write(FILE, now),
    { [FILE]: SRC },
    { text: '{"weaker":false}' },
  );
  expect(prompts.length).toBe(0);
  expect(reason).toContain(`over ${TEST_JUDGE_MAX_CHARS} characters`);
});

test("a move, a rename, and a format change make no model call", async () => {
  const two = `${SRC}test("b", () => {\n  expect(g()).toBe(2);\n});\n`;
  const moved = `test("b", () => {\n  expect(g()).toBe(2);\n});\n${SRC}`;
  for (const [text, payload] of [
    [two, write(FILE, moved)],
    [SRC, edit(FILE, 'test("a"', 'test("a is one"')],
    [SRC, edit(FILE, "expect(f()).toBe(1)", "expect( f() ).toBe( 1 )")],
  ] as const) {
    const { reason, prompts } = await judgedCall(payload, { [FILE]: text });
    expect(prompts.length).toBe(0);
    expect(reason).toBeUndefined();
  }
});

test("a new test file makes no model call", async () => {
  const { reason, prompts } = await judgedCall(
    write("/w/tests/new.test.ts", SRC),
    {},
  );
  expect(prompts.length).toBe(0);
  expect(reason).toBeUndefined();
});

test("a lost line asks from the diff with no model call", async () => {
  const { reason, prompts } = await judgedCall(edit(FILE, ONE, "  return;\n"), {
    [FILE]: SRC,
  });
  expect(prompts.length).toBe(0);
  expect(reason).toContain("expect(f()).toBe(1);");
});

test("a file that is not a test makes no model call", async () => {
  const file = "/w/src/a.ts";
  const { prompts } = await judgedCall(edit(file, ONE, ADD), { [file]: SRC });
  expect(prompts.length).toBe(0);
});

test("`marked` puts `+` before each added line", () => {
  expect(marked("a\nb\n", "a\nx\nb\n")).toBe("  a\n+ x\n  b\n  ");
});

test("`marked` cuts the lines far from each added line when the text is long", () => {
  const lines = Array.from(
    { length: 2000 },
    (_, i) => `line ${i} ${"y".repeat(20)}`,
  );
  const before = lines.join("\n");
  const after = [...lines.slice(0, 1000), "added", ...lines.slice(1000)].join(
    "\n",
  );
  const out = marked(before, after);
  expect(out.length).toBeLessThan(TEST_JUDGE_MAX_CHARS);
  expect(out).toContain("+ added");
  expect(out).toContain(`[… ${1000 - TEST_JUDGE_CONTEXT_LINES} lines …]`);
  expect(out.split("\n").length).toBe(2 * TEST_JUDGE_CONTEXT_LINES + 3);
});

test("`parseVerdict` reads JSON in a text and refuses a verdict with no line or no reason", () => {
  expect(parseVerdict('Here: {"weaker":false} done')).toEqual({
    weaker: false,
  });
  expect(parseVerdict('{"weaker":true,"line":" a ","why":" b "}')).toEqual({
    weaker: true,
    line: "a",
    why: "b",
  });
  for (const text of [
    "",
    "{",
    "} {",
    "null",
    '{"weaker":"no"}',
    '{"weaker":true,"line":"a"}',
    '{"weaker":true,"why":"b"}',
    '{"weaker":true,"line":"","why":"b"}',
  ])
    expect(parseVerdict(text)).toBeUndefined();
});

test("`remembered` makes one model call for a repeat of a verdict, and keeps no reply that is not a verdict", async () => {
  const calls: string[] = [];
  const replies: Record<string, Reply> = {
    a: { text: '{"weaker":false}' },
    b: { text: "fine" },
    c: { cause: "timeout after 15000 ms" },
  };
  const complete = remembered(
    async ({ prompt }) => {
      calls.push(prompt);
      return replies[prompt] as Reply;
    },
    new Map(),
    64,
  );
  for (const prompt of ["a", "a", "b", "b", "c", "c"])
    await complete({ system: "s", prompt });
  expect(calls).toEqual(["a", "b", "b", "c", "c"]);
});

test("`remembered` drops the oldest verdict when it keeps `max` verdicts", async () => {
  const calls: string[] = [];
  const kept = new Map<string, Reply>();
  const complete = remembered(
    async ({ prompt }) => {
      calls.push(prompt);
      return { text: '{"weaker":false}' };
    },
    kept,
    2,
  );
  for (const prompt of ["a", "b", "c", "a"])
    await complete({ system: "s", prompt });
  expect(calls).toEqual(["a", "b", "c", "a"]);
  expect(kept.size).toBe(2);
});
