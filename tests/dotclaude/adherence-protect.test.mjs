// The ask for a test file or a limits file (design D34, cases S1 and A4): only a call that changes or removes an existing line asks.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import { decide } from "../../plugins/dotclaude/features/adherence/cli.mjs";

const CWD = "/w";
const io = (files = {}) => ({
  read: (f) => files[f] ?? null,
  transcript: () => null,
});
const call = (tool_name, tool_input) => ({ tool_name, cwd: CWD, tool_input });
const out = (payload, i = io()) => decide(payload, {}, i)?.hookSpecificOutput;

test.each([
  "/w/tests/a.mjs",
  "/w/src/a.test.mjs",
  "/w/src/a.spec.ts",
  "/w/pkg/__tests__/a.js",
  "/w/test/a.py",
  "/w/plugins/x/limits.mjs",
  "/w/plugins/x/lib/budget.mjs",
  "/w/limits.json",
])("an `Edit` of the existing file `%s` gets an ask", (file) => {
  const o = out(
    call("Edit", {
      file_path: file,
      old_string: "const a = 1;",
      new_string: "const a = 2;",
    }),
    io({ [file]: "const a = 1;" }),
  );
  expect(o.permissionDecision).toBe("ask");
  expect(o.permissionDecisionReason).toContain(
    "changes only when the user asks",
  );
});

test.each([
  "/w/src/a.mjs",
  "/w/src/contest.mjs",
  "/w/src/latest/a.mjs",
  "/w/src/limits-helper.mjs",
  "/w/docs/tests.md",
])("an `Edit` of the existing file `%s` gets no ask", (file) => {
  const o = out(
    call("Edit", { file_path: file, old_string: "a", new_string: "b" }),
    io({ [file]: "a" }),
  );
  expect(o).toBeUndefined();
});

const TESTS = "/w/tests/a.test.mjs";
const TEST_SRC = 'test("a", () => {\n  expect(f()).toBe(1);\n});\n';
const LIMITS = "/w/plugins/x/limits.mjs";
const LIMITS_SRC = "// The bounds.\nexport const A_MAX = 10;\n";
const edit = (file, old_string, new_string) =>
  call("Edit", { file_path: file, old_string, new_string });

test("an added test case in an existing test file gets no ask", () => {
  const add = 'test("b", () => {\n  expect(g()).toBe(2);\n});\n';
  const files = io({ [TESTS]: TEST_SRC });
  expect(out(edit(TESTS, "", add), files)).toBeUndefined();
  expect(out(edit(TESTS, "});\n", `});\n\n${add}`), files)).toBeUndefined();
  expect(
    out(
      call("Write", { file_path: TESTS, content: `${TEST_SRC}\n${add}` }),
      files,
    ),
  ).toBeUndefined();
});

test("a changed `expect` line gets an ask that names the old and the new line", () => {
  const o = out(edit(TESTS, "toBe(1)", "toBe(2)"), io({ [TESTS]: TEST_SRC }));
  expect(o.permissionDecision).toBe("ask");
  expect(o.permissionDecisionReason).toContain("`expect(f()).toBe(1);`");
  expect(o.permissionDecisionReason).toContain("`expect(f()).toBe(2);`");
});

test("a deleted test gets an ask", () => {
  const o = out(edit(TESTS, TEST_SRC, ""), io({ [TESTS]: TEST_SRC }));
  expect(o.permissionDecision).toBe("ask");
  expect(o.permissionDecisionReason).toContain("removes it");
});

test("a long changed line is cut in the reason", () => {
  const long = `expect(${"x".repeat(200)}).toBe(1);`;
  const o = out(edit(TESTS, "a", "b"), io({ [TESTS]: `${long}\n` }, {}));
  expect(o).toBeUndefined();
  const w = call("Write", { file_path: TESTS, content: "other\n" });
  const reason = out(w, io({ [TESTS]: `${long}\n` })).permissionDecisionReason;
  expect(reason).toContain("...");
  expect(reason).not.toContain("x".repeat(100));
});

test("an added constant in a limits file gets no ask", () => {
  const files = io({ [LIMITS]: LIMITS_SRC });
  const add = "/** More. */\nexport const B_MAX = 5;\n";
  expect(out(edit(LIMITS, "", add), files)).toBeUndefined();
  expect(
    out(
      call("Write", { file_path: LIMITS, content: `${LIMITS_SRC}\n${add}` }),
      files,
    ),
  ).toBeUndefined();
});

test("a changed number in a limits file gets an ask, and a changed comment does not", () => {
  const files = io({ [LIMITS]: LIMITS_SRC });
  const o = out(edit(LIMITS, "= 10;", "= 20;"), files);
  expect(o.permissionDecision).toBe("ask");
  expect(o.permissionDecisionReason).toContain("`export const A_MAX = 10;`");
  expect(o.permissionDecisionReason).toContain("`export const A_MAX = 20;`");
  expect(
    out(edit(LIMITS, "The bounds.", "The limits."), files),
  ).toBeUndefined();
});

test("a removed constant in a limits file gets an ask", () => {
  const o = out(
    edit(LIMITS, "export const A_MAX = 10;\n", ""),
    io({ [LIMITS]: LIMITS_SRC }),
  );
  expect(o.permissionDecision).toBe("ask");
});

test("a `Write` of a new test file gets no ask, and a `Write` over an old one does", () => {
  const file = "/w/tests/new.test.mjs";
  const w = call("Write", { file_path: file, content: "x" });
  expect(out(w)).toBeUndefined();
  expect(out(w, io({ [file]: "old" })).permissionDecision).toBe("ask");
});

test("a `MultiEdit` of an existing test file gets an ask", () => {
  const file = "/w/tests/a.test.mjs";
  const m = call("MultiEdit", {
    file_path: file,
    edits: [{ old_string: "a", new_string: "b" }],
  });
  expect(out(m, io({ [file]: "a" })).permissionDecision).toBe("ask");
});
