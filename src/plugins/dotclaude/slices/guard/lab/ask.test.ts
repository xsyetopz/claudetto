// Lab tests of the `tool.check` hook of the `guard` slice: the ask for a repository of another owner with an AI policy.
// The hook sits above the stub of the engine, so the stub answers `next(e)`, and the stub of `gh` answers `process.run`.
// No command runs, and no network call goes out.

import type { On, ProcessRunResult } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

/** A finished `gh` run: no cut output. */
const done = (
  exitCode: number,
  stdout: string,
  stderr = "",
): { value: ProcessRunResult } => ({
  value: {
    exitCode,
    stdout,
    stderr,
    isStdoutTruncated: false,
    isStderrTruncated: false,
  },
});

/** The answer of a policy file that does not exist: exit 1 with `HTTP 404` on stderr. */
const MISSING = Symbol("missing");

const LOGIN = "gh config get user -h github.com";
const ORGS =
  'gh api user/memberships/orgs --paginate --jq .[] | select(.role == "admin" and .state == "active") | .organization.login';
const policyOf = (repo: string, file: string) =>
  `gh api -H Accept: application/vnd.github.raw+json repos/${repo}/contents/${file}`;
const POLICY = (repo: string) => policyOf(repo, "CLAUDE.md");
const POLICY_FILES = ["CLAUDE.md", "AGENTS.md", "AI_POLICY.md"];

/**
 * Stubs for one test: the verdict of the engine, the session, and `gh` output by argument list.
 * An answer that is a list gives its next item for each call, `null` is a failed call,
 * and `MISSING` is a file that does not exist.
 * The result lists the `gh` calls in order.
 */
const stub = (
  on: On,
  answers: Record<
    string,
    string | null | typeof MISSING | (string | null | typeof MISSING)[]
  > = {},
  verdict: { decision: "allow" | "ask" | "deny"; reason?: string } = {
    decision: "allow",
  },
) => {
  on("tool.check", () => verdict);
  on("session.id", () => ({ value: "s1" }));
  on("session.cwd", () => ({ value: "/p" }));
  mock.env(on, { CLAUDE_PROJECT_DIR: "/p" });
  const calls: string[] = [];
  on("process.run", (_$, e) => {
    const key = e.argv.join(" ");
    const list = answers[key];
    const out = Array.isArray(list) ? list.shift() : list;
    calls.push(key);
    if (out === MISSING) return done(1, "", "gh: Not Found (HTTP 404)");
    return out === undefined || out === null ? done(1, "") : done(0, out);
  });
  return calls;
};

const bash = ($: Engine, command: string) =>
  $.tool.check({ tool: "Bash", input: { command } });

test("a deny of the engine stays a deny", async ($: Engine, on: On) => {
  stub(on, {}, { decision: "deny" });
  expect((await bash($, "gh repo view other/lib")).decision).toBe("deny");
});

test("a call to a repository of another owner with a policy asks on each call", async ($: Engine, on: On) => {
  stub(on, { [LOGIN]: "me\n", [POLICY("other/lib")]: "No AI pull requests." });
  const first = await bash($, "gh repo view other/lib");
  expect(first.decision).toBe("ask");
  expect(first.reason).toContain("No AI pull requests.");
  // A denied ask must not let the retry of the same call run silently.
  const retry = await bash($, "gh repo view other/lib");
  expect(retry.decision).toBe("ask");
  expect(retry.reason).toContain("No AI pull requests.");
});

test("a failed policy fetch is read again at the next call", async ($: Engine, on: On) => {
  const calls = stub(on, {
    [LOGIN]: "me\n",
    [POLICY("other/lib")]: [null, "No AI pull requests."],
  });
  expect((await bash($, "gh repo view other/lib")).decision).toBe("allow");
  const next = await bash($, "gh repo view other/lib");
  expect(next.decision).toBe("ask");
  expect(calls.filter((c) => c === POLICY("other/lib"))).toHaveLength(2);
});

/** The answers of the three policy files of `repo`, when none of them exists. */
const noPolicy = (repo: string) =>
  Object.fromEntries(
    POLICY_FILES.map((file) => [policyOf(repo, file), MISSING]),
  );

test("a repository whose policy files are all missing is cached, so its next call reads nothing", async ($: Engine, on: On) => {
  const calls = stub(on, { [LOGIN]: "me\n", ...noPolicy("nobody/empty") });
  const url = {
    tool: "WebFetch",
    input: { url: "https://github.com/nobody/empty" },
  };
  expect((await $.tool.check(url)).decision).toBe("allow");
  expect(calls.filter((c) => c.includes("repos/nobody/empty/"))).toHaveLength(
    3,
  );
  expect((await $.tool.check(url)).decision).toBe("allow");
  expect(calls.filter((c) => c.includes("repos/nobody/empty/"))).toHaveLength(
    3,
  );
});

test("a repository of the user, or one with no policy, keeps the verdict", async ($: Engine, on: On) => {
  stub(on, { [LOGIN]: "me\n", [POLICY("me/app")]: "Rules of my own." });
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

test("a failed `gh` call for the owners is tried again at the next check", async ($: Engine, on: On) => {
  const calls = stub(on, {
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
  const calls = stub(on, {
    [LOGIN]: ["me\n"],
    [ORGS]: "",
    [POLICY("me/one")]: "Rules of my own.",
    [POLICY("me/two")]: "Rules of my own.",
  });
  await bash($, "gh repo view me/one");
  await bash($, "gh repo view me/two");
  expect(calls.filter((c) => c === LOGIN)).toHaveLength(1);
});

test("an ask of the guard comes first, and the ask reason of the next handler follows after a blank line", async ($: Engine, on: On) => {
  stub(
    on,
    { [LOGIN]: "me\n", [POLICY("other/lib")]: "No AI pull requests." },
    { decision: "ask", reason: "Reason of the engine." },
  );
  const out = await bash($, "gh repo view other/lib");
  expect(out.decision).toBe("ask");
  const reason = out.reason ?? "";
  expect(reason.indexOf("No AI pull requests.")).toBeGreaterThan(-1);
  expect(reason.indexOf("No AI pull requests.")).toBeLessThan(
    reason.indexOf("Reason of the engine."),
  );
  expect(reason).toContain("\n\nReason of the engine.");
});

test("an ask of the engine stays when the call reaches no other repository", async ($: Engine, on: On) => {
  stub(on, {}, { decision: "ask", reason: "Reason of the engine." });
  const out = await bash($, "ls");
  expect(out.decision).toBe("ask");
  expect(out.reason).toBe("Reason of the engine.");
});
