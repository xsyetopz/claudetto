// The mod handlers of the `guard` slice: the permission gate of spec `permission-gate` (D1).
// `tool.check` gives `deny`, `ask`, or `allow`; `classic.PermissionRequest` runs the same gate when Claude Code would show a prompt.
// An `ask` of the delete and local `git` gates goes to Jev first when the `decide` option is `jev` and `TYPESAFE_API_KEY` is set.
// Each `ask` goes to a log of the session (task 5.2), and a log that cannot be written changes no verdict.
// A hook `allow` does not clear an `ask` or `deny` rule (`research/claude-code.md` of change `0-3-0`).
// A hook that throws is skipped, so `onCheckFail` asks a person (fail closed).

import type { CatchHandler, EngineInterface, MatchedHook } from "claude-code";
import type { Handler } from "../../../kernel/hooks.ts";
import { pluginOptions } from "../../../kernel/options.ts";
import { jevBody, jevKey, noulOf, postJev } from "../../jev/index.ts";
import {
  projectRoot,
  runningAgents,
  tempDirs,
  userEdits,
} from "../../project/index.ts";
import { sharesOf } from "../../session/index.ts";
import {
  type Facts,
  type GitConfig,
  gate,
  gated,
  type Verdict,
} from "../domain/gate.ts";
import { fixTitles } from "../domain/ghtitle.ts";
import type { GitScope } from "../domain/loss.ts";
import {
  keepWatches,
  monitorIds,
  runningTask,
  type Watches,
  withWatch,
} from "../domain/monitors.ts";
import { ENV_FILE } from "../domain/paths.ts";
import { mayAsk, usageAsk } from "../domain/usage.ts";
import {
  BASH_TIMEOUT_DEFAULT_MS,
  BASH_WAIT_MAX_MS,
  ENV_SCAN_CACHE_MS,
  ENV_SCAN_MS,
  GIT_CONFIG_FILE_MAX_BYTES,
  GIT_TIMEOUT_MS,
  JEV_YES_MIN,
} from "../limits.ts";
import {
  CHECK_FAIL,
  DENY_LONG_WAIT,
  DENY_MONITOR_DUPLICATE,
  JEV_ALLOW,
  JEV_QUESTION,
  JEV_STATE,
  TITLE_FIXED,
} from "../prompts.ts";

type Check = Handler<"tool.check">;

/** The `status` flags of each scope: `delete` also counts the ignored files, because a delete removes them. */
const STATUS_FLAGS: Record<GitScope, string[]> = {
  changes: ["--untracked-files=no"],
  untracked: ["--untracked-files=all"],
  delete: ["--untracked-files=all", "--ignored"],
};

/** `"clean"` when the files of `paths` in `scope` have a commit and no change. For `delete`, `git ls-files` must also find each path. A run that fails gives `"dirty"`. */
const gitState =
  ($: EngineInterface) =>
  async (
    scope: GitScope,
    dir: string,
    paths: string[],
  ): Promise<"clean" | "dirty"> => {
    const run = (args: string[]) =>
      $.process.run(["git", "-C", dir, ...args, "--", ...paths], {
        timeoutMs: GIT_TIMEOUT_MS,
      });
    const status = await run(["status", "--porcelain", ...STATUS_FLAGS[scope]]);
    const lines = status.stdout.split("\n").filter(Boolean);
    const changed =
      scope === "untracked"
        ? lines.some((line) => line.startsWith("??"))
        : lines.length > 0;
    if (status.exitCode !== 0 || changed) return "dirty";
    if (scope !== "delete") return "clean";
    const tracked = await run(["ls-files", "--error-unmatch"]);
    return tracked.exitCode === 0 ? "clean" : "dirty";
  };

/** The temp folders for each pair of env values, kept for the life of the mod, so each call after the first makes no `stat`. */
const temps = new Map<string, Promise<string[]>>();

