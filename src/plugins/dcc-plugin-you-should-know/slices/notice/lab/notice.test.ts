// Lab tests of the `notice` slice: the check of the first changing call of a turn, the switch to a fork after HTTP 429, and the calls that get no notice.
// The band above the prompt is not in these tests: `just lab` cannot mount `AbovePrompt` or read the state of a plugin.
// So each test asserts that the notice never comes out as a toast, and the model calls and verdicts.
// The hooks sit above the stubs of the engine: the stubs answer the verdict, the model calls, and the clock, and record each toast.
// No model call goes out, and no Claude Code session runs.

import type {
  ModelCompleteResult,
  ModelForkResult,
  On,
  ToolCheckDecision,
} from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const NO_USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

const answered = (text: string) => ({
  isAnswered: true as const,
  text,
  usage: NO_USAGE,
});

const failed = (status: number) => ({
  isAnswered: false as const,
  reason: "api-error" as const,
  status,
  error: status === 429 ? ("rate_limit" as const) : ("server_error" as const),
  usage: NO_USAGE,
});

/** The world of one test: the answers of the model calls, in order, and the verdict of each call. */
type World = {
  readonly complete?: readonly ModelCompleteResult[];
  readonly fork?: readonly (ModelForkResult | "never")[];
  readonly decision?: ToolCheckDecision;
};

/** What the stubs saw: the prompts of each model call, and each toast that the plugin raised, which must stay empty. */
type Seen = { complete: string[]; fork: string[]; toasts: string[] };

/** Stubs for one test. A model call past the end of its list answers `NONE`. */
const setup = (on: On, world: World = {}) => {
  const seen: Seen = { complete: [], fork: [], toasts: [] };
  const clock = mock.clock(on);
  on("turn.start", (_$, e) => ({ turnId: e.turnId }));
  on("tool.check", () => ({ decision: world.decision ?? "allow" }));
  on("model.complete", (_$, e) => {
    const reply = world.complete?.[seen.complete.length] ?? answered("NONE");
    seen.complete.push(e.prompt);
    return { value: reply };
  });
  on("model.fork", (_$, e) => {
    const reply = world.fork?.[seen.fork.length] ?? answered("NONE");
    seen.fork.push(e.prompt);
    return reply === "never" ? new Promise(() => {}) : { value: reply };
  });
  on("ui.toast", (_$, e) => {
    seen.toasts.push(e.text);
    return { value: undefined };
  });
  return { seen, clock };
};

const ids = { last: 0 };

/** One real call of `tool` with `input`, as the engine checks it. A query has no `tool_use_id`. */
const check = ($: Engine, tool: string, input: object, agentId?: string) =>
  $.tool.check({
    tool,
    input,
    tool_use_id: `toolu_${++ids.last}`,
    ...(agentId === undefined ? {} : { agentId }),
  });

const turn = ($: Engine, text: string, turnId: string) =>
  $.turn.start({ text, turnId });

const EDIT = {
  file_path: "/p/src/retry.mjs",
  old_string: "3",
  new_string: "10",
};
const TOPIC =
  "Ten tries with no delay can hit the rate limit of the API faster.";

test("the first changing call of a turn draws no toast", async ($: Engine, on: On) => {
  const { seen } = setup(on, { complete: [answered(TOPIC)] });
  await turn($, "Raise the tries to 10.", "t1");
  expect((await check($, "Edit", EDIT)).decision).toBe("allow");
  expect(seen.toasts).toStrictEqual([]);
  expect(seen.complete[0]).toContain("Raise the tries to 10.");
  expect(seen.complete[0]).toContain("/p/src/retry.mjs");
  expect(seen.fork).toStrictEqual([]);
});

test("a read gets no check", async ($: Engine, on: On) => {
  const { seen } = setup(on, { complete: [answered(TOPIC)] });
  await turn($, "Look at the file.", "t1");
  await check($, "Bash", { command: "cat src/retry.mjs | head -5" });
  await check($, "Bash", { command: "git log --oneline -3" });
  expect(seen.complete).toStrictEqual([]);
  expect(seen.toasts).toStrictEqual([]);
});

test("a `Bash` call that changes something gets the check", async ($: Engine, on: On) => {
  const { seen } = setup(on, { complete: [answered(TOPIC)] });
  await turn($, "Clean up.", "t1");
  await check($, "Bash", { command: "cat a > b" });
  expect(seen.complete.length).toBe(1);
});

test("a second changing call in the same turn gets no check", async ($: Engine, on: On) => {
  const { seen } = setup(on, { complete: [answered("NONE"), answered(TOPIC)] });
  await turn($, "Raise the tries.", "t1");
  await check($, "Edit", EDIT);
  await check($, "Write", { file_path: "/p/b.txt", content: "b" });
  expect(seen.complete.length).toBe(1);
  expect(seen.toasts).toStrictEqual([]);
});

test("the next turn gets its own check", async ($: Engine, on: On) => {
  const { seen } = setup(on, { complete: [answered("NONE"), answered(TOPIC)] });
  await turn($, "Raise the tries.", "t1");
  await check($, "Edit", EDIT);
  await turn($, "Now the delay.", "t2");
  await check($, "Edit", EDIT);
  expect(seen.complete.length).toBe(2);
  expect(seen.toasts).toStrictEqual([]);
});

