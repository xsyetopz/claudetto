// Lab tests of the `turngate` slice: the task part, the judge part, the count of blocks, and the `judge` option.
// The stubs answer each tool call, the judge model, and `ui.log`. No model call goes out.
// The hooks module keeps a record for each agent, so each test starts with an interrupted turn, which clears the record.
// The file is self-contained, because `just generate` copies it to `tests/` of the plugin, where it cannot import a relative file.

import type { ModelCompleteResult, On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const USAGE = {
  input_tokens: 900,
  output_tokens: 60,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

const answered = (text: string): ModelCompleteResult => ({
  isAnswered: true,
  text,
  usage: USAGE,
});

const CLAIM = JSON.stringify({
  fault: "claim",
  quote: "All tests pass.",
  fix: "Run `bun test` after the last edit, and report its output.",
});

const NONE = JSON.stringify({ fault: "none" });

type World = {
  /** The judge reply, or a result with no answer. */
  readonly judge?: ModelCompleteResult;
  /** The commands that fail. */
  readonly failing?: readonly string[];
};

/** Stubs for one test. Returns what the stubs saw: each judge request and each log line. */
const setup = (on: On, world: World = {}) => {
  const seen = {
    requests: [] as { system: string | undefined; prompt: string }[],
    logs: [] as string[],
    debug: [] as string[],
  };
  // The stubs below answer the hooks of other slices on the same calls.
  mock.env(on, { HOME: "/home/u" });
  on("fs.exists", () => ({ value: false }));
  on("classic.Stop", () => ({}));
  on("classic.SubagentStop", () => ({}));
  on("turn.complete", (_$, e) => ({ text: e.answer }));
  on("tool.call", (_$, e) => {
    const command = "command" in e ? String(e.command) : "";
    return world.failing?.includes(command)
      ? { isError: true as const, result: "exit 1", text: "1 test failed" }
      : { result: "ok" };
  });
  on("model.complete", (_$, e) => {
    seen.requests.push({ system: e.system, prompt: e.prompt });
    return { value: world.judge ?? answered(NONE) };
  });
  on("ui.log", (_$, e) => {
    (e.to === "debug" ? seen.debug : seen.logs).push(e.text);
    return { value: undefined };
  });
  return seen;
};

/** Clears the record of the main loop, or of `agentId`. */
const fresh = ($: Engine, agentId?: string) =>
  $.turn.complete({
    answer: "",
    durationMs: 1,
    isAborted: true,
    turnId: "t0",
    reason: "aborted",
    ...(agentId ? { agentId } : {}),
  });

const edit = ($: Engine, agentId?: string) =>
  $.tool.call({
    tool: "Edit",
    file_path: "/p/src/retry.ts",
    old_string: "3",
    new_string: "10",
    replace_all: false,
    tool_use_id: "toolu_1",
    ...(agentId ? { agentId } : {}),
  });

const bash = ($: Engine, command: string, agentId?: string) =>
  $.tool.call({
    tool: "Bash",
    command,
    tool_use_id: "toolu_2",
    ...(agentId ? { agentId } : {}),
  });

type Task = { id: string; status: string; description: string; type: string };

const stop = (
  $: Engine,
  reply: string,
  active = false,
  tasks: readonly Task[] = [],
) =>
  $.classic.Stop({
    session_id: "s",
    stop_hook_active: active,
    last_assistant_message: reply,
    background_tasks: [...tasks],
  });

const task = (id: string, status: string): Task => ({
  id,
  status,
  description: "bun test --watch",
  type: "local_bash",
});

test("a claim with no check after the last edit is blocked", async ($: Engine, on: On) => {
  const seen = setup(on, { judge: answered(CLAIM) });
  await fresh($);
  await edit($);
  const out = await stop($, "Done. All tests pass.");
  expect(out.block).toContain('"All tests pass."');
  expect(out.block).toContain("`bun test`");
  expect(seen.requests.length).toBe(1);
});

test("a reply in Polish with a claim is blocked", async ($: Engine, on: On) => {
  const seen = setup(on, {
    judge: answered(
      JSON.stringify({
        fault: "claim",
        quote: "Wszystkie testy przechodzą.",
        fix: "Run the tests, and report the output.",
      }),
    ),
  });
  await fresh($);
  await edit($);
  const out = await stop($, "Gotowe. Wszystkie testy przechodzą.");
  expect(out.block).toContain("Wszystkie testy przechodzą.");
  expect(seen.requests[0]?.prompt).toContain("Wszystkie testy przechodzą.");
});

test("a reply that only asks a question passes", async ($: Engine, on: On) => {
  setup(on, { judge: answered(NONE) });
  await fresh($);
  await edit($);
  const out = await stop($, "Do you want the retry count in a config file?");
  expect(out.block).toBeUndefined();
});

test("a block sends only the reason, with no line of the rubric", async ($: Engine, on: On) => {
  const seen = setup(on, { judge: answered(CLAIM) });
  await fresh($);
  await edit($);
  const out = await stop($, "Done. All tests pass.");
  const system = seen.requests[0]?.system ?? "";
  const rubric = system.split("\n").filter((line) => line.trim().length > 20);
  expect(rubric.length).toBeGreaterThan(0);
  for (const line of rubric) expect(out.block).not.toContain(line.trim());
});

test("the judge gets the summary of the tool calls of the turn", async ($: Engine, on: On) => {
  const seen = setup(on, { failing: ["bun test"] });
  await fresh($);
  await edit($);
  await bash($, "bun test");
  await stop($, "The edit is in, and one test fails.");
  const prompt = seen.requests[0]?.prompt ?? "";
  expect(prompt).toContain("1. Edit `/p/src/retry.ts`: ok");
  expect(prompt).toContain("2. Bash `bun test`: error: 1 test failed");
  expect(prompt).toContain("The edit is in, and one test fails.");
  expect(prompt).not.toContain("new_string");
});

test("a turn with no tool calls is judged with an empty list", async ($: Engine, on: On) => {
  const seen = setup(on, { judge: answered(CLAIM) });
  await fresh($);
  const out = await stop($, "Done. All tests pass.");
  expect(out.block).toContain("All tests pass.");
  expect(seen.requests[0]?.prompt).toContain("(no tool calls)");
});

test("a claim after one block is blocked again", async ($: Engine, on: On) => {
  setup(on, { judge: answered(CLAIM) });
  await fresh($);
  await edit($);
  expect((await stop($, "All tests pass.")).block).not.toBeUndefined();
  expect((await stop($, "All tests pass.", true)).block).not.toBeUndefined();
});

test("after the cap of blocks, the next stop passes with a notice", async ($: Engine, on: On) => {
  const seen = setup(on, { judge: answered(CLAIM) });
  await fresh($);
  await edit($);
  await stop($, "All tests pass.");
  await stop($, "All tests pass.", true);
  const out = await stop($, "All tests pass.", true);
  expect(out.block).toBeUndefined();
  expect(seen.logs.join("\n")).toContain("All tests pass.");
});

test("a running task blocks the stop with no judge call", async ($: Engine, on: On) => {
  const seen = setup(on, { judge: answered(CLAIM) });
  await fresh($);
  await edit($);
  const out = await stop($, "Done.", false, [task("b7x2", "running")]);
  expect(out.block).toContain("`b7x2`");
  expect(out.block).toContain("`TaskStop`");
  expect(seen.requests.length).toBe(0);
});

test("when each background task ended, the task part passes", async ($: Engine, on: On) => {
  const seen = setup(on);
  await fresh($);
  const out = await stop($, "Done.", false, [
    task("b1", "completed"),
    task("b2", "failed"),
  ]);
  expect(out.block).toBeUndefined();
  expect(seen.requests.length).toBe(1);
});

const off = { options: { judge: false } };

test(
  "with the judge off, only the task part runs",
  off,
  async ($: Engine, on: On) => {
    const seen = setup(on, { judge: answered(CLAIM) });
    await fresh($);
    await edit($);
    expect((await stop($, "All tests pass.")).block).toBeUndefined();
    const out = await stop($, "Done.", false, [task("b9", "running")]);
    expect(out.block).toContain("`b9`");
    expect(seen.requests.length).toBe(0);
  },
);

test("a judge timeout allows the stop and logs the timeout", async ($: Engine, on: On) => {
  const seen = setup(on, {
    judge: { isAnswered: false, reason: "aborted", usage: USAGE },
  });
  await fresh($);
  await edit($);
  const out = await stop($, "All tests pass.");
  expect(out.block).toBeUndefined();
  expect(seen.logs.join("\n")).toContain("timeout after");
});

test("the judge usage goes to the debug log", async ($: Engine, on: On) => {
  const seen = setup(on);
  await fresh($);
  await edit($);
  await stop($, "The edit is in.");
  expect(seen.debug.join("\n")).toContain("900");
});

test("an interrupted turn clears the tool calls", async ($: Engine, on: On) => {
  const seen = setup(on, { judge: answered(CLAIM) });
  await fresh($);
  await edit($);
  await fresh($);
  await stop($, "All tests pass.");
  expect(seen.requests[0]?.prompt).toContain("(no tool calls)");
});

test("a subagent stop with a running task is blocked", async ($: Engine, on: On) => {
  setup(on);
  await fresh($, "a1");
  const out = await $.classic.SubagentStop({
    session_id: "s",
    stop_hook_active: false,
    agent_id: "a1",
    agent_type: "implementer",
    agent_transcript_path: "/t/a1.jsonl",
    last_assistant_message: "Done.",
    background_tasks: [task("b3", "running")],
  });
  expect(out.block).toContain("`b3`");
});

test("a subagent is judged on its own calls only", async ($: Engine, on: On) => {
  const seen = setup(on, { judge: answered(CLAIM) });
  await fresh($);
  await fresh($, "a2");
  await edit($);
  const out = await $.classic.SubagentStop({
    session_id: "s",
    stop_hook_active: false,
    agent_id: "a2",
    agent_type: "implementer",
    agent_transcript_path: "/t/a2.jsonl",
    last_assistant_message: "All tests pass.",
  });
  expect(out.block).not.toBeUndefined();
  expect(seen.requests[0]?.prompt).toContain("(no tool calls)");
});
