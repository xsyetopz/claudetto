// The mod handlers of the `hygiene` slice (spec `session-hygiene`, D12 of change `0-3-0`): the cleanup at session start, and the edit ledger.
// The first run of `session.start` holds the first prompt, so the sweep runs after the hook returns.
// The count goes to `$.ui.log`, which the model does not read (D48).

import type { EngineInterface, MatchedHook } from "claude-code";
import type { Handler } from "../../../../kernel/hooks.ts";
import {
  GONE,
  hash64,
  type LedgerLine,
  ledgerPath,
  ledgerTmp,
  parseLedger,
  statusPaths,
  tempDirs,
  withStateIgnore,
} from "../../../project/index.ts";
import { isGitView, whoChanged } from "../domain/authors.ts";
import { cleanupArgv, parseCleanup } from "../domain/cleanup.ts";
import { titleHeadings } from "../domain/headings.ts";
import {
  changedFiles,
  ledgerText,
  withEdit,
  withTold,
} from "../domain/ledger.ts";
import { removedNotice } from "../domain/notice.ts";
import { removedCount, sweepArgv } from "../domain/probes.ts";
import {
  BASH_CHANGE_MAX_MS,
  BASH_CHANGE_SLACK_MS,
  DEFAULT_CLEANUP_DAYS,
  GIT_TIMEOUT_MS,
  HEADINGS_FILE_MAX,
  LEDGER_WRITE_TRIES,
  SWEEP_TIMEOUT_MS,
  WHO_FILES_MAX,
  WORKTREES_DIR,
} from "../limits.ts";
import { FILE_CHANGED, HEADINGS_CASED } from "../prompts.ts";

/** `cleanupPeriodDays` of Claude Code, or 30 when it is not a whole number over 0. */
const daysOf = async ($: EngineInterface): Promise<number> => {
  const days = await $.settings
    .read({ key: "cleanupPeriodDays" })
    .catch(() => undefined);
  return typeof days === "number" && Number.isInteger(days) && days > 0
    ? days
    : DEFAULT_CLEANUP_DAYS;
};

/** The session files of Claude Code, in `CLAUDE_CONFIG_DIR` or `~/.claude`. */
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

/** Removes the folders of ended sessions, the worktrees that keep no work, and the leftover probe folders (anthropics/claude-code#104170), and logs one line for them. */
export const sweep = async ($: EngineInterface): Promise<void> => {
  const dirs = await tempDirs(
    {
      TMPDIR: await $.env.get("TMPDIR"),
      CLAUDE_CODE_TMPDIR: await $.env.get("CLAUDE_CODE_TMPDIR"),
    },
    (path) =>
      $.fs.stat(path, { resolve: true }).then(
        (s) => s.realPath ?? path,
        () => path,
      ),
  );
  const root = await $.session.root().catch(() => "");
  const roots = {
    sessions: await sessionsOf($),
    worktrees: root ? `${root.replace(/\/+$/, "")}/${WORKTREES_DIR}` : "",
    days: await daysOf($),
    current: await $.session.id(),
  };
  let probes = 0;
  let out = "";
  // Each real folder once (`/tmp` and `/private/tmp` count once), and the worktrees only in the first run.
  for (const [i, tmp] of [...new Set(dirs.map((d) => d[1]))].entries()) {
    probes += removedCount(await outputOf($, sweepArgv(tmp)));
    out += await outputOf(
      $,
      cleanupArgv({ ...roots, tmp, worktrees: i ? "" : roots.worktrees }),
    );
  }
  const report = parseCleanup(out);
  const notice = removedNotice({
    folders: report.folders,
    files: report.files,
    worktrees: report.worktrees.length,
    probes,
    bytes: report.bytes,
  });
  if (notice !== null) $.ui.log(notice);
};

