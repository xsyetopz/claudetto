// The fault tests of the settings snippet (task 2.1 of change `0-3-0`).
// Each test names its fault of `.claudetto/0.3.0-findings.md` ("fault N") or `research/sessions.md` ("F N"),
// and it failed on `v0.2.0` (`test.failing`).
// The task that fixes a fault changes its `test.failing` to `test`.

import { expect, test } from "bun:test";
import { snippetFor } from "../../../plugins/claudetto/slices/setup/domain/merge.ts";
import { DOCS_SNIPPET, SNIPPET } from "../../../plugins/claudetto/snippets.ts";

type Snippet = {
  env?: Record<string, string>;
  permissions?: {
    ask?: string[];
    deny?: string[];
    defaultMode?: string;
    disableAutoMode?: string;
  };
} & Record<string, unknown>;

const S = SNIPPET as Snippet;
const env = S.env ?? {};
const deny = S.permissions?.deny ?? [];

// Fixed by task 7.1.
test("faults 4, 12, and 43: the snippet writes no `ask` rule, so no `Bash(rm -r*)` prompt comes back", () => {
  expect(S.permissions?.ask).toBeUndefined();
});

// Fixed by task 7.1.
test("faults 1, 2, 13, F05, F18, F36: the snippets write no `sandbox` key", () => {
  expect(Object.keys(S)).not.toContain("sandbox");
  expect(Object.keys(DOCS_SNIPPET)).not.toContain("sandbox");
});

// Fixed by task 7.1.
test("faults 7, 38, F03, F08, F28: auto mode is off and the mode is `default`", () => {
  expect(S.permissions?.disableAutoMode).toBe("disable");
  expect(S.permissions?.defaultMode).toBe("default");
});

// Fixed by tasks 7.1 and 7.4.
test("fault 17 and F12: the snippet sets no spawn depth and no fixed subagent cap", () => {
  expect(env).not.toHaveProperty("CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH");
  expect(env).not.toHaveProperty("CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS");
});

// Fixed by task 7.1.
test("fault 35: the tokens-left reminder is off", () => {
  expect(env["CLAUDE_CODE_TOTAL_TOKENS_REMINDER"]).toBe("off");
});

// Fixed by task 7.1.
test("faults 36 and 45: each built-in agent is denied, and the Explore and Plan agents are off", () => {
  for (const name of [
    "general-purpose",
    "Explore",
    "Plan",
    "claude",
    "claude-code-guide",
    "statusline-setup",
  ])
    expect(deny).toContain(`Agent(${name})`);
  expect(env["CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS"]).toBe("1");
});

// Fixed by task 7.1.
test("fault 37: forks are off", () => {
  expect(env["CLAUDE_CODE_FORK_SUBAGENT"]).toBe("0");
  expect(deny).toContain("Agent(fork)");
});

// Fixed by task 7.1.
test("fault 41: the snippet sets no `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`, which has no effect", () => {
  expect(env).not.toHaveProperty("CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT");
});

// Fixed by task 7.1.
// The three compaction keys are one control: `tests/claudetto/handoff/trigger.test.ts` records how they combine, and the handoff needs each (the user, 2026-10-22).
// The user keeps the documented `DISABLE_*_COMMAND` switches (2026-10-22: "should disable feedback commands etc."), so only the gated one goes.
test("fault 42: the snippet has one key for each effect", () => {
  const both =
    "feedbackSurveyRate" in S && "CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY" in env;
  expect(both).toBe(false);
  expect(Object.keys(env)).not.toContain("DISABLE_UPGRADE_COMMAND");
});

// Fixed by task 7.1.
test("F10: the snippet keeps the default `Bash` output size", () => {
  expect(Object.keys(S)).not.toContain("bashOutputMaxChars");
});

// Fixed by task 3.2, with the removal of `advise`.
test("fault 32: the built-in advisor is off", () => {
  expect(env["CLAUDE_CODE_DISABLE_ADVISOR_TOOL"]).toBe("1");
});

// Fixed by task 3.2, with the removal of the `ProposeGoal` deny.
test("faults 28 and 49: the model proposes no goal", () => {
  expect(S["modelProposedGoals"]).toBe("disabled");
});

/** True when the `Bash` rule `rule` matches `command` by the wildcard syntax of Claude Code: `*` is any text, and a final ` *` also matches no argument. */
const matches = (rule: string, command: string): boolean => {
  const body = rule
    .slice(5, -1)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*")
    .replace(/ \.\*$/, "(?: .*)?");
  return new RegExp(`^${body}$`).test(command);
};

// Fixed by task 3.1 of change `release-0-3-0-alpha-2`.
test("Deny Rules Match Only Their Target: no `Bash` deny rule matches a delete in the temp folder or under the home folder, and one matches `rm -rf /`", () => {
  const rules = deny.filter((rule) => rule.startsWith("Bash("));
  const hits = (command: string) => rules.filter((r) => matches(r, command));
  for (const safe of ["rm -rf /tmp/x", "rm -rf ~/proj/build", "rm -rf ./build"])
    expect([safe, hits(safe)]).toStrictEqual([safe, []]);
  expect(hits("rm -rf /")).toStrictEqual(["Bash(rm -rf /)"]);
});

// Fixed by task 9.2.
test("F19: the status line command does not name the versioned plugin folder", () => {
  const root = "/u/.claude/plugins/cache/claudetto/claudetto/0.2.0";
  const { snippet } = snippetFor({}, root, false);
  const line = snippet["statusLine"] as { command: string };
  expect(line.command).not.toContain("0.2.0");
});
