// Lab tests of the `attribution` reminder: the `prompt.submit`, `session.compact`, and `agent.spawn` hooks.
// `session.id`, `session.model`, and `settings.read` are stubbed, and the stubs of the engine record what reaches it.
// Each test has its own session id, because the module keeps the last reminder of each session.

import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
  COMMIT_ITEM,
  PR_ITEM,
  REMINDER,
  REMINDER_OFF,
  RULE_MANAGED,
  RULE_SPLIT,
  RULE_USER,
} from "../prompts.ts";

const TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
// biome-ignore lint/plugin: test input data
const PR = "🤖 Generated with [Claude Code](https://claude.com/claude-code)";

/** The reminder with the user rule and the two lines of `commit`. */
const userReminder = (commit = TRAILER) =>
  REMINDER({
    rule: RULE_USER,
    items: [COMMIT_ITEM({ line: commit }), PR_ITEM({ line: PR })].join("\n"),
  });

type World = {
  session: string;
  model?: string;
  settings?: Record<string, unknown>;
  policy?: Record<string, unknown>;
};

/** The stubs of `world`, and the context of each prompt and the task prompt of each spawn, in order. */
const engine = (on: On, world: World) => {
  const seen = {
    contexts: [] as (readonly string[])[],
    spawns: [] as string[],
  };
  on("session.id", () => ({ value: world.session }));
  on("session.model", () => ({ value: world.model ?? "claude-opus-5-5" }));
  on("settings.read", (_$, e) => ({
    value:
      e.source === "policy" ? (world.policy ?? {}) : (world.settings ?? {}),
  }));
  on("prompt.submit", (_$, e) => {
    seen.contexts.push(e.context ?? []);
    return { text: e.text };
  });
  on("session.compact", (_$, e) => ({ messages: e.messages }));
  on("agent.spawn", (_$, e) => {
    seen.spawns.push(e.prompt);
    return { model: e.model ?? "claude-opus-5-5", agentId: "a1" };
  });
  return seen;
};

/** The conversation that a compaction runs over. */
const MESSAGES: SessionMessage[] = [
  { role: "user", text: "Commit it.", toolUses: [] },
];

const submit = ($: Engine) =>
  $.prompt.submit({
    text: "Commit it.",
    wait: false,
    origin: { kind: "composer" },
  });

const spawn = ($: Engine, extra: { model?: string; fork?: boolean } = {}) =>
  $.agent.spawn({
    tool_use_id: "t1",
    prompt: "Commit the fix.",
    description: "Commit the fix.",
    subagentType: "general-purpose",
    provider: { plugin: "engine", tier: "core" },
    parentModel: "claude-opus-5-5",
    background: false,
    fork: false,
    ...extra,
  });

// biome-ignore lint/plugin: a test name
test("the first prompt gets the reminder with the trailer of the main model", async ($: Engine, on: On) => {
  const seen = engine(on, { session: "s1" });
  await submit($);
  expect(seen.contexts[0]).toEqual([userReminder()]);
});

test("a second prompt with the same lines gets no reminder", async ($: Engine, on: On) => {
  const seen = engine(on, { session: "s2" });
  await submit($);
  await submit($);
  expect(seen.contexts[1]).toEqual([]);
});

// biome-ignore lint/plugin: a test name
test("a switch of the main model sends the reminder again with the new name", async ($: Engine, on: On) => {
  const world: World = { session: "s3" };
  const seen = engine(on, world);
  await submit($);
  world.model = "claude-sonnet-5-5";
  await submit($);
  expect(seen.contexts[1]).toEqual([
    userReminder("Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"),
  ]);
});

// biome-ignore lint/plugin: a test name
test("an empty `commit` setting gives the reminder with the pull request line only", async ($: Engine, on: On) => {
  const seen = engine(on, {
    session: "s4",
    settings: { attribution: { commit: "" } },
  });
  await submit($);
  expect(seen.contexts[0]).toEqual([
    REMINDER({ rule: RULE_USER, items: PR_ITEM({ line: PR }) }),
  ]);
});

// biome-ignore lint/plugin: a test name
test("`includeCoAuthoredBy: false` before any reminder sends nothing", async ($: Engine, on: On) => {
  const seen = engine(on, {
    session: "s5",
    settings: { includeCoAuthoredBy: false },
  });
  await submit($);
  expect(seen.contexts[0]).toEqual([]);
});

// biome-ignore lint/plugin: a test name
test("`includeCoAuthoredBy: false` after a reminder sends the reminder that turns the lines off", async ($: Engine, on: On) => {
  const world: World = { session: "s6" };
  const seen = engine(on, world);
  await submit($);
  world.settings = { includeCoAuthoredBy: false };
  await submit($);
  expect(seen.contexts[1]).toEqual([REMINDER_OFF]);
});

test("managed lines give the managed rule", async ($: Engine, on: On) => {
  const attribution = { commit: "Managed-By: Corp", pr: "From Corp" };
  const seen = engine(on, {
    session: "s7",
    settings: { attribution },
    policy: { attribution },
  });
  await submit($);
  expect(seen.contexts[0]).toEqual([
    REMINDER({
      rule: RULE_MANAGED,
      items: [
        COMMIT_ITEM({ line: "Managed-By: Corp" }),
        PR_ITEM({ line: "From Corp" }),
      ].join("\n"),
    }),
  ]);
});

// biome-ignore lint/plugin: a test name
test("a managed commit line and a user pull request line give the split rule", async ($: Engine, on: On) => {
  const seen = engine(on, {
    session: "s8",
    settings: { attribution: { commit: "Managed-By: Corp" } },
    policy: { attribution: { commit: "Managed-By: Corp" } },
  });
  await submit($);
  expect(seen.contexts[0]?.[0]).toContain(
    RULE_SPLIT({ managed: "commit", other: "pull request" }),
  );
});

test("after a compaction the next prompt gets the reminder again", async ($: Engine, on: On) => {
  const seen = engine(on, { session: "s9" });
  await submit($);
  await $.session.compact({ trigger: "manual", messages: MESSAGES });
  await submit($);
  expect(seen.contexts[1]).toEqual([userReminder()]);
});

test("a `precompute` compaction keeps the reminder as sent", async ($: Engine, on: On) => {
  const seen = engine(on, { session: "s10" });
  await submit($);
  await $.session.compact({ trigger: "precompute", messages: MESSAGES });
  await submit($);
  expect(seen.contexts[1]).toEqual([]);
});

test("a subagent task prompt ends with the reminder for its model", async ($: Engine, on: On) => {
  const seen = engine(on, { session: "s11" });
  await spawn($, { model: "claude-haiku-5-5" });
  const reminder = userReminder(
    "Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>",
  );
  expect(seen.spawns[0]).toBe(
    `Commit the fix.\n\n<system-reminder>\n${reminder}\n</system-reminder>`,
  );
});

test("a fork keeps its task prompt", async ($: Engine, on: On) => {
  const seen = engine(on, { session: "s12" });
  await spawn($, { fork: true });
  expect(seen.spawns[0]).toBe("Commit the fix.");
});

test("a subagent with both lines off keeps its task prompt", async ($: Engine, on: On) => {
  const seen = engine(on, {
    session: "s13",
    settings: { includeCoAuthoredBy: false },
  });
  await spawn($);
  expect(seen.spawns[0]).toBe("Commit the fix.");
});