/** The `git` facts of a folder with the config files that they came from and the mtimes of those files, kept for the life of the mod, so a call with no change of a config file runs no `git`. */
type HeldConfig = {
  facts: GitConfig;
  files: string[];
  branch: boolean;
  /** The mtimes of `files` and the stamp of `HEAD`, both taken before the read that gave `facts`. */
  stamp: { files: string; head: string };
};
const gitConfigs = new Map<string, HeldConfig>();

/** The `git config --show-origin -z` output words that start an origin, such as `file:.git/config`. */
const ORIGIN = /^(?:file|command line|standard input|blob):/;

/** `path` as an absolute path with no `.` or `..` part: `~/` is `home`, and a relative path starts at `from`. */
const absolute = (path: string, from: string, home: string): string => {
  const full = path.startsWith("~/")
    ? `${home}${path.slice(1)}`
    : path.startsWith("/")
      ? path
      : `${from}/${path}`;
  const kept: string[] = [];
  for (const part of full.split("/")) {
    if (part === "..") kept.pop();
    else if (part !== "." && part !== "") kept.push(part);
  }
  return `/${kept.join("/")}`;
};

/** The config files that `lines` (the NUL words of `git config --show-origin -z --get-regexp`) name: each origin file, and each file of an `include.path` or `includeIf.*.path` value, which holds no alias now but may get one. `branch` is true when an `includeIf` tests the branch, so the config also depends on `HEAD`. */
const configFiles = (
  lines: string[],
  cwd: string,
  home: string,
): { files: string[]; branch: boolean } => {
  const files = new Set<string>();
  let branch = false;
  let origin = cwd;
  for (const word of lines) {
    if (ORIGIN.test(word)) {
      origin = absolute(word.slice(word.indexOf(":") + 1), cwd, home);
      if (word.startsWith("file:")) files.add(origin);
    } else if (/^include(?:if\.[^\n]*)?\.path\n/i.test(word)) {
      const dir = origin.slice(0, Math.max(0, origin.lastIndexOf("/")));
      files.add(absolute(word.slice(word.indexOf("\n") + 1), dir, home));
      branch ||= /^includeif\.onbranch:/i.test(word);
    }
  }
  return { files: [...files], branch };
};

/** The mtime, size, kind, link flag, and text of `files`, as one text. The text shows a rewrite that keeps the mtime and the size (`touch -r`). A file that is not there gives `none`. A file over `GIT_CONFIG_FILE_MAX_BYTES` is not read, and then the stamp is `undefined`, because the gate cannot tell what the file holds. */
const stampOf = async (
  $: EngineInterface,
  files: string[],
): Promise<string | undefined> => {
  const parts = await Promise.all(
    files.map((path) =>
      $.fs.stat(path).then(
        async (s) =>
          s.size > GIT_CONFIG_FILE_MAX_BYTES
            ? undefined
            : `${[s.mtimeMs, s.size, s.kind, s.isLink].join(":")}\n${await $.fs.read(path).catch(() => "")}`,
        () => "none",
      ),
    ),
  );
  return parts.includes(undefined) ? undefined : parts.join("\0");
};

/** The mtime and the text of the `HEAD` file of the work tree `cwd`: `.git/HEAD`, or the `HEAD` of the folder that a `.git` file of a worktree names. A file that is not there gives `none`. */
const headStamp = async ($: EngineInterface, cwd: string): Promise<string> => {
  const dot = await $.fs.read(`${cwd}/.git`).catch(() => "");
  const named = /^gitdir:\s*(.+)$/m.exec(dot)?.[1];
  const path = `${named ? absolute(named.trim(), cwd, "") : `${cwd}/.git`}/HEAD`;
  const [mtime, text] = await Promise.all([
    $.fs.stat(path).then(
      (s) => String(s.mtimeMs),
      () => "none",
    ),
    $.fs.read(path).catch(() => "none"),
  ]);
  return `${mtime}\n${text}`;
};

