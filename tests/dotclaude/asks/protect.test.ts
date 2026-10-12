// The ask for a test file or a limits file (design D34, cases S1 and A4): only a call that changes or removes an existing line asks.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import type {
  Payload,
  ToolInput,
} from "../../../plugins/dotclaude/slices/asks/domain/text.ts";
import { filesByPath } from "./stub-fs.ts";
import type { Verdict } from "./verdicts.ts";
import { decideAsk as decide } from "./verdicts.ts";

/** The `hookSpecificOutput` of an ask, as `decide` gives it. */
type Ask = Verdict["hookSpecificOutput"];

/** The `hookSpecificOutput` fields that the `ask` tests read. */

const CWD = "/w";
const io = (files: Record<string, string> = {}) => ({
  ...filesByPath(files),
});
const call = (tool_name: string, tool_input: ToolInput): Payload => ({
  tool_name,
  cwd: CWD,
  tool_input,
});
const out = async (payload: Payload, i = io()): Promise<Ask | undefined> =>
  (await decide(payload, {}, i))?.hookSpecificOutput;

for (const file of [
  "/w/tests/a.mjs",
  "/w/src/a.test.mjs",
  "/w/src/a.spec.ts",
  "/w/pkg/__tests__/a.js",
  "/w/test/a.py",
  "/w/plugins/x/limits.mjs",
  "/w/plugins/x/lib/budget.ts",
  "/w/limits.json",
]) {
  test(`an \`Edit\` of the existing file \`${file}\` gets an ask`, async () => {
    const o = await out(
      call("Edit", {
        file_path: file,
        old_string: "const a = 1;",
        new_string: "const a = 2;",
      }),
      io({ [file]: "const a = 1;" }),
    );
    expect(o?.permissionDecision).toBe("ask");
    expect(typeof o?.permissionDecisionReason).toBe("string");
  });
}

for (const file of [
  "/w/src/a.mjs",
  "/w/src/contest.mjs",
  "/w/src/latest/a.mjs",
  "/w/src/limits-helper.mjs",
  "/w/docs/tests.md",
]) {
  test(`an \`Edit\` of the existing file \`${file}\` gets no ask`, async () => {
    const o = await out(
      call("Edit", { file_path: file, old_string: "a", new_string: "b" }),
      io({ [file]: "a" }),
    );
    expect(o).toBe(undefined);
  });
}

const TESTS = "/w/tests/a.test.mjs";
const TEST_SRC = 'test("a", () => {\n  expect(f()).toBe(1);\n});\n';
const LIMITS = "/w/plugins/x/limits.mjs";
const LIMITS_SRC = "// The bounds.\nexport const A_MAX = 10;\n";
const edit = (file: string, old_string: string, new_string: string) =>
  call("Edit", { file_path: file, old_string, new_string });

test("an added test case in an existing test file gets no ask", async () => {
  const add = 'test("b", () => {\n  expect(g()).toBe(2);\n});\n';
  const files = io({ [TESTS]: TEST_SRC });
  expect(await out(edit(TESTS, "", add), files)).toBe(undefined);
  expect(await out(edit(TESTS, "});\n", `});\n\n${add}`), files)).toBe(
    undefined,
  );
  expect(
    await out(
      call("Write", { file_path: TESTS, content: `${TEST_SRC}\n${add}` }),
      files,
    ),
  ).toBe(undefined);
});

test("a changed `expect` line gets an ask that names the old and the new line", async () => {
  const o = await out(
    edit(TESTS, "toBe(1)", "toBe(2)"),
    io({ [TESTS]: TEST_SRC }),
  );
  expect(o?.permissionDecision).toBe("ask");
  expect(
    o?.permissionDecisionReason?.includes("`expect(f()).toBe(1);`"),
    o?.permissionDecisionReason,
  ).toBeTruthy();
  expect(
    o?.permissionDecisionReason?.includes("`expect(f()).toBe(2);`"),
    o?.permissionDecisionReason,
  ).toBeTruthy();
});

test("a deleted test gets an ask", async () => {
  const o = await out(edit(TESTS, TEST_SRC, ""), io({ [TESTS]: TEST_SRC }));
  expect(o?.permissionDecision).toBe("ask");
  expect(typeof o?.permissionDecisionReason).toBe("string");
});

test("a long changed line is cut in the reason", async () => {
  const long = `expect(${"x".repeat(200)}).toBe(1);`;
  const o = await out(edit(TESTS, "a", "b"), io({ [TESTS]: `${long}\n` }));
  expect(o).toBe(undefined);
  const w = call("Write", { file_path: TESTS, content: "other\n" });
  const reason = (await out(w, io({ [TESTS]: `${long}\n` })))
    ?.permissionDecisionReason;
  expect(reason?.includes("..."), reason).toBeTruthy();
  expect(!reason?.includes("x".repeat(100)), reason).toBeTruthy();
});

test("an added constant in a limits file gets no ask", async () => {
  const files = io({ [LIMITS]: LIMITS_SRC });
  const add = "/** More. */\nexport const B_MAX = 5;\n";
  expect(await out(edit(LIMITS, "", add), files)).toBe(undefined);
  expect(
    await out(
      call("Write", { file_path: LIMITS, content: `${LIMITS_SRC}\n${add}` }),
      files,
    ),
  ).toBe(undefined);
});

test("a changed number in a limits file gets an ask, and a changed comment does not", async () => {
  const files = io({ [LIMITS]: LIMITS_SRC });
  const o = await out(edit(LIMITS, "= 10;", "= 20;"), files);
  expect(o?.permissionDecision).toBe("ask");
  expect(
    o?.permissionDecisionReason?.includes("`export const A_MAX = 10;`"),
    o?.permissionDecisionReason,
  ).toBeTruthy();
  expect(
    o?.permissionDecisionReason?.includes("`export const A_MAX = 20;`"),
    o?.permissionDecisionReason,
  ).toBeTruthy();
  expect(await out(edit(LIMITS, "The bounds.", "The limits."), files)).toBe(
    undefined,
  );
});

test("a removed constant in a limits file gets an ask", async () => {
  const o = await out(
    edit(LIMITS, "export const A_MAX = 10;\n", ""),
    io({ [LIMITS]: LIMITS_SRC }),
  );
  expect(o?.permissionDecision).toBe("ask");
});

test("a `Write` of a new test file gets no ask, and a `Write` over an old one does", async () => {
  const file = "/w/tests/new.test.mjs";
  const w = call("Write", { file_path: file, content: "x" });
  expect(await out(w)).toBe(undefined);
  expect((await out(w, io({ [file]: "old" })))?.permissionDecision).toBe("ask");
});

test("a `MultiEdit` of an existing test file gets an ask", async () => {
  const file = "/w/tests/a.test.mjs";
  const m = call("MultiEdit", {
    file_path: file,
    edits: [{ old_string: "a", new_string: "b" }],
  });
  expect((await out(m, io({ [file]: "a" })))?.permissionDecision).toBe("ask");
});
