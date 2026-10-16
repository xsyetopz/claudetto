// The mod handler of the `asks` slice:
// `tool.check` asks before a `Bash`, `Write`, `Edit`, or `MultiEdit` call that the checks in `domain/` flag (design D34).
//
// The handler only asks, and it keeps a deny of the engine, so it never weakens a rule of the user.
// The hook has no catch-all on purpose.
// When it throws after `next` resolved, Claude Code logs the failure and the result of `next` stands, such as the ask of the `policy` slice.
// When it throws before `next`, for example on a file read that rejects, Claude Code skips the hook and the call runs.
// A `catch` here names the error that it expects, and the others reach that log.
//
// `claude plugin validate` follows `$` only into a function of one file,
// and each `$.env.get` call needs a literal name.
// For this reason, each function that touches `$` is here, and the rules are in `domain/`.

import type { EngineInterface } from "claude-code";
import type { Handler } from "../../../../../kernel/slice.ts";
import { askReason } from "../domain/check.ts";
import type { Payload } from "../domain/text.ts";
import { FILE_MAX_BYTES, VERSION_RUN_TIMEOUT_MS } from "../limits.ts";

/**
 * The text of `file` when it is a regular file of at most `max` bytes, else null.
 * An absent file, a folder, and a link give null, so the check reads nothing.
 */
const fileText = async ($: EngineInterface, file: string, max: number) => {
  if (!(await $.fs.exists(file))) return null;
  const stat = await $.fs.stat(file);
  if (stat.kind !== "file" || stat.size > max) return null;
  return $.fs.read(file);
};

/** True when `file` is a regular file of more than `max` bytes. */
const isLarge = async ($: EngineInterface, file: string, max: number) => {
  if (!(await $.fs.exists(file))) return false;
  const stat = await $.fs.stat(file);
  return stat.kind === "file" && stat.size > max;
};

/** The text of `bun --version`, or null when `bun` does not run. The catch has no narrower test, because `$.process.run` documents no error type. */
const bunVersion = async ($: EngineInterface): Promise<string | null> => {
  try {
    const out = await $.process.run(["bun", "--version"], {
      timeoutMs: VERSION_RUN_TIMEOUT_MS,
    });
    return out.exitCode === 0 ? out.stdout.trim() : null;
  } catch {
    return null;
  }
};

// The ask reason of `asks` comes first, then the ask reason of `next`, so the ask of another slice stays.
export const onCheck: Handler<"tool.check"> = async ($, e, next) => {
  const verdict = await next(e);
  if (verdict?.decision === "deny") return verdict;
  const cwd = await $.session.cwd();
  const root = (await $.env.get("CLAUDE_PROJECT_DIR")) || cwd;
  const home = (await $.env.get("HOME")) || undefined;
  const facts = {
    exists: (file: string) => $.fs.exists(file),
    bunVersion: () => bunVersion($),
  };
  // The input of these tools has the fields that the checks read, as `Payload` gives them.
  const own = await askReason(
    { cwd, tool_name: e.tool, tool_input: e.input as Payload["tool_input"] },
    {
      read: (file) => fileText($, file, FILE_MAX_BYTES),
      large: (file) => isLarge($, file, FILE_MAX_BYTES),
      root,
      home,
      facts,
    },
  );
  if (!own) return verdict;
  const reason =
    verdict?.decision === "ask" && verdict.reason
      ? `${own}\n\n${verdict.reason}`
      : own;
  return { decision: "ask", reason };
};
