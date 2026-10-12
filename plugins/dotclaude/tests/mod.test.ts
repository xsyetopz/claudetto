// The hook lab of dotclaude: `claude plugin test plugins/dotclaude` loads `hooks/register.ts`,
// fires `tool.check` events, and stubs each answer of Claude Code.
// No command runs, no session starts, and no network call goes out.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

/** Stubs for one test: the engine verdict, the session, and the project folder. */
function stub(
  on: On,
  { verdict = "allow" }: { verdict?: "allow" | "ask" | "deny" } = {},
) {
  on("tool.check", () => ({ decision: verdict }));
  on("session.id", () => ({ value: "s1" }));
  on("session.cwd", () => ({ value: "/p" }));
  mock.env(on, { CLAUDE_PROJECT_DIR: "/p" });
}

/** The project folder and the files of one test: each path of `texts` is a file with that text. */
/** Stubs the file system with `texts`, and gives each path that an `fs` event got. */
function project(on: On, texts: Record<string, string> = {}): string[] {
  const seen: string[] = [];
  // On Windows the engine can give a path with `\` and a drive letter, so the key drops both.
  const key = (p: string) => {
    seen.push(p);
    return p.replace(/\\/g, "/").replace(/^[A-Za-z]:/, "");
  };
  on("fs.exists", (_$, e) => ({ value: key(e.path) in texts }));
  on("fs.stat", (_$, e) => ({
    value: {
      kind: "file" as const,
      size: (texts[key(e.path)] ?? "").length,
      mtimeMs: 0,
      isLink: false,
    },
  }));
  on("fs.read", (_$, e) => ({ value: texts[key(e.path)] ?? "" }));
  return seen;
}

test("a `Write` of a source file gets no ask", async ($: Engine, on: On) => {
  stub(on);
  project(on);
  const out = await $.tool.check({
    tool: "Write",
    input: { file_path: "/p/src/app.ts", content: "export const a = 1\n" },
  });
  expect(out.decision).toBe("allow");
});

test("Ask in the module: a `Write` that changes a line of a test file asks", async ($: Engine, on: On) => {
  stub(on);
  const seen = project(on, { "/p/tests/a.test.mjs": "expect(1).toBe(1)\n" });
  const out = await $.tool.check({
    tool: "Write",
    input: {
      file_path: "/p/tests/a.test.mjs",
      content: "expect(1).toBe(2)\n",
    },
  });
  expect(out.decision, `fs paths: ${seen.join(", ")}`).toBe("ask");
  expect(out.reason?.length).toBeGreaterThan(0);
});
