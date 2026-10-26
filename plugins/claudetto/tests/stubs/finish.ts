// Stubs and helpers of the `finish` lab tests (`finish.test.ts`): the state file in memory, and no real process.

import type { AgentStatus, On, SessionMessage } from "claude-code";
import type { Engine } from "claude-code/testing";
import { ran, stubState } from "./process.ts";

const FILE = ".claudetto/goal.json";

export type Note = { tag: string; line: string; explain: string };

/** The stubs for the state `goal` (the file text, or `null`). `codes` are the exit codes of the check, one for each run, and the last repeats. */
export const stub = (on: On, goal: unknown = null, codes: number[] = [0]) => {
  const file = { text: goal === null ? null : JSON.stringify(goal) };
  const runs: string[][] = [];
  const prompts: string[] = [];
  const files = new Map<string, string>();
  const store = new Map<string, unknown>();
  const git = { out: "" };
  on("command.run", (_$, e) => ({ text: `core ${e.command}` }));
  on("fs.read", (_$, e) =>
    files.has(e.path)
      ? { value: files.get(e.path) ?? "" }
      : file.text === null || !e.path.endsWith(FILE)
        ? { deny: "missing" }
        : { value: file.text },
  );
  on("fs.write", (_$, e) => {
    if (e.path.endsWith(FILE)) file.text = e.text;
    return { value: undefined };
  });
  on("clock.now", () => ({ value: 0 }));
  on("session.usage", () => ({ value: { context: { tokens: 0 } } as never }));
  on("session.turns", () => ({ value: 0 }));
  on("process.run", (_$, e) => {
    if (e.argv[0] === "git") return ran(git.out);
    runs.push([...e.argv]);
    const exitCode = codes[Math.min(runs.length - 1, codes.length - 1)] ?? 0;
    return ran(exitCode ? "FAIL: 2 tests" : "ok", exitCode);
  });
  stubState(on, store);
  on("classic.Stop", () => ({}));
  on("env.get", () => ({ value: "/proj" }));
  on("clock.after", () => ({ value: undefined }));
  on("prompt.submit", (_$, e) => {
    prompts.push(e.text);
    return { drop: "test" };
  });
  return {
    runs,
    prompts,
    store,
    git,
    files,
    state: () => (file.text === null ? null : JSON.parse(file.text)),
  };
};

/** The command `/command args`. */
export const slash = ($: Engine, command: string, args = "") =>
  $.command.run({
    command,
    args,
    origin: { kind: "composer" },
    presentation: { isFullscreen: false, columns: 80 },
  });

/** `/goal args`. */
export const typed = ($: Engine, args = "") => slash($, "goal", args);

/** The `Stop` event, with `stop_hook_active` as Claude Code sets it. */
export const stop = ($: Engine, active = false) =>
  $.classic.Stop({ stop_hook_active: active });

/** Stubs the log lines of `$.ui.log`. */
export const logs = (on: On): string[] => {
  const lines: string[] = [];
  on("ui.log", (_$, e) => {
    lines.push(e.text);
    return { value: undefined };
  });
  return lines;
};

/** The `Stop` event with the last reply. */
export const reply = ($: Engine, text: string) =>
  $.classic.Stop({ stop_hook_active: false, last_assistant_message: text });

export const applied = (): SessionMessage => ({
  role: "user",
  text: "<command-message>claudetto:apply</command-message>\n<command-name>/claudetto:apply</command-name>",
  toolUses: [],
});

/** `stub` with the transcript `rows`, which starts with the `/claudetto:apply` row, and the agent statuses `agents`. `agent.down` makes `$.agent.list()` fail. */
export const looped = (on: On, goal: unknown = null, codes: number[] = [0]) => {
  const rows: SessionMessage[] = [applied()];
  const agents: string[] = [];
  const agent = { down: false };
  on("session.messages", () => ({ value: rows }));
  on("agent.list", () =>
    agent.down
      ? { deny: "no list" }
      : {
          value: agents.map((status, i) => ({
            id: `a${i}`,
            description: "",
            type: "claudetto:Hephaestus",
            status: status as AgentStatus,
          })),
        },
  );
  return { ...stub(on, goal, codes), rows, agents, agent };
};

export const PLAN = "/proj/openspec/changes/x/tasks.md";

/** A row of the transcript: a prompt, an `Edit` of `file` that ticks task `id`, or the answer to a tool call. */
export const prompt = (text: string): SessionMessage => ({
  role: "user",
  text,
  toolUses: [],
});
export const ticks = (id: string, file = PLAN): SessionMessage => ({
  role: "assistant",
  text: "",
  handle: "h",
  toolUses: [
    {
      tool_use_id: `t${id}`,
      tool: "Edit",
      input: {
        file_path: file,
        old_string: `- [ ] ${id} Do it`,
        new_string: `- [x] ${id} Do it`,
      },
      text: "ok",
    },
  ] as never,
});
/** A row with an `Edit` of `file`. */
export const edits = (file: string): SessionMessage => ({
  role: "assistant",
  text: "",
  handle: "h",
  toolUses: [
    { tool_use_id: "e", tool: "Edit", input: { file_path: file }, text: "ok" },
  ] as never,
});
/** A row with a `Bash` call of `command` that exits `0`, or fails with `isError`. */
export const bash = (command: string, isError = false): SessionMessage => ({
  role: "assistant",
  text: "",
  handle: "h",
  toolUses: [
    { tool_use_id: "b", tool: "Bash", input: { command }, text: "ok", isError },
  ] as never,
});
export const answered = (): SessionMessage => ({
  role: "user",
  text: "",
  toolUses: [],
  toolResults: [{ tool_use_id: "t", text: "ok", isError: false }] as never,
});

/** Stubs a `tasks.md` of two open tasks and a session whose Bash uses `commands` all passed. */
export const tasks = (on: On, commands: string[] = []) => {
  on("tool.call", () => ({ result: "ok" }));
  on("fs.exists", () => ({ value: true }));
  on("fs.read", () => ({
    value: "- [ ] 10.1 Add the test\n- [ ] 10.2 Run `just lab`\n",
  }));
  on("session.messages", () => ({
    value: [
      {
        role: "assistant",
        text: "",
        handle: "h",
        toolUses: commands.map((command, i) => ({
          tool_use_id: `b${i}`,
          tool: "Bash",
          input: { command },
          text: "ok",
        })),
      },
    ] as SessionMessage[],
  }));
};

/** The `Edit` that ticks the box of task `id` in a `tasks.md`. */
export const tick = ($: Engine, id: string) =>
  $.tool.call({
    tool: "Edit",
    file_path: "/p/tasks.md",
    old_string: `- [ ] ${id}`,
    new_string: `- [x] ${id}`,
  });