/** The git folder of `cwd` (`git rev-parse --absolute-git-dir`, which names the folder of a linked worktree), or `cwd/.git` when `git` cannot tell. */
const gitDirOf = async ($: EngineInterface, cwd: string): Promise<string> => {
  const out = await $.process
    .run(["git", "-C", cwd, "rev-parse", "--absolute-git-dir"], {
      timeoutMs: GIT_TIMEOUT_MS,
    })
    .catch(() => undefined);
  const line = out?.exitCode === 0 ? out.stdout.split("\n")[0] : undefined;
  return line?.startsWith("/") ? line : `${cwd}/.git`;
};

/** The aliases of the config and the commands of `git` in `cwd`, with the config files that the aliases came from, or `undefined` when `git` cannot give them. `-z` keeps a value with a newline whole. */
const readGitConfig = async (
  $: EngineInterface,
  cwd: string,
  home: string,
): Promise<
  { facts: GitConfig; files: string[]; branch: boolean } | undefined
> => {
  const run = (args: string[]) =>
    $.process.run(["git", "-C", cwd, ...args], { timeoutMs: GIT_TIMEOUT_MS });
  try {
    const [config, cmds] = await Promise.all([
      run([
        "config",
        "--show-origin",
        "--get-regexp",
        "-z",
        "^(alias\\.|include)",
      ]),
      run(["--list-cmds=main,others"]),
    ]);
    // Exit 1 means that no alias is set.
    if (![0, 1].includes(config.exitCode) || cmds.exitCode !== 0)
      return undefined;
    const aliases: Record<string, string> = {};
    const lines = config.stdout.split("\0");
    for (const entry of lines) {
      const at = entry.indexOf("\n");
      const key = at < 0 ? entry : entry.slice(0, at);
      if (key.startsWith("alias."))
        aliases[key.slice(6)] = at < 0 ? "" : entry.slice(at + 1);
    }
    return {
      facts: { aliases, commands: cmds.stdout.split("\n").filter(Boolean) },
      ...configFiles(lines, cwd, home),
    };
  } catch {
    return undefined;
  }
};

/** The common folder of the git folder `gitDir`: the folder that its `commondir` file names (a linked worktree has the config of the repo there), else `gitDir`. */
const commonDirOf = async (
  $: EngineInterface,
  gitDir: string,
): Promise<string> => {
  const named = await $.fs.read(`${gitDir}/commondir`).catch(() => "");
  return named.trim() ? absolute(named.trim(), gitDir, "") : gitDir;
};

/** The config files that `git` may read, also when none is there yet: the user file, the config of the repo in the common folder `common`, the system file, the XDG file, and the `config.worktree` of the git folder `gitDir`. The files of the includes join them after a read. */
const baseFiles = (
  home: string,
  xdg: string | undefined,
  gitDir: string,
  common: string,
): string[] => [
  `${home}/.gitconfig`,
  `${common}/config`,
  "/etc/gitconfig",
  `${xdg || `${home}/.config`}/git/config`,
  `${gitDir}/config.worktree`,
];

/**
 * The `git` facts of `cwd`, from the hold when no config file changed.
 * The stamp is taken before each read, so a change during the read shows at the next call.
 * A read that names a file the stamp did not cover (an include) is done again with that file in the stamp.
 * Each round adds a file, so the rounds end.
 */