test("a call of a subagent gets no check", async ($: Engine, on: On) => {
  const { seen } = setup(on, { complete: [answered(TOPIC)] });
  await turn($, "Raise the tries.", "t1");
  await check($, "Edit", EDIT, "agent-1");
  expect(seen.complete).toStrictEqual([]);
});

test("a denied call gets no check, and its verdict stays", async ($: Engine, on: On) => {
  const { seen } = setup(on, { complete: [answered(TOPIC)], decision: "deny" });
  await turn($, "Raise the tries.", "t1");
  expect((await check($, "Edit", EDIT)).decision).toBe("deny");
  expect(seen.complete).toStrictEqual([]);
});

test("a call that asks keeps its verdict and gets the check", async ($: Engine, on: On) => {
  const { seen } = setup(on, { complete: [answered(TOPIC)], decision: "ask" });
  await turn($, "Raise the tries.", "t1");
  expect((await check($, "Edit", EDIT)).decision).toBe("ask");
  expect(seen.toasts).toStrictEqual([]);
});

test("an HTTP 429 on the separate call switches the check to a fork", async ($: Engine, on: On) => {
  const { seen } = setup(on, {
    complete: [failed(429)],
    fork: [answered(TOPIC)],
  });
  await turn($, "Raise the tries.", "t1");
  await check($, "Edit", EDIT);
  expect(seen.complete.length).toBe(1);
  expect(seen.fork.length).toBe(1);
  expect(seen.fork[0]).toContain("/p/src/retry.mjs");
  expect(seen.toasts).toStrictEqual([]);
});

test("after a switch, the rest of the session uses only the fork", async ($: Engine, on: On) => {
  const { seen } = setup(on, {
    complete: [failed(429)],
    fork: [answered("NONE"), answered(TOPIC)],
  });
  await turn($, "Raise the tries.", "t1");
  await check($, "Edit", EDIT);
  await turn($, "Now the delay.", "t2");
  await check($, "Edit", EDIT);
  expect(seen.complete.length).toBe(1);
  expect(seen.fork.length).toBe(2);
  expect(seen.toasts).toStrictEqual([]);
});

test("a fork with nothing to fork draws no toast", async ($: Engine, on: On) => {
  const nothing = {
    isAnswered: false as const,
    reason: "nothing-to-fork" as const,
    usage: NO_USAGE,
  };
  const { seen } = setup(on, { complete: [failed(429)], fork: [nothing] });
  await turn($, "Raise the tries.", "t1");
  expect((await check($, "Edit", EDIT)).decision).toBe("allow");
  expect(seen.toasts).toStrictEqual([]);
});

test("a fork slower than its bound draws no toast, and the call goes on", async ($: Engine, on: On) => {
  const { seen, clock } = setup(on, {
    complete: [failed(429)],
    fork: ["never"],
  });
  await turn($, "Raise the tries.", "t1");
  const pending = check($, "Edit", EDIT);
  await clock.advance(6000);
  expect((await pending).decision).toBe("allow");
  expect(seen.toasts).toStrictEqual([]);
});

test("a failed separate call draws no toast and does not switch to a fork", async ($: Engine, on: On) => {
  const { seen } = setup(on, { complete: [failed(500), answered(TOPIC)] });
  await turn($, "Raise the tries.", "t1");
  await check($, "Edit", EDIT);
  await turn($, "Now the delay.", "t2");
  await check($, "Edit", EDIT);
  expect(seen.fork).toStrictEqual([]);
  expect(seen.toasts).toStrictEqual([]);
});

test("a topic that showed in the session is not asked again", async ($: Engine, on: On) => {
  const { seen } = setup(on, {
    complete: [answered(TOPIC), answered(`${TOPIC.toLowerCase()}`)],
  });
  await turn($, "Raise the tries.", "t1");
  await check($, "Edit", EDIT);
  await turn($, "Raise them more.", "t2");
  await check($, "Edit", EDIT);
  expect(seen.toasts).toStrictEqual([]);
  expect(seen.complete[1]).toContain(TOPIC);
});

test("a topic older than the seen bound still is not asked again", async ($: Engine, on: On) => {
  const topics = Array.from({ length: 12 }, (_, i) => `Topic ${i}.`);
  const { seen } = setup(on, {
    complete: [...topics.map((t) => answered(t)), answered(topics[0] ?? "")],
  });
  for (const i of topics.keys()) {
    await turn($, `Request ${i}.`, `t${i}`);
    await check($, "Edit", EDIT);
  }
  await turn($, "Again.", "t-last");
  await check($, "Edit", EDIT);
  expect(seen.toasts).toStrictEqual([]);
});

test("a call that gives no topic draws no toast", async ($: Engine, on: On) => {
  const { seen } = setup(on, { complete: [answered("NONE")] });
  await turn($, "Raise the tries.", "t1");
  await check($, "Edit", EDIT);
  expect(seen.complete.length).toBe(1);
  expect(seen.toasts).toStrictEqual([]);
});
