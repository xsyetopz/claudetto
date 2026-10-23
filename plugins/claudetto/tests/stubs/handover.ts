// Stubs of `handover.test.ts`: they record each step in order, so the tests show that the file comes first, then `/clear`, then the prompt.

import type { AgentStatus, On, SessionMessage } from "claude-code";
import { type Engine, mock } from "claude-code/testing";

export const HOUR = 3_600_000;

const ask = {
  tool_use_id: "q1",
  tool: "AskUserQuestion",
  input: {
    questions: [
      {
        question: "Which store?",
        options: [{ label: "sql" }, { label: "files" }],
      },
    ],
  },
  text: 'User has answered your questions: "Which store?"="sql". You can now continue.',
};

const MESSAGES: SessionMessage[] = [
  { role: "user", text: "Build the export.", toolUses: [], handle: "h0" },
  { role: "assistant", text: "", toolUses: [ask], handle: "h1" },
  { role: "user", text: "Use `csv`, not JSON.", toolUses: [], handle: "h2" },
  { role: "assistant", text: "Ok.", toolUses: [], handle: "h3" },
];

/** What the stubs answer: `tokens` is the context, `startedAt` the session start, and `agents` the status of each agent. */
export type World = {
  tokens?: number;
  startedAt?: number;
  agents?: string[];
  tasks?: string;
  turns?: number;
  answer?: Promise<string> | string;
};

/** `steps` are `write`, `command clear`, and `prompt` in order. */
export const stubs = (on: On, world: World = {}) => {
  const seen = {
    steps: [] as string[],
    paths: [] as string[],
    texts: [] as string[],
    prompts: [] as string[],
    args: [] as string[],
    asks: [] as string[],
    logs: [] as string[],
    models: 0,
  };
  const clock = mock.clock(on, { now: 10 * HOUR });
  mock.env(on, { CLAUDE_PROJECT_DIR: "/p" });
  on("session.messages", () => ({ value: MESSAGES }));
  on("session.turns", () => ({ value: world.turns ?? 2 }));
  on("session.usage", () => ({
    value: {
      startedAt: world.startedAt ?? 9 * HOUR,
      context: { window: 1_000_000, tokens: world.tokens ?? 1000 },
      rateLimits: [],
    },
  }));
  on("agent.list", () => ({
    value: (world.agents ?? []).map((status, i) => ({
      id: `a${i}`,
      description: "",
      type: "claudetto:Worker",
      status: status as AgentStatus,
    })),
  }));
  on("fs.list", () => ({
    value:
      world.tasks === undefined
        ? []
        : [{ name: "c", kind: "dir", size: 0, mtimeMs: 0, isLink: false }],
  }));
  on("fs.read", () => {
    if (world.tasks === undefined) throw new Error("ENOENT");
    return { value: world.tasks };
  });
  on("fs.write", (_$, e) => {
    seen.steps.push("write");
    seen.paths.push(e.path);
    seen.texts.push(e.text);
    return { value: undefined };
  });
  on("fs.stat", () => ({
    value: { kind: "file", size: 100, mtimeMs: 0, isLink: false },
  }));
  on("ui.log", (_$, e) => {
    seen.logs.push(e.text);
    return { value: undefined };
  });
  on("command.run", (_$, e) => {
    seen.steps.push(`command ${e.command}`);
    seen.args.push(e.args);
    return { text: "" };
  });
  on("prompt.submit", (_$, e) => {
    seen.steps.push("prompt");
    seen.prompts.push(e.text);
    return { text: e.text };
  });
  const zero = { input_tokens: 0, output_tokens: 0 };
  on("model.fork", () => {
    seen.models++;
    return { value: { isAnswered: false, reason: "nothing-to-fork" } };
  });
  on("model.complete", () => {
    seen.models++;
    const usage = {
      ...zero,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    };
    return { value: { isAnswered: false, reason: "empty-reply", usage } };
  });
  on("model.classify", () => {
    seen.models++;
    return { value: undefined };
  });
  on("tool.call", (_$, e, next) => {
    if (e.tool !== "AskUserQuestion") return next(e);
    seen.asks.push(JSON.stringify(e));
    const question = (e as unknown as { questions: { question: string }[] })
      .questions[0]?.question as string;
    return Promise.resolve(world.answer ?? "No").then((label) => ({
      result: { answers: { [question]: label } },
    }));
  });
  on("classic.Stop", () => ({}));
  on("turn.complete", (_$, e) => ({ text: e.answer }));
  return { seen, clock };
};

/** A `Stop` event with `tasks` in flight in the background. */
export const stop = ($: Engine, tasks: unknown[] = []) =>
  $.classic.Stop({ stop_hook_active: false, background_tasks: tasks as never });

/** The end of a turn of the main thread, which keeps the cache warm. */
export const turnEnd = ($: Engine) =>
  $.turn.complete({
    answer: "Done.",
    durationMs: 1,
    isAborted: false,
    turnId: "t1",
    reason: "answer",
  });

/** A prompt that the user typed in the prompt box. */
export const typed = ($: Engine, text = "Now add the tests.") =>
  $.prompt.submit({ text, wait: false, origin: { kind: "composer" } });

/** The stubs for `world`, a `Stop` event, and the settled clock. */
export const stopped = async ($: Engine, on: On, world: World = {}) => {
  const stubbed = stubs(on, world);
  await stop($);
  await stubbed.clock.settle();
  return stubbed;
};
