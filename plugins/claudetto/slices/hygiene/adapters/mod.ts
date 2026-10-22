// The mod handlers of the `hygiene` slice (spec `session-hygiene`, D12 of change `0-3-0`):
// the cleanup at session start, and the edit ledger.
// The cleanup also removes the leftover `fswatch-probe-*` folders of anthropics/claude-code#104170.
// The first run of `session.start` holds the first prompt, so the sweep runs after the hook returns.
// The count goes to `$.ui.log`, which the model does not read (D48).

import type { EngineInterface } from "claude-code";
import type { Handler } from "../../../kernel/slice.ts";
import { cleanupArgv, parseCleanup } from "../domain/cleanup.ts";
import {
  changedFiles,
  GONE,
  hash64,
  type Ledger,
  withEdit,
  withTold,
} from "../domain/ledger.ts";
import { removedCount, sweepArgv } from "../domain/probes.ts";
import {
  DEFAULT_CLEANUP_DAYS,
  LEDGER_WRITE_TRIES,
  SWEEP_TIMEOUT_MS,
  WORKTREES_DIR,
} from "../limits.ts";
import {
  CLEANED,
  FILE_CHANGED,
  UNKNOWN_KEPT,
  WORKTREES_KEPT,
} from "../prompts.ts";

/** The age in days of `cleanupPeriodDays` of Claude Code, or 30 when it is not a whole number over 0. No claudetto setting sets the age. */
const daysOf = async ($: EngineInterface): Promise<number> => {
  const days = await $.settings
    .read({ key: "cleanupPeriodDays" })
    .catch(() => undefined);
  return typeof days === "number" && Number.isInteger(days) && days > 0
    ? days
    : DEFAULT_CLEANUP_DAYS;
};

/** The folder that holds the session files of Claude Code: `CLAUDE_CONFIG_DIR`, or `~/.claude`. */
const sessionsOf = async ($: EngineInterface): Promise<string> => {
  const config = await $.env.get("CLAUDE_CONFIG_DIR").catch(() => undefined);
  const home = (await $.env.get("HOME").catch(() => undefined)) || "";
  return `${(config || `${home}/.claude`).replace(/\/+$/, "")}/sessions`;
};

const outputOf = async ($: EngineInterface, argv: string[]): Promise<string> =>
  $.process.run(argv, { timeoutMs: SWEEP_TIMEOUT_MS }).then(
    (run) => run.stdout,
    () => "",
  );

/**
 * The cleanup at session start: it removes the folders of ended sessions, the worktrees that keep no work, and the leftover probe folders.
 * It logs one line for what it removed and one for what it kept, and nothing when both are empty.
 * A failure removes nothing more and logs nothing.
 */
export const sweep = async ($: EngineInterface): Promise<void> => {
  const tmp = (await $.env.get("CLAUDE_CODE_TMPDIR")) || "/tmp";
  const probes = removedCount(await outputOf($, sweepArgv(tmp)));
  const root = await $.session.root().catch(() => "");
  const report = parseCleanup(
    await outputOf(
      $,
      cleanupArgv({
        tmp,
        sessions: await sessionsOf($),
        worktrees: root ? `${root.replace(/\/+$/, "")}/${WORKTREES_DIR}` : "",
        days: await daysOf($),
        current: await $.session.id(),
      }),
    ),
  );
  const removed =
    report.folders + report.files + report.worktrees.length + probes;
  if (removed > 0)
    $.ui.log(
      CLEANED({
        folders: String(report.folders),
        bytes: String(report.bytes),
        files: String(report.files),
        worktrees: String(report.worktrees.length),
        probes: String(probes),
      }),
    );
  if (report.kept.length > 0)
    $.ui.log(
      WORKTREES_KEPT({
        count: String(report.kept.length),
        list: report.kept.map((k) => `\`${k.path}\` (${k.reason})`).join(", "),
      }),
    );
  if (report.unknown > 0)
    $.ui.log(UNKNOWN_KEPT({ count: String(report.unknown) }));
};

/** The `session.start` hook: it starts the sweep and does not wait for it. */
export const onStart: Handler<"session.start"> = ($, e, next) => {
  void sweep($).catch(() => undefined);
  return next(e);
};

// The ledger is one value of `$.state`: the host holds it for the session, for the main loop and each subagent alike (task 12.1).
const ledgerRef = { plugin: "claudetto", key: "ledger" } as const;

/** Writes `change(ledger)`, and reads the ledger again when another write landed first. */
const updateLedger = async (
  $: EngineInterface,
  change: (ledger: Ledger) => Ledger,
): Promise<void> => {
  for (let i = 0; i < LEDGER_WRITE_TRIES; i++) {
    const { value, version } = await $.state.get(ledgerRef);
    const { isSet } = await $.state.set(ledgerRef, change(value ?? {}), {
      ifVersion: version,
    });
    if (isSet) return;
  }
};

const editedPath = (input: unknown): string | null => {
  const path = (input as { file_path?: unknown } | null)?.file_path;
  return typeof path === "string" && path !== "" ? path : null;
};

/** The hash of the content of `path` now, or `GONE` for a file that does not exist or cannot be read. */
const hashOf = async ($: EngineInterface, path: string): Promise<string> =>
  $.fs.read(path).then(
    (text) => hash64(text),
    () => GONE,
  );

/**
 * `classic.PostToolUse`: after an `Edit` or a `Write` call that succeeded, the ledger keeps the path, the hash of the file, and the agent.
 * A failed call raises `PostToolUseFailure`, so it adds nothing.
 * A failure of the ledger never stops the tool result.
 */
export const onEdited: Handler<"classic.PostToolUse"> = async ($, e, next) => {
  const path =
    e.tool_name === "Edit" || e.tool_name === "Write"
      ? editedPath(e.tool_input)
      : null;
  if (path !== null) {
    const agent = e.agent_id ? (e.agent_type ?? e.agent_id) : "main";
    try {
      const hash = await hashOf($, path);
      if (hash !== GONE)
        await updateLedger($, (ledger) => withEdit(ledger, path, hash, agent));
    } catch {
      // The ledger is a help for the agent, so a fault of it adds no stop.
    }
  }
  return next(e);
};

/**
 * `classic.UserPromptSubmit`: one line for each file of the ledger that changed after the last edit of its agent.
 * With no such file the hook adds nothing, so the turn pays no token.
 */
export const onPrompt: Handler<"classic.UserPromptSubmit"> = async (
  $,
  e,
  next,
) => {
  const answer = await next(e);
  try {
    const { value: ledger } = await $.state.get(ledgerRef);
    if (!ledger) return answer;
    const now: Record<string, string> = {};
    for (const path of Object.keys(ledger)) now[path] = await hashOf($, path);
    const changed = changedFiles(ledger, now);
    if (changed.length === 0) return answer;
    await updateLedger($, (held) => withTold(held, changed, now));
    return {
      ...answer,
      additionalContext: [
        ...(answer.additionalContext ?? []),
        changed.map((c) => FILE_CHANGED(c)).join("\n"),
      ],
    };
  } catch {
    return answer;
  }
};
