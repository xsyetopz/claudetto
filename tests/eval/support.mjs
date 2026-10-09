// Helpers of the eval tests: recorded events and a fake runner.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const ROOT = path.join(import.meta.dirname, "../..");
export const EVALS = path.join(ROOT, "evals");

export const init = (plugins = [], version = "2.1.295") => ({
  type: "system",
  subtype: "init",
  claude_code_version: version,
  plugins,
});
export const say = (text) => ({
  type: "assistant",
  message: { content: [{ type: "text", text }] },
});
export const call = (id, name, input) => ({
  type: "assistant",
  message: { content: [{ type: "tool_use", id, name, input }] },
});
export const ok = (id, content = "ok", is_error = false) => ({
  type: "user",
  message: {
    content: [{ type: "tool_result", tool_use_id: id, content, is_error }],
  },
});
export const done = (final, cost = 0.5) => ({
  type: "result",
  result: final,
  total_cost_usd: cost,
  num_turns: 3,
  duration_ms: 4000,
  usage: {
    input_tokens: 10,
    output_tokens: 20,
    cache_read_input_tokens: 30,
    cache_creation_input_tokens: 40,
  },
});

/** A fake runner: `act(job)` edits the work folder, and the events are recorded. */
export const fakeRunner =
  (events, act = () => {}) =>
  async (job) => {
    act(job);
    return { events, exitCode: 0, timedOut: false };
  };

/** The oracle exec on the host, for fixture folders of this repository only. */
export const hostExec = (cmd, cwd) =>
  spawnSync(cmd[0], cmd.slice(1), { cwd, stdio: "ignore" }).status ?? 1;

export const write = (job, rel, text) => {
  const f = path.join(job.workDir, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
};

export const plugin = [{ name: "dotclaude" }];
