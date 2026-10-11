// The classic command hooks of the add-on, and the check, through the `codegraph` CLI.
//
//   node cli.mjs session-start   SessionStart: sync the index, and add one line about the graph
//   node cli.mjs search          PreToolUse on Grep and Glob: add the graph result of the searched symbol
//   node cli.mjs sync            PostToolUse: sync the index after an edit or a git change (async hook)
//   node cli.mjs check           print whether `codegraph` is on `PATH` and whether the project has an index
//
// Each hook runs only in a project with `.codegraph/codegraph.db`, and else it prints nothing.
// Each hook fails open: on an error or a timeout it adds nothing and never blocks a call.
// A payload that is not JSON is ignored, and any other error is written to stderr, with exit code 0.
// The add-on never runs `codegraph install` or `codegraph init`, because they change user files.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BACKGROUND_SYNC_TIMEOUT_MS,
  CALLERS_LIMIT,
  GRAPH_CONTEXT_MAX,
  QUERY_TIMEOUT_MS,
  START_SYNC_TIMEOUT_MS,
  SYMBOL_MIN_CHARS,
} from "./limits.mjs";
import {
  checkLines,
  contextText,
  parseJson,
  pickNode,
  SESSION_LINE,
  symbolOf,
} from "./rules.mjs";

/** The project folder of a hook payload. */
export const rootOf = (payload, env) =>
  env.CLAUDE_PROJECT_DIR || payload?.cwd || process.cwd();

/** True when the project has an index. The home folder has a `.codegraph/` for telemetry, with no database. */
export const indexed = (root) =>
  existsSync(join(root, ".codegraph", "codegraph.db"));

/** Runs `codegraph` with `args` in `root`, and gives `{ ok, stdout }`. A missing CLI, a timeout, and a non-zero exit give `ok: false`. */
function codegraph(args, { root, env, timeout }) {
  const r = spawnSync("codegraph", args, {
    cwd: root,
    env,
    encoding: "utf8",
    timeout,
    stdio: ["ignore", "pipe", "ignore"],
  });
  return {
    ok: !r.error && r.status === 0,
    stdout: r.stdout ?? "",
    error: r.error,
  };
}

const context = (hookEventName, additionalContext) => ({
  hookSpecificOutput: { hookEventName, additionalContext },
});

/** The `SessionStart` output: sync the index, then add the line. Nothing when the project has no index or the CLI is missing. */
export function sessionStart(payload, env) {
  const root = rootOf(payload, env);
  if (!indexed(root)) return undefined;
  const sync = codegraph(["sync", "-q"], {
    root,
    env,
    timeout: START_SYNC_TIMEOUT_MS,
  });
  if (sync.error?.code === "ENOENT") return undefined;
  return context("SessionStart", SESSION_LINE);
}

/** The `PreToolUse` output for a `Grep` or `Glob` call, or undefined. It never sets a permission decision. */
export function search(payload, env) {
  const root = rootOf(payload, env);
  if (!indexed(root)) return undefined;
  const symbol = symbolOf(
    payload?.tool_name,
    payload?.tool_input,
    SYMBOL_MIN_CHARS,
  );
  if (!symbol) return undefined;
  const opts = { root, env, timeout: QUERY_TIMEOUT_MS };
  const query = codegraph(["query", "-j", "-l", "10", "--", symbol], opts);
  const node = query.ok && pickNode(parseJson(query.stdout), symbol);
  if (!node) return undefined;
  // `callers` has no `--file` in CodeGraph 1.6.0, so a symbol with several definitions gets the union of their callers.
  const callers = codegraph(
    ["callers", "-j", "-l", String(CALLERS_LIMIT), "--", node.name],
    opts,
  );
  const list = callers.ok ? parseJson(callers.stdout)?.callers : null;
  const text = contextText(node, list, GRAPH_CONTEXT_MAX);
  return text ? context("PreToolUse", text) : undefined;
}

/** Syncs the index. The hook is async, so the wait does not delay the session. */
export function sync(payload, env) {
  const root = rootOf(payload, env);
  if (indexed(root))
    codegraph(["sync", "-q"], {
      root,
      env,
      timeout: BACKGROUND_SYNC_TIMEOUT_MS,
    });
}

/** The lines of the check for `root`. */
export function check(root, env) {
  const version = codegraph(["--version"], {
    root,
    env,
    timeout: QUERY_TIMEOUT_MS,
  });
  return checkLines(version.ok, version.stdout.trim(), indexed(root));
}

const HOOKS = { "session-start": sessionStart, search };

if (import.meta.main) {
  const mode = process.argv[2];
  try {
    if (mode === "check") {
      console.log(check(process.cwd(), process.env).join("\n"));
    } else {
      const payload = parseJson(readFileSync(0, "utf8"));
      if (payload === null) process.exit(0);
      if (mode === "sync") sync(payload, process.env);
      else {
        const out = HOOKS[mode]?.(payload, process.env);
        if (out) process.stdout.write(JSON.stringify(out));
      }
    }
  } catch (err) {
    process.stderr.write(
      `dotclaude-codegraph hook failed: ${err?.stack ?? err}\n`,
    );
  }
}
