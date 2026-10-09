// The auto-fix hook of dotclaude (design D7), two classic command hooks with one entry point.
// `PostToolUse` on `Edit|Write|MultiEdit|NotebookEdit` appends the edited path to a session file and changes nothing.
// `Stop` runs the project tools of `data.mjs` on the recorded files, once, and gives the issues that remain.
// It returns at once when `stop_hook_active` is true, so it blocks at most one time in a turn.
// It fails quiet: a missing tool, a failed start, a time limit, and any error give no output and let Claude stop.
// It runs no shell, installs no tool, and runs no `package.json` script.
// It is off unless `env.DOTCLAUDE_AUTOFIX` is `1`, which `/dotclaude:setup --with autofix` writes after a question.
// The reason: a hook command runs outside the `Bash` sandbox, and a project tool can load a config that the model wrote.

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { TOOL_TIMEOUT_MS, TOTAL_TIMEOUT_MS } from "./limits.mjs";
import { editedPath, eligible, parseIssues, plan, report } from "./rules.mjs";

/** The session file with the recorded paths, one on each line. */
export function stateFile(sessionId, dir = tmpdir()) {
  return path.join(
    dir,
    `dotclaude-autofix-${String(sessionId).replace(/[^\w-]/g, "_")}.txt`,
  );
}

/** The project folder of the payload. */
const rootOf = (payload, env) =>
  path.resolve(env.CLAUDE_PROJECT_DIR || payload.cwd);

/** True only when the user turned auto-fix on. */
export const enabled = (env) => env.DOTCLAUDE_AUTOFIX === "1";

/** Record the path of one edit. It changes no project file. */
export function record(payload, dir = tmpdir(), env = process.env) {
  if (!enabled(env)) return;
  const file = editedPath(payload?.tool_input);
  if (!file || !payload.session_id) return;
  appendFileSync(
    stateFile(payload.session_id, dir),
    `${path.resolve(payload.cwd ?? "", file)}\n`,
  );
}

/** One run of a tool: the text of its output, or null when the tool is missing, fails to start, or passes the time. */
function runTool(command, args, cwd, timeout) {
  const r = spawnSync(command, args, { cwd, encoding: "utf8", timeout });
  if (r.error || r.signal)
    return { out: null, timedOut: r.error?.code === "ETIMEDOUT" };
  return { out: `${r.stdout ?? ""}\n${r.stderr ?? ""}`, timedOut: false };
}

/** The `Stop` output for the payload, or undefined. The state file is read once and removed. */
export function fix(
  payload,
  env = process.env,
  dir = tmpdir(),
  now = Date.now,
) {
  if (!enabled(env) || !payload?.session_id) return undefined;
  const state = stateFile(payload.session_id, dir);
  let recorded;
  try {
    recorded = readFileSync(state, "utf8");
  } catch {
    return undefined;
  }
  rmSync(state, { force: true });
  if (payload.stop_hook_active) return undefined;
  const root = rootOf(payload, env);
  const files = [...new Set(recorded.split("\n").filter(Boolean))].filter(
    (f) => eligible(root, f) && existsSync(f),
  );
  const io = { exists: existsSync, read: (f) => readFileSync(f, "utf8") };
  const deadline = now() + TOTAL_TIMEOUT_MS;
  const issues = [];
  for (const run of plan(root, files, io))
    for (const step of run.steps) {
      const left = deadline - now();
      if (left <= 0) return undefined;
      const { out, timedOut } = runTool(
        run.command,
        step,
        root,
        Math.min(TOOL_TIMEOUT_MS, left),
      );
      if (timedOut) return undefined;
      if (out !== null) issues.push(...parseIssues(run.tool, out, root));
    }
  return report(issues);
}

if (import.meta.main) {
  try {
    const payload = JSON.parse(readFileSync(0, "utf8"));
    let out;
    if (payload.hook_event_name === "Stop") out = fix(payload);
    else record(payload);
    if (out) process.stdout.write(JSON.stringify(out));
  } catch {}
}
