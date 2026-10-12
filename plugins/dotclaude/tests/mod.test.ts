// The hook lab of dotclaude: `claude plugin test plugins/dotclaude` loads `hooks/register.ts`,
// fires `tool.check` and `tool.call` events, and stubs each answer of Claude Code.
// No command runs, no session starts, and no network call goes out.

import type { On, ProcessRunResult } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

/** A finished `gh` run: no cut output. */
const done = (
  exitCode: number,
  stdout: string,
  stderr: string,
): { value: ProcessRunResult } => ({
  value: {
    exitCode,
    stdout,
    stderr,
    isStdoutTruncated: false,
    isStderrTruncated: false,
  },
});

/** Stubs for one test: the engine verdict, the session, and `gh` output by argument list. */
function stub(
  on: On,
  {
    verdict = "allow",
    gh = {},
  }: { verdict?: "allow" | "ask" | "deny"; gh?: Record<string, string> } = {},
) {
  on("tool.check", () => ({ decision: verdict }));
  on("session.id", () => ({ value: "s1" }));
  on("session.cwd", () => ({ value: "/p" }));
  mock.env(on, { CLAUDE_PROJECT_DIR: "/p" });
  on("process.run", (_$, e) => {
    const out = gh[e.argv.join(" ")];
    return out === undefined ? done(1, "", "not found") : done(0, out, "");
  });
}

const bash = ($: Engine, command: string) =>
  $.tool.check({ tool: "Bash", input: { command } });

test("a deny of the engine stays a deny", async ($: Engine, on: On) => {
  stub(on, { verdict: "deny" });
  expect((await bash($, "gh repo view other/lib")).decision).toBe("deny");
});

const LOGIN = "gh config get user -h github.com";
const ORGS =
  'gh api user/memberships/orgs --paginate --jq .[] | select(.role == "admin" and .state == "active") | .organization.login';
const POLICY = (repo: string) =>
  `gh api -H Accept: application/vnd.github.raw+json repos/${repo}/contents/CLAUDE.md`;

test("the first call to a repository of another owner with a policy asks once", async ($: Engine, on: On) => {
  stub(on, {
    gh: { [LOGIN]: "me\n", [POLICY("other/lib")]: "No AI pull requests." },
  });
  const first = await bash($, "gh repo view other/lib");
  expect(first.decision).toBe("ask");
  expect(first.reason).toContain("No AI pull requests.");
  expect((await bash($, "gh repo view other/lib")).decision).toBe("allow");
});

test("a repository of the user, or one with no policy, keeps the verdict", async ($: Engine, on: On) => {
  stub(on, {
    gh: { [LOGIN]: "me\n", [POLICY("me/app")]: "Rules of my own." },
  });
  expect((await bash($, "gh repo view me/app")).decision).toBe("allow");
  expect(
    (
      await $.tool.check({
        tool: "WebFetch",
        input: { url: "https://github.com/nobody/empty" },
      })
    ).decision,
  ).toBe("allow");
});

/** Like `stub`, but each `gh` call that has a list of answers takes the next answer, and `null` is a failed call. */
function sequence(
  on: On,
  answers: Record<string, string | null | (string | null)[]>,
) {
  on("tool.check", () => ({ decision: "allow" }));
  on("session.id", () => ({ value: "s1" }));
  on("session.cwd", () => ({ value: "/p" }));
  mock.env(on, { CLAUDE_PROJECT_DIR: "/p" });
  const calls: string[] = [];
  on("process.run", (_$, e) => {
    const key = e.argv.join(" ");
    const list = answers[key];
    const out = Array.isArray(list) ? list.shift() : list;
    calls.push(key);
    return out === undefined || out === null
      ? done(1, "", "failed")
      : done(0, out, "");
  });
  return calls;
}

test("a failed `gh` call for the owners is tried again at the next check", async ($: Engine, on: On) => {
  const calls = sequence(on, {
    [LOGIN]: [null, "me\n"],
    [POLICY("me/first")]: "Rules of my own.",
    [POLICY("me/app")]: "Rules of my own.",
  });
  // The first check cannot read the owners, so the repository counts as one of another owner.
  expect((await bash($, "gh repo view me/first")).decision).toBe("ask");
  // The second check reads the owners again, finds `me`, and keeps the verdict.
  expect((await bash($, "gh repo view me/app")).decision).toBe("allow");
  expect(calls.filter((c) => c === LOGIN)).toHaveLength(2);
});

test("owners that were read once are not read again", async ($: Engine, on: On) => {
  const calls = sequence(on, {
    [LOGIN]: ["me\n"],
    [ORGS]: "",
    [POLICY("me/one")]: "Rules of my own.",
    [POLICY("me/two")]: "Rules of my own.",
  });
  await bash($, "gh repo view me/one");
  await bash($, "gh repo view me/two");
  expect(calls.filter((c) => c === LOGIN)).toHaveLength(1);
});

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

test("Check in the module: a `Bash` print of a long file is denied", async ($: Engine, on: On) => {
  stub(on);
  const seen = project(on, { "/p/big.txt": "line\n".repeat(2000) });
  const out = await $.tool.call({ tool: "Bash", command: "cat /p/big.txt" });
  const deny = "deny" in out ? out.deny : undefined;
  expect(typeof deny, `fs paths: ${seen.join(", ")}`).toBe("string");
  expect(deny?.length).toBeGreaterThan(0);
});

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