/** In a project with `.git`, writes `/.claudetto/` to `.gitignore` when no entry covers the folder, and creates the file when it is missing. */
const ignoreState = async ($: EngineInterface): Promise<void> => {
  const root = (await $.session.root()).replace(/\/+$/, "");
  if (!(await $.fs.exists(`${root}/.git`))) return;
  const file = `${root}/.gitignore`;
  const text = (await $.fs.exists(file)) ? await $.fs.read(file) : "";
  const next = withStateIgnore(text);
  if (next !== text) await $.fs.write(file, next);
};

/** Starts the sweep and does not wait for it. */
export const onStart: Handler<"session.start"> = async ($, e, next) => {
  void sweep($).catch(() => undefined);
  await ignoreState($).catch(() => undefined);
  return next(e);
};

// What this session was told is one value of `$.state`, for the main loop and each subagent alike (task 12.1).
const toldRef = { plugin: "claudetto", key: "told" } as const;

const fileOf = async ($: EngineInterface): Promise<string> =>
  ledgerPath(
    ledgerTmp(await $.env.get("TMPDIR").catch(() => undefined)),
    await $.session.root(),
  );

const readLedger = async ($: EngineInterface, file: string) =>
  parseLedger(((await $.fs.exists(file)) && (await $.fs.read(file))) || "");

const same = (a: LedgerLine, b: LedgerLine): boolean =>
  a.path === b.path &&
  a.hash === b.hash &&
  a.session === b.session &&
  a.agent === b.agent;

/** The last write of the ledger. Each write waits for it, so two calls at the same time keep both lines. */
let recorded: Promise<void> = Promise.resolve();

/** Adds `added` to the ledger file. The file API has no append, so a write that another session overwrote runs again, at most `LEDGER_WRITE_TRIES` times. */
const record = (
  $: EngineInterface,
  added: readonly LedgerLine[],
): Promise<void> => {
  recorded = recorded
    .then(async () => {
      const file = await fileOf($);
      for (let i = 0; i < LEDGER_WRITE_TRIES; i++) {
        const lines = added.reduce(withEdit, await readLedger($, file));
        await $.fs.write(file, ledgerText(lines));
        const held = await readLedger($, file);
        if (added.every((a) => held.some((h) => same(h, a)))) return;
      }
    })
    .catch(() => undefined);
  return recorded;
};

const editedPath = (input: unknown): string | null => {
  const path = (input as { file_path?: unknown } | null)?.file_path;
  return typeof path === "string" && path !== "" ? path : null;
};

/** The hash of the content of `path`, or `GONE` for a file that is missing or unreadable. */
const hashOf = async ($: EngineInterface, path: string): Promise<string> =>
  $.fs.read(path).then(
    (text) => hash64(text),
    () => GONE,
  );

/** Sets the Title Case of the headings of the Markdown file `path`, and gives the count that changed. An unreadable, unwritable, or huge file stays as it is. */
const titleFile = async ($: EngineInterface, path: string): Promise<number> => {
  try {
    const text = await $.fs.read(path);
    if (text.length > HEADINGS_FILE_MAX) return 0;
    const fixed = titleHeadings(text);
    if (fixed.changed === 0) return 0;
    await $.fs.write(path, fixed.text);
    return fixed.changed;
  } catch {
    return 0;
  }
};

/** The files that `git status` lists, with their modification times. */
const workFiles = async (
  $: EngineInterface,
): Promise<{ path: string; mtimeMs: number }[]> => {
  const cwd = await $.session.cwd();
  const run = (argv: string[]) =>
    $.process.run(argv, { cwd, timeoutMs: GIT_TIMEOUT_MS });
  // `--untracked-files=all` lists a new file in a new folder, which `-z` alone shows as the folder.
  const [status, top] = await Promise.all([
    run(["git", "status", "--porcelain", "-z", "--untracked-files=all"]),
    run(["git", "rev-parse", "--show-toplevel"]),
  ]);
  if (status.exitCode !== 0 || top.exitCode !== 0) return [];
  const root = top.stdout.trim();
  const files: { path: string; mtimeMs: number }[] = [];
  for (const rel of statusPaths(status.stdout).slice(0, WHO_FILES_MAX)) {
    const path = `${root}/${rel}`;
    const stat = await $.fs.stat(path).catch(() => undefined);
    if (stat?.kind === "file") files.push({ path, mtimeMs: stat.mtimeMs });
  }
  return files;
};

