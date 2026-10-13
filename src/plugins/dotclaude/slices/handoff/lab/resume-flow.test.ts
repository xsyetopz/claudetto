// The hook lab of the handoff flow: a retry that writes a new path, and a merge to `done` in the `off` mode.
// Like `handoff.test.ts`, it fires the events with stubs, and no command runs and no model call goes out.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

// The turns that wait for the handoff file. This copies `HANDOFF_WAIT_TURNS` of `slices/handoff/limits.ts`,
// because a lab file goes to `tests/` of the plugin, where a relative import does not resolve.
const WAIT_TURNS = 2;

const FIRST = ".dotclaude/handoff/handoff-20261012T101010Z.md";
const SECOND = ".dotclaude/handoff/handoff-20261012T101011Z.md";
const USAGE = {
  input_tokens: 90_000,
  output_tokens: 10,
  cache_read_input_tokens: 20_000,
  cache_creation_input_tokens: 0,
  model: "claude-sonnet-5-5",
};

/**
 * The stubs of one test. `paths` gives the paths of the `path` calls in order.
 * `newest` is the file that `newest` names, or undefined while Claude has written no file.
 */
const stub = (on: On, percent: number) => {
  const seen = {
    paths: [FIRST, SECOND],
    newest: undefined as string | undefined,
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
  on("tool.call", () => ({ result: "ok" }));
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
    const verb = e.argv[3];
    let stdout = "next: P14";
    let exitCode = 0;
    if (name === "dotclaude-handoff" && verb === "path") {
      stdout = seen.paths.shift() ?? FIRST;
    } else if (name === "dotclaude-handoff" && verb === "newest") {
      stdout = seen.newest ?? "";
      exitCode = seen.newest === undefined ? 1 : 0;
    }
    return {
      value: {
        exitCode,
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

const complete = ($: Engine) =>
  $.turn.complete({
    answer: "done",
    durationMs: 1,
    isAborted: false,
    turnId: "t",
    reason: "answer",
  });

const AUTO = { options: { mainHandover: "auto" } };

test(
  "a handoff file that Claude writes at the first path after the retry is resumed",
  AUTO,
  async ($: Engine, on: On) => {
    const seen = stub(on, 90);
    await complete($);
    for (let turn = 0; turn < WAIT_TURNS; turn += 1) {
      await complete($);
    }
    expect(seen.prompts).toHaveLength(2);
    seen.newest = FIRST;
    await complete($);
    expect(seen.commands).toContain("clear");
    expect(seen.prompts.at(-1)).toContain(FIRST);
  },
);

test(
  "with `off` a package that goes to `done` leaves no handoff for a later turn",
  { options: { mainHandover: "off" } },
  async ($: Engine, on: On) => {
    const seen = stub(on, 10);
    await $.tool.call({
      tool: "Bash",
      command: "dotclaude-spec merge P01",
    });
    await complete($);
    expect(seen.prompts).toEqual([]);
  },
);

test(
  "a turn in `auto` with no trigger starts no handoff after an `off` turn",
  AUTO,
  async ($: Engine, on: On) => {
    const seen = stub(on, 10);
    await complete($);
    expect(seen.prompts).toEqual([]);
  },
);