const gitConfigOf = async (
  $: EngineInterface,
  cwd: string,
  home: string,
  xdg: string | undefined,
): Promise<GitConfig | undefined> => {
  const held = gitConfigs.get(cwd);
  if (
    held &&
    (await stampOf($, held.files)) === held.stamp.files &&
    (!held.branch || (await headStamp($, cwd)) === held.stamp.head)
  )
    return held.facts;
  const gitDir = await gitDirOf($, cwd);
  let files = [
    ...new Set([
      ...baseFiles(home, xdg, gitDir, await commonDirOf($, gitDir)),
      ...(held?.files ?? []),
    ]),
  ];
  // `HEAD` is in the stamp only for a config with an `includeIf` on a branch.
  let withHead = held?.branch ?? false;
  for (;;) {
    const stamped = await stampOf($, files);
    const head = withHead ? await headStamp($, cwd) : "";
    const read = stamped && (await readGitConfig($, cwd, home));
    if (!read) {
      // A run that failed, or a config file over the bound that is not read, is tried again at the next call.
      gitConfigs.delete(cwd);
      return undefined;
    }
    const stamp = { files: stamped, head };
    const fresh = read.files.filter((path) => !files.includes(path));
    if (fresh.length === 0 && (withHead || !read.branch)) {
      gitConfigs.set(cwd, {
        facts: read.facts,
        files,
        branch: read.branch,
        stamp,
      });
      return read.facts;
    }
    files = [...files, ...fresh];
    withHead ||= read.branch;
  }
};

/** The last answer of `hasEnvFile` for each place, with the time of the scan and the `mutations` count at the scan. */
const envFileHeld = new Map<
  string,
  { at: number; found: boolean; mutations: number }
>();

/** The number of calls of `Bash`, `Monitor`, `Write`, `Edit`, and `NotebookEdit` that the gate has seen. Each of them can make a file, so a scan holds only while the count is the same. */
let mutations = 0;
const MUTATING = new Set(["Bash", "Monitor", "Write", "Edit", "NotebookEdit"]);

/** The folders that `hasEnvFile` scans at depth 1: the session folder, each parent up to `/`, and the home folder. */
const nearFolders = (cwd: string, home: string): string[] => {
  const parts = cwd.split("/").filter(Boolean);
  const parents = parts.map(
    (_, i) => `/${parts.slice(0, parts.length - i).join("/")}`,
  );
  return [...new Set([...parents, "/", home])];
};

/** The `find` run for the folders `roots`: a file or a symlink with the name of an env file, with no walk into `node_modules` and `.git`. `depth` limits the walk. A run that fails or is cut gives `bad`. */
const envFind = (
  $: EngineInterface,
  roots: string[],
  depth: string[],
): Promise<{ stdout: string; bad: boolean }> =>
  $.process
    .run(
      [
        ...["find", ...roots, ...depth],
        ...["-name", "node_modules", "-prune"],
        ...["-o", "-name", ".git", "-prune", "-o"],
        ...["(", "-type", "f", "-o", "-type", "l", ")"],
        ...["(", "-name", ".env*", "-o", "-name", "*.env", ")", "-print"],
      ],
      { timeoutMs: ENV_SCAN_MS },
    )
    .then(
      (out) => ({
        stdout: out.stdout,
        bad: out.exitCode !== 0 || out.isStdoutTruncated === true,
      }),
      () => ({ stdout: "", bad: true }),
    );

/** True when the folder `root` or a folder below it (except `node_modules` and `.git`), or the session folder `cwd`, a parent of it, or `home` at depth 1, holds an env file or a symlink with its name, or when `find` fails or its list is cut. A hold keeps the answer for `ENV_SCAN_CACHE_MS` while no call that can make a file has run. */
const hasEnvFile = async (
  $: EngineInterface,
  root: string,
  cwd: string,
  home: string,
): Promise<boolean> => {
  const now = await $.clock.now();
  const key = `${root}\0${cwd}\0${home}`;
  const kept = envFileHeld.get(key);
  if (kept && now - kept.at < ENV_SCAN_CACHE_MS && kept.mutations === mutations)
    return kept.found;
  const stamp = mutations;
  const outs = await Promise.all([
    envFind($, [root], []),
    envFind($, nearFolders(cwd, home), ["-maxdepth", "1"]),
  ]);
  const found = outs.some(
    ({ stdout, bad }) =>
      bad ||
      stdout
        .split("\n")
        .some((l) => ENV_FILE.test(l.slice(l.lastIndexOf("/") + 1))),
  );
  envFileHeld.set(key, { at: now, found, mutations: stamp });
  return found;
};