/** The ledger lines for the files of `git status` that changed after the start of a `Bash` call. */
const bashLines = async (
  $: EngineInterface,
  session: string,
  agent: string,
  tookMs: number | undefined,
): Promise<LedgerLine[]> => {
  const now = await $.clock.now();
  const since =
    now -
    Math.min(tookMs ?? BASH_CHANGE_MAX_MS, BASH_CHANGE_MAX_MS) -
    BASH_CHANGE_SLACK_MS;
  const lines: LedgerLine[] = [];
  for (const { path, mtimeMs } of await workFiles($)) {
    if (mtimeMs < since) continue;
    const hash = await hashOf($, path);
    if (hash !== GONE) lines.push({ path, hash, session, agent });
  }
  return lines;
};

/** Records an `Edit` or `Write` of `path` after the headings of a `.md` file get their case (before the hash). Gives the line for the model when a heading changed. */
const recordEdit = async (
  $: EngineInterface,
  path: string | null,
  session: string,
  agent: string,
): Promise<string | undefined> => {
  if (path === null) return undefined;
  const count = /\.md$/i.test(path) ? await titleFile($, path) : 0;
  const hash = await hashOf($, path);
  if (hash !== GONE) await record($, [{ path, hash, session, agent }]);
  return count > 0 ? HEADINGS_CASED({ path, count }) : undefined;
};

/** `classic.PostToolUse`: the ledger keeps the files of an `Edit`, a `Write`, or a `Bash` call. A failure of the ledger never stops the tool result. */
export const onEdited: Handler<"classic.PostToolUse"> = async ($, e, next) => {
  let note: string | undefined;
  try {
    const session = await $.session.id();
    const agent = e.agent_id ? (e.agent_type ?? e.agent_id) : "main";
    if (e.tool_name === "Bash")
      await record($, await bashLines($, session, agent, e.duration_ms));
    else note = await recordEdit($, editedPath(e.tool_input), session, agent);
  } catch {
    // The ledger is a help for the agent, so a fault of it adds no stop.
  }
  const answer = await next(e);
  return note === undefined
    ? answer
    : {
        ...answer,
        additionalContext: [...(answer.additionalContext ?? []), note],
      };
};

type GitViewHook = MatchedHook<
  "tool.call",
  { readonly tool: readonly ["Bash"] }
>;

/** `tool.call` on `Bash`: for `git status` and `git diff`, the context sorts each changed file by maker. It calls `next` first (D49). */
export const onGitView: GitViewHook = async ($, e, next) => {
  const answer = await next(e);
  if (answer.deny !== undefined || !isGitView(e.command)) return answer;
  try {
    const session = await $.session.id();
    const lines = await readLedger($, await fileOf($));
    const files = await Promise.all(
      (await workFiles($)).map(async ({ path }) => ({
        path,
        hash: await hashOf($, path),
      })),
    );
    const text = whoChanged(lines, session, files);
    return text === null
      ? answer
      : { ...answer, context: [...(answer.context ?? []), text] };
  } catch {
    return answer;
  }
};

/** `classic.UserPromptSubmit`: one line for each file that changed after the last edit of its agent, and nothing when none did. */
export const onPrompt: Handler<"classic.UserPromptSubmit"> = async (
  $,
  e,
  next,
) => {
  const answer = await next(e);
  try {
    const session = await $.session.id();
    const lines = await readLedger($, await fileOf($));
    const now: Record<string, string> = {};
    for (const l of lines)
      if (l.session === session) now[l.path] = await hashOf($, l.path);
    const { value: held } = await $.state.get(toldRef);
    const told = held ?? {};
    const changed = changedFiles(lines, session, told, now);
    if (changed.length === 0) return answer;
    await $.state.set(toldRef, withTold(told, changed, now));
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
