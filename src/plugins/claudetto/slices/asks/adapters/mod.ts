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
// The test judge makes one `$.model.complete` call, and its cost comes from the `usage` of the result (D63).
// The `testJudge` option turns the judge off, and a verdict for a diff that the session already judged makes no new call.

import type { EngineInterface, PluginOptions } from "claude-code";
import type { Handler } from "../../../../../kernel/slice.ts";
import { askReason } from "../domain/check.ts";
import { type Reply, remembered } from "../domain/testjudge.ts";
import type { Payload } from "../domain/text.ts";
import {
  FILE_MAX_BYTES,
  TEST_JUDGE_CACHE_ENTRIES,
  TEST_JUDGE_MAX_TOKENS,
  TEST_JUDGE_MODEL,
  TEST_JUDGE_TIMEOUT_MS,
  VERSION_RUN_TIMEOUT_MS,
} from "../limits.ts";
import { NOTICE_JUDGE_USAGE } from "../prompts.ts";

/** The `testJudge` option, which the generated `register` sets once with `keepOptions`. It is on by default. */
const kept: { testJudge: boolean } = { testJudge: true };

/** Keeps the `testJudge` option from the `userConfig` values of the plugin. */
export const keepOptions = (options: PluginOptions): void => {
  kept.testJudge = options["testJudge"] !== false;
};

/** The verdicts of the test judge, by request, for each call of this hooks module. */
const verdicts = new Map<string, Reply>();

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

/**
 * One call of the test judge: the text of the reply, or the cause when the model gives no answer.
 * The engine rejects only a request that it does not send, so a rejection is a cause too.
 */
const complete = async (
  $: EngineInterface,
  request: { system: string; prompt: string },
): Promise<Reply> => {
  let r: Awaited<ReturnType<EngineInterface["model"]["complete"]>>;
  try {
    r = await $.model.complete({
      model: TEST_JUDGE_MODEL,
      ...request,
      maxTokens: TEST_JUDGE_MAX_TOKENS,
      effort: "low",
      timeoutMs: TEST_JUDGE_TIMEOUT_MS,
    });
  } catch (err) {
    return { cause: String(err) };
  }
  $.ui.log(
    NOTICE_JUDGE_USAGE({
      model: TEST_JUDGE_MODEL,
      input: String(r.usage.input_tokens),
      cacheRead: String(r.usage.cache_read_input_tokens),
      cacheWrite: String(r.usage.cache_creation_input_tokens),
      output: String(r.usage.output_tokens),
    }),
    { to: "debug" },
  );
  if (r.isAnswered) return { text: r.text };
  return {
    cause:
      r.reason === "aborted"
        ? `timeout after ${TEST_JUDGE_TIMEOUT_MS} ms`
        : r.reason,
  };
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
      ...(kept.testJudge && {
        complete: remembered(
          (request) => complete($, request),
          verdicts,
          TEST_JUDGE_CACHE_ENTRIES,
        ),
      }),
    },
  );
  if (!own) return verdict;
  const reason =
    verdict?.decision === "ask" && verdict.reason
      ? `${own}\n\n${verdict.reason}`
      : own;
  return { decision: "ask", reason };
};