const factsOf = async ($: EngineInterface): Promise<Facts> => {
  const [cwd, home, tmp, CLAUDE_CODE_TMPDIR, xdg] = await Promise.all([
    $.session.cwd(),
    $.env.get("HOME"),
    $.env.get("TMPDIR"),
    $.env.get("CLAUDE_CODE_TMPDIR"),
    $.env.get("XDG_CONFIG_HOME"),
  ]);
  const key = `${tmp}\0${CLAUDE_CODE_TMPDIR}`;
  const dirs =
    temps.get(key) ??
    tempDirs({ TMPDIR: tmp, CLAUDE_CODE_TMPDIR }, (path) =>
      $.fs.stat(path, { resolve: true }).then(
        (s) => s.realPath ?? path,
        () => path,
      ),
    ).then((pairs) => pairs.flat());
  temps.set(key, dirs);
  return {
    cwd,
    gitConfig: () => gitConfigOf($, cwd, home ?? "/nonexistent", xdg),
    hasEnvFile: async () =>
      hasEnvFile(
        $,
        (
          await projectRoot({
            dir: () => $.env.get("CLAUDE_PROJECT_DIR"),
            root: () => $.session.root(),
          })
        ).replace(/\/+$/, "") || cwd,
        cwd,
        (home ?? "/nonexistent").replace(/\/+$/, ""),
      ),
    home: home ?? "/nonexistent",
    tmp: (tmp ?? "/tmp").replace(/\/+$/, ""),
    temps: await dirs,
    git: gitState($),
    userEdits: (dir) =>
      userEdits({
        git: (args) =>
          $.process.run(["git", "-C", dir, ...args], {
            timeoutMs: GIT_TIMEOUT_MS,
          }),
        read: (path) => $.fs.read(path),
        exists: (path) => $.fs.exists(path),
        tmp: () => $.env.get("TMPDIR"),
        root: () => $.session.root(),
      }),
  };
};

/** `allow` when Jev is sure that the loss of the `ask` `own` of `command` is safe, else `undefined`. */
const askJev = async (
  $: EngineInterface,
  command: string,
  own: Verdict,
): Promise<Verdict | undefined> => {
  // The exported `TYPESAFE_API_KEY` of 0.3.0-alpha.1 stays a fallback.
  const key = await jevKey(pluginOptions(), () =>
    $.env.get("TYPESAFE_API_KEY"),
  );
  if (!key) return undefined;
  const answers = await postJev(
    key,
    jevBody(JEV_STATE({ command, reasons: own.reason ?? "" }), {
      q: { type: "noul", instructions: JEV_QUESTION },
    }),
    { fetch: (to, body) => $.http.fetch(to, body) },
    { sleep: (wait, abort) => $.clock.sleep(wait, abort) },
  ).catch(() => undefined);
  const p = noulOf(answers, "q");
  return p !== undefined && p >= JEV_YES_MIN
    ? { decision: "allow", reason: JEV_ALLOW({ p: p.toFixed(2) }) }
    : undefined;
};

/** The last write of the log. Each write waits for it, so two checks at the same time keep both lines. */
let logged: Promise<void> = Promise.resolve();

const log = (
  $: EngineInterface,
  tmp: string,
  e: Parameters<Check>[1],
  reason: string,
  decider: "jev" | "person",
): Promise<void> => {
  logged = logged
    .then(async () => {
      const [id, at] = await Promise.all([$.session.id(), $.clock.now()]);
      const path = `${tmp}/claudetto/gate/${id}.jsonl`;
      const old = (await $.fs.exists(path)) ? await $.fs.read(path) : "";
      const input = (e.input ?? {}) as Record<string, unknown>;
      const target = input["command"] ?? input["file_path"] ?? input["path"];
      const line = JSON.stringify({
        at: new Date(at).toISOString(),
        tool: e.tool,
        target: typeof target === "string" ? target : "",
        reason,
        decider,
      });
      await $.fs.write(path, `${old}${line}\n`);
    })
    .catch(() => undefined);
  return logged;
};

