// The hook lab of the `handoff` slice: `claude plugin test plugins/dotclaude` fires the events with stubs.
// No command runs, no session starts, and no model call goes out.
// A call that `$.tool.call` makes runs in the main loop, and the types drop `agentId` from it (`ToolCallArgs`),
// so the notes for a subagent are tested in `tests/dotclaude/handoff/context.test.ts` through `domain/`.
// The stub of `process.run` answers the CLIs `dotclaude-handoff` and `dotclaude-spec`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const FILE = ".dotclaude/handoff/handoff-20261012T101010Z.md";
const USAGE = {
  input_tokens: 90_000,
  output_tokens: 10,
  cache_read_input_tokens: 20_000,
  cache_creation_input_tokens: 0,
  model: "claude-sonnet-5-5",
};

/** The stubs of one test: the context share, the answers of the CLIs, and the lists of what the mod did. */
const stub = (on: On, percent: number) => {
  const seen = {
    /** Whether the handoff file exists, as the CLI `dotclaude-handoff newest` tells. */
    written: true,
    /** Whether a `tool.call` fails. */
    toolFails: false,
    run: [] as string[],
    commands: [] as string[],
    prompts: [] as string[],
  };
  on("session.usage", () => ({
    value: {
      startedAt: 0,
      context: { window: 300_000, percent },
      rateLimits: [],
    },
  }));
  on("turn.complete", (_$, e) => ({ text: e.answer }));
  on("tool.call", () =>
    seen.toolFails ? { result: "failed", isError: true } : { result: "ok" },
  );
  on("skill.prompt", (_$, e) => ({ text: e.text }));
  on("turn.step", async function* (_$, e) {
    yield* [];
    return {
      turnId: e.turnId,
      index: e.index,
      answer: "",
      toolUses: [],
      stopReason: "end_turn" as const,
      usage: { ...USAGE },
    };
  });
  on("process.run", (_$, e) => {
    const name = e.argv[2]?.split("/").pop() ?? "";
    seen.run.push(`${name} ${e.argv.slice(3).join(" ")}`);
    const stdout = name === "dotclaude-spec" ? "next: P14" : FILE;
    const missing = e.argv[3] === "newest" && !seen.written;
    return {
      value: {
        exitCode: missing ? 1 : 0,
        stdout,
        stderr: "",
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    };
  });
  on("command.run", (_$, e) => {
    seen.commands.push(e.command);
    return { text: "" };
  });
  on("prompt.submit", (_$, e) => {
    seen.prompts.push(e.text);
    return { text: e.text };
  });
  return seen;
};

const complete = (
  $: Engine,
  reason: "answer" | "aborted" | "error" = "answer",
) =>
  $.turn.complete({
    answer: "done",
    durationMs: 1,
    isAborted: reason === "aborted",
    turnId: "t",
    reason,
  });

/** Whether the turn result carries a note beyond the answer, such as the `manual` hint. */
const hasHint = (out: { text: string }) => out.text !== "done";

/** Runs the Bash command `command` as a call of the main session. */
const bash = ($: Engine, command: string) =>
  $.tool.call({ tool: "Bash", command });

const AUTO = { options: { mainHandover: "auto" } };

test(
  "below the context bound the turn ends with no handoff",
  { options: { mainHandover: "auto" } },
  async ($: Engine, on: On) => {
    const seen = stub(on, 10);
    await complete($);
    expect(seen.prompts).toEqual([]);
    expect(seen.commands).toEqual([]);
  },
);

test("with `manual` a context over the bound adds the hint to run `/handoff`", async ($: Engine, on: On) => {
  stub(on, 90);
  const out = await complete($);
  expect(hasHint(out)).toBe(true);
});

test(
  "with `off` a context over the bound starts no handoff",
  { options: { mainHandover: "off" } },
  async ($: Engine, on: On) => {
    const seen = stub(on, 90);
    const out = await complete($);
    expect(out.text).toBe("done");
    expect(seen.prompts).toEqual([]);
  },
);

test("a step of the main session adds no note to a later call", async ($: Engine, on: On) => {
  stub(on, 10);
  const out = await $.tool.call({ tool: "Read", file_path: "/p/a.ts" });
  expect(out.context ?? []).toEqual([]);
});

/** Reads a step to its end and gives its result, which is the return value of the stream. */
const step = async ($: Engine, agentId?: string) => {
  const chunks = $.turn.step({
    turnId: "t",
    index: 0,
    model: USAGE.model,
    messageCount: 1,
    ...(agentId ? { agentId } : {}),
  });
  let next = await chunks.next();
  while (!next.done) next = await chunks.next();
  return next.value;
};

test("a step of the main session returns the result of the engine", async ($: Engine, on: On) => {
  stub(on, 10);
  const result = await step($);
  expect(result.usage?.model).toBe(USAGE.model);
});

test("a step of a subagent returns the result of the engine", async ($: Engine, on: On) => {
  stub(on, 10);
  const result = await step($, "a1");
  expect(result.usage?.input_tokens).toBe(USAGE.input_tokens);
});

test("the skill `/handoff` names the handoff file in its text", async ($: Engine, on: On) => {
  stub(on, 10);
  const out = await $.skill.prompt({
    skill: "dotclaude:handoff",
    text: "Write it.",
  });
  expect(out.text).toContain(FILE);
});

test("another skill gets no handoff file", async ($: Engine, on: On) => {
  const seen = stub(on, 10);
  const out = await $.skill.prompt({
    skill: "dotclaude:setup",
    text: "Set up.",
  });
  expect(out.text).toBe("Set up.");
  expect(seen.run).toEqual([]);
});

test(
  "with `auto` a context over the bound writes the file, clears, and resumes",
  { options: { mainHandover: "auto" } },
  async ($: Engine, on: On) => {
    const seen = stub(on, 90);
    await complete($);
    expect(seen.prompts.length).toBe(1);
    expect(seen.prompts[0]).toContain(FILE);
    expect(seen.commands).toEqual([]);
    await complete($);
    expect(seen.commands).toEqual(["clear"]);
    expect(seen.prompts.length).toBe(2);
    expect(seen.prompts[1]).toContain(FILE);
    expect(seen.prompts[1]).toContain("next: P14");
  },
);

test("a package that goes to `done` adds the hint", async ($: Engine, on: On) => {
  stub(on, 10);
  await bash($, "dotclaude-spec lane P13 done");
  expect(hasHint(await complete($))).toBe(true);
});

test("a merge of a package adds the hint", async ($: Engine, on: On) => {
  stub(on, 10);
  await bash($, "dotclaude-spec merge P13 feature-branch");
  expect(hasHint(await complete($))).toBe(true);
});

test("a lane command that fails adds no hint", async ($: Engine, on: On) => {
  const seen = stub(on, 10);
  seen.toolFails = true;
  await bash($, "dotclaude-spec lane P13 done");
  expect(hasHint(await complete($))).toBe(false);
});

test("the lane text in a quoted argument adds no hint", async ($: Engine, on: On) => {
  stub(on, 10);
  await bash($, 'git commit -m "x; dotclaude-spec lane P1 done"');
  await bash($, "echo dotclaude-spec lane P1 done");
  expect(hasHint(await complete($))).toBe(false);
});

test("a lane command after `cd` and `&&` adds the hint", async ($: Engine, on: On) => {
  stub(on, 10);
  await bash($, "cd /p && dotclaude-spec lane P13 done");
  expect(hasHint(await complete($))).toBe(true);
});

test("a lane hint follows a context hint in the same episode", async ($: Engine, on: On) => {
  stub(on, 90);
  expect(hasHint(await complete($))).toBe(true);
  expect(hasHint(await complete($))).toBe(false);
  await bash($, "dotclaude-spec lane P13 done");
  expect(hasHint(await complete($))).toBe(true);
});

test(
  "an aborted write turn drops the handoff and starts none again",
  { ...AUTO },
  async ($: Engine, on: On) => {
    const seen = stub(on, 90);
    await complete($);
    expect(seen.prompts.length).toBe(1);
    await complete($, "aborted");
    await complete($);
    await complete($);
    expect(seen.commands).toEqual([]);
    expect(seen.prompts.length).toBe(1);
  },
);

test(
  "a write turn that ends in an error runs no resume",
  { ...AUTO },
  async ($: Engine, on: On) => {
    const seen = stub(on, 90);
    await complete($);
    await complete($, "error");
    expect(seen.commands).toEqual([]);
    expect(seen.prompts.length).toBe(1);
  },
);

test(
  "a turn of the user in the middle of the cycle keeps the handoff",
  { ...AUTO },
  async ($: Engine, on: On) => {
    const seen = stub(on, 90);
    seen.written = false;
    await complete($);
    await complete($);
    expect(seen.commands).toEqual([]);
    seen.written = true;
    await complete($);
    expect(seen.commands).toEqual(["clear"]);
    expect(seen.prompts.length).toBe(2);
    expect(seen.prompts[1]).toContain(FILE);
  },
);

test(
  "with no file written the write prompt goes out twice and then the hint goes to the user",
  { ...AUTO },
  async ($: Engine, on: On) => {
    const seen = stub(on, 90);
    seen.written = false;
    const outs = [];
    for (let i = 0; i < 8; i++) outs.push(await complete($));
    expect(seen.prompts.length).toBe(2);
    expect(seen.commands).toEqual([]);
    expect(outs.filter(hasHint).length).toBe(1);
  },
);
