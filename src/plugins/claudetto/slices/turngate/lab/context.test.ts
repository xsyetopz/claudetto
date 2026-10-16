// Lab tests of the context of the `turngate` judge: the last prompt of the user, the earlier reply, and the faults `defer` and `cave`.
// The stubs answer the judge model, `ui.log`, and the calls of the other slices on a prompt. No model call goes out.
// The file is self-contained, because `just generate` copies it to `tests/` of the plugin, where it cannot import a relative file.

import type { ModelCompleteResult, On, PromptOrigin } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const answered = (text: string): ModelCompleteResult => ({
  isAnswered: true,
  text,
  usage: {
    input_tokens: 900,
    output_tokens: 60,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  },
});

const NONE = JSON.stringify({ fault: "none" });

/** Stubs for one test. Returns each judge prompt. */
const setup = (on: On, judge: string = NONE) => {
  const prompts: string[] = [];
  mock.env(on, { HOME: "/home/u" });
  on("fs.exists", () => ({ value: false }));
  on("session.id", () => ({ value: "s-context" }));
  on("session.model", () => ({ value: "claude-opus-5-5" }));
  on("settings.read", () => ({ value: {} }));
  on("prompt.submit", (_$, e) => ({ text: e.text }));
  on("classic.Stop", () => ({}));
  on("classic.SubagentStop", () => ({}));
  on("turn.complete", (_$, e) => ({ text: e.answer }));
  on("model.complete", (_$, e) => {
    prompts.push(e.prompt);
    return { value: answered(judge) };
  });
  on("ui.log", () => ({ value: undefined }));
  return prompts;
};

/** Clears the record of the main loop. */
const fresh = ($: Engine) =>
  $.turn.complete({
    answer: "",
    durationMs: 1,
    isAborted: true,
    turnId: "t0",
    reason: "aborted",
  });

const submit = (
  $: Engine,
  text: string,
  origin: PromptOrigin = { kind: "composer" },
) => $.prompt.submit({ text, wait: false, origin });

const stop = ($: Engine, reply: string) =>
  $.classic.Stop({
    session_id: "s",
    stop_hook_active: false,
    last_assistant_message: reply,
    background_tasks: [],
  });

test("the judge gets the last user prompt and the earlier reply", async ($: Engine, on: On) => {
  const prompts = setup(on);
  await fresh($);
  await submit($, "Is the cache safe?");
  await stop($, "The cache is not safe, because two writers race.");
  await submit($, "No, I think that it is safe.");
  await stop($, "You are right, the cache is safe.");
  const last = prompts.at(-1) ?? "";
  expect(last).toContain("<request>\nNo, I think that it is safe.\n</request>");
  expect(last).toContain("two writers race");
});

test("a prompt that the user did not write is not the request", async ($: Engine, on: On) => {
  const prompts = setup(on);
  await fresh($);
  await submit($, "Fix the build.");
  await submit($, "Task b1 completed.", { kind: "task-notification" });
  await stop($, "The build is fixed.");
  expect(prompts.at(-1)).toContain("<request>\nFix the build.\n</request>");
});

test("a subagent stop gets no request and no earlier reply", async ($: Engine, on: On) => {
  const prompts = setup(on);
  await fresh($);
  await submit($, "Fix the build.");
  await $.classic.SubagentStop({
    session_id: "s",
    stop_hook_active: false,
    agent_id: "a7",
    agent_type: "implementer",
    agent_transcript_path: "/t/a7.jsonl",
    last_assistant_message: "Done.",
  });
  expect(prompts.at(-1)).toContain("<request>\n(none)\n</request>");
  expect(prompts.at(-1)).toContain("<earlier_reply>\n(none)\n</earlier_reply>");
});

test("a `cave` verdict blocks the stop with its rule", async ($: Engine, on: On) => {
  setup(
    on,
    JSON.stringify({
      fault: "cave",
      quote: "You are right, the cache is safe.",
      fix: "Keep the position, or name the evidence that changes it.",
    }),
  );
  await fresh($);
  const out = await stop($, "You are right, the cache is safe.");
  expect(out.block).toContain("no new evidence");
});

test("a `defer` verdict blocks the stop with its rule", async ($: Engine, on: On) => {
  setup(
    on,
    JSON.stringify({
      fault: "defer",
      quote: "Run `bun test` to check it.",
      fix: "Run `bun test`, and report its output.",
    }),
  );
  await fresh($);
  const out = await stop($, "Run `bun test` to check it.");
  expect(out.block).toContain("names no block that stops you");
});