const ALLOW: Verdict = { decision: "allow" };

/** The `ask` for the call at red, or `undefined`. The 5-hour share comes from `$.session.usage()`, and the weekly share never asks. A fault of the read adds no ask. */
const askAtRed = async (
  $: EngineInterface,
  e: Parameters<Check>[1],
): Promise<Verdict | undefined> => {
  const command = (e.input as { command?: unknown } | undefined)?.command;
  if (!mayAsk(e.tool, command)) return undefined;
  try {
    const { rateLimits } = await $.session.usage();
    const reason = await usageAsk({
      tool: e.tool,
      command,
      fiveHour: sharesOf(rateLimits).five_hour,
      othersRun: async () => runningAgents(await $.agent.list()).length > 0,
    });
    return reason === null ? undefined : { decision: "ask", reason };
  } catch {
    return undefined;
  }
};

/** The verdict of the gate. A `deny` of the engine stays, and an `ask` of the gate goes to Jev or a person. */
export const onCheck: Check = async ($, e, next) => {
  mutations += Number(MUTATING.has(e.tool));
  const facts = gated(e.input) ? await factsOf($) : undefined;
  const [engine, { jev, ...own }, red] = await Promise.all([
    next(e),
    facts ? gate(e, facts) : ALLOW,
    askAtRed($, e),
  ]);
  if (engine.decision === "deny") return engine;
  if (!facts || own.decision !== "ask") {
    if (!red || own.decision !== "allow") return own;
    const { tmp } = facts ?? (await factsOf($));
    await log($, tmp, e, red.reason ?? "", "person");
    return { ...red, decider: "person" };
  }
  const command = (e.input as { command?: unknown }).command;
  const allowed =
    jev && typeof command === "string"
      ? await askJev($, command, own)
      : undefined;
  await log($, facts.tmp, e, own.reason ?? "", allowed ? "jev" : "person");
  // An `ask` has `decider: "person"`, so the dialog has no "always allow" row, and no classifier settles it.
  return allowed ?? { ...own, decider: "person" };
};

/** `classic.PermissionRequest`: `allow` when no gate matches, else the answer of the hooks below, so a person sees the prompt. */
export const onPermission: Handler<"classic.PermissionRequest"> = async (
  $,
  e,
  next,
) => {
  const answer = await next(e);
  if (answer.decision) return answer;
  const own = gated(e.tool_input)
    ? await gate(
        { tool: e.tool_name, input: e.tool_input, agentId: e.agent_id },
        await factsOf($),
      )
    : ALLOW;
  return own.decision === "allow"
    ? { ...answer, decision: { behavior: "allow" } }
    : answer;
};

/** The running `Monitor` tasks are one value of `$.state`, so the main loop and each subagent see the same set (task 10.4). */
const watchRef = { plugin: "claudetto", key: "watches" } as const;

type MonitorHook = MatchedHook<
  "tool.call",
  { readonly tool: readonly ["Monitor", "TaskStop"] }
>;

/** Runs `use` with the running set and the time of the host. A fault of the state gives `undefined`, and the state is a help for the agent, so it adds no stop. */
const withWatches = async <T>(
  $: EngineInterface,
  use: (held: Watches, now: number) => T | Promise<T>,
): Promise<T | undefined> => {
  try {
    const { value } = await $.state.get(watchRef);
    return await use(value ?? {}, await $.clock.now());
  } catch {
    return undefined;
  }
};

/** Sets the running set to `change` of the set now and the time of the host. */
const updateWatches = (
  $: EngineInterface,
  change: (held: Watches, now: number) => Watches,
): Promise<unknown> =>
  withWatches($, (held, now) => $.state.set(watchRef, change(held, now)));

/** `tool.call` on `Monitor` and `TaskStop`: a `Monitor` with the command of a running one gets a refusal that names the task (X8), a `Monitor` that runs joins the state, and a `TaskStop` leaves it. */
export const onMonitor: MonitorHook = async ($, e, next) => {
  const command = e.tool === "Monitor" ? e.command : undefined;
  const id =
    typeof command === "string"
      ? await withWatches($, (held, now) => runningTask(held, command, now))
      : undefined;
  if (id !== undefined) return { deny: DENY_MONITOR_DUPLICATE({ id }) };
  const answer = await next(e);
  if (answer.deny !== undefined || answer.isError) return answer;
  if (e.tool === "TaskStop") {
    const task = e.task_id ?? e.shell_id;
    await updateWatches($, (held) => keepWatches(held, (id) => id !== task));
  } else if (typeof command === "string") {
    const { taskId, timeoutMs } = answer.result as {
      taskId?: unknown;
      timeoutMs?: unknown;
    };
    if (typeof taskId === "string")
      await updateWatches($, (held, now) =>
        withWatch(
          held,
          command,
          taskId,
          now,
          typeof timeoutMs === "number" ? timeoutMs : 0,
        ),
      );
  }
  return answer;
};

type TitleHook = MatchedHook<
  "tool.call",
  { readonly tool: readonly ["Bash"]; readonly command: RegExp }
>;

/** `tool.call` on `gh pr create` and `gh issue create`: the `--title` and `-t` value runs in Chicago Title Case, and the result tells the model. */
export const onTitle: TitleHook = async (_$, e, next) => {
  const fixed = fixTitles(e.command);
  if (fixed === undefined) return next(e);
  const answer = await next({ ...e, command: fixed });
  return answer.deny === undefined
    ? { ...answer, context: [...(answer.context ?? []), TITLE_FIXED] }
    : answer;
};

type WaitHook = MatchedHook<"tool.call", { readonly tool: readonly ["Bash"] }>;

/** True when the cache TTL of subagents is `1h`, by the env or by the settings. */
// A subagent TTL that is set wins, and `ENABLE_PROMPT_CACHING_1H` asks for `1h` in both groups (docs page "Request and Cache").
const longTtl = async ($: EngineInterface): Promise<boolean> => {
  const set =
    (await $.env.get("CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL")) ??
    (await $.settings.read({ key: "subagentPromptCacheTtl" }));
  return set !== undefined
    ? set === "1h"
    : (await $.env.get("ENABLE_PROMPT_CACHING_1H")) === "1";
};

/** `tool.call` on `Bash`: a foreground call of a subagent whose effective `timeout` is over `BASH_WAIT_MAX_MS` is denied, and the reason points to `run_in_background` and `Monitor`. The main thread has no `agentId`, and a `1h` TTL turns the rule off. */
export const onWait: WaitHook = async ($, e, next) => {
  if (e.agentId === undefined || e.run_in_background === true) return next(e);
  const set = e.timeout ?? Number(await $.env.get("BASH_DEFAULT_TIMEOUT_MS"));
  const timeout = set > 0 ? set : BASH_TIMEOUT_DEFAULT_MS;
  if (timeout <= BASH_WAIT_MAX_MS || (await longTtl($))) return next(e);
  return {
    deny: DENY_LONG_WAIT({
      seconds: timeout / 1000,
      max: BASH_WAIT_MAX_MS / 1000,
    }),
  };
};

/** `classic.Stop`: the running set becomes the `monitor` tasks of `background_tasks`, so a task that ended on its own leaves the state. */
export const onStop: Handler<"classic.Stop"> = async ($, e, next) => {
  const answer = await next(e);
  if (e.background_tasks) {
    const live = monitorIds(e.background_tasks);
    await updateWatches($, (held) => keepWatches(held, (id) => live.has(id)));
  }
  return answer;
};

/** A gate that throws asks a person, and the dialog names the gate. */
export const onCheckFail: CatchHandler<Check> = () => ({
  decision: "ask",
  decider: "person",
  reason: CHECK_FAIL,
});
