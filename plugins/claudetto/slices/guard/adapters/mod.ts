// The mod handlers of the `guard` slice: the permission gate of spec `permission-gate` (D1).
// `tool.check` gives `deny`, `ask`, or `allow`; `classic.PermissionRequest` runs the same gate when Claude Code would show a prompt.
// An `ask` of the delete and local `git` gates goes to Jev first when the `decide` option is `jev` and `TYPESAFE_API_KEY` is set.
// Each `ask` goes to a log of the session (task 5.2), and a log that cannot be written changes no verdict.
// A hook `allow` does not clear an `ask` or `deny` rule (`research/claude-code.md` of change `0-3-0`).
// A hook that throws is skipped, so `onCheckFail` asks a person (fail closed).

import type {
  CatchHandler,
  EngineInterface,
  MatchedHook,
  PluginOptions,
} from "claude-code";
import { postJev } from "../../../kernel/jev.ts";
import {
  GONE,
  hash64,
  ledgerPath,
  madeBy,
  parseLedger,
  statusPaths,
} from "../../../kernel/ledger.ts";
import type { Handler } from "../../../kernel/slice.ts";
import { tempDirs } from "../../../kernel/tmp.ts";
import { sharesOf } from "../../../kernel/usage.ts";
import { type Facts, gate, gated, type Verdict } from "../domain/gate.ts";
import { fixTitles } from "../domain/ghtitle.ts";
import type { GitScope } from "../domain/git.ts";
import { jevRequest, sureYes } from "../domain/jev.ts";
import { type Decider, logLine, logPath } from "../domain/log.ts";
import {
  keepWatches,
  monitorIds,
  runningTask,
  type Watches,
  withWatch,
} from "../domain/monitors.ts";
import { isRunning, mayAsk, usageAsk } from "../domain/usage.ts";
import { GIT_TIMEOUT_MS, STAGE_FILES_MAX, STAGE_NAMES_MAX } from "../limits.ts";
import {
  CHECK_FAIL,
  DENY_MONITOR_DUPLICATE,
  JEV_ALLOW,
  TITLE_FIXED,
} from "../prompts.ts";

/** Whether the `decide` option is `jev`, and the sensitive key option, which the generated `register` sets once with `keepOptions`. */
const kept = { jev: false, key: "" };

export const keepOptions = (options: PluginOptions): void => {
  kept.jev = options["decide"] === "jev";
  const key = options["TYPESAFE_API_KEY"];
  kept.key = typeof key === "string" ? key : "";
};

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

/** The changed files of the work tree of `dir` that no line of the edit ledger holds with their hash now, relative to the root. A `git` run that fails gives none, because the stage fails too. */
const userEdits =
  ($: EngineInterface, tmp: string) =>
  async (dir: string): Promise<string[]> => {
    const run = (args: string[]) =>
      $.process.run(["git", "-C", dir, ...args], { timeoutMs: GIT_TIMEOUT_MS });
    const [status, top] = await Promise.all([
      run(["status", "--porcelain", "-z", "--untracked-files=all"]),
      run(["rev-parse", "--show-toplevel"]),
    ]);
    if (status.exitCode !== 0 || top.exitCode !== 0) return [];
    const file = ledgerPath(tmp, await $.session.root());
    const lines = parseLedger(
      ((await $.fs.exists(file)) && (await $.fs.read(file))) || "",
    );
    const root = top.stdout.trim();
    const found: string[] = [];
    for (const rel of statusPaths(status.stdout).slice(0, STAGE_FILES_MAX)) {
      const hash = await $.fs.read(`${root}/${rel}`).then(hash64, () => GONE);
      if (hash !== GONE && madeBy(lines, `${root}/${rel}`, hash).length === 0)
        found.push(rel);
      if (found.length >= STAGE_NAMES_MAX) break;
    }
    return found;
  };

/** The temp folders for each pair of env values, kept for the life of the mod, so each call after the first makes no `stat`. */
const temps = new Map<string, Promise<string[]>>();

const factsOf = async ($: EngineInterface): Promise<Facts> => {
  const [cwd, home, tmp, CLAUDE_CODE_TMPDIR] = await Promise.all([
    $.session.cwd(),
    $.env.get("HOME"),
    $.env.get("TMPDIR"),
    $.env.get("CLAUDE_CODE_TMPDIR"),
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
  const tmpDir = (tmp ?? "/tmp").replace(/\/+$/, "");
  return {
    cwd,
    home: home ?? "/nonexistent",
    tmp: tmpDir,
    temps: await dirs,
    git: gitState($),
    userEdits: userEdits($, tmpDir),
  };
};

/** `allow` when Jev is sure that the loss of the `ask` `own` of `command` is safe, else `undefined`. */
const askJev = async (
  $: EngineInterface,
  command: string,
  own: Verdict,
): Promise<Verdict | undefined> => {
  // The exported `TYPESAFE_API_KEY` of 0.3.0-alpha.1 stays a fallback.
  const key = kept.jev
    ? kept.key || (await $.env.get("TYPESAFE_API_KEY"))
    : undefined;
  if (!key) return undefined;
  const answers = await postJev(
    key,
    jevRequest(command, own.reason ?? ""),
    { fetch: (to, body) => $.http.fetch(to, body) },
    { sleep: (wait, abort) => $.clock.sleep(wait, abort) },
  ).catch(() => undefined);
  const p = sureYes(answers);
  return p === undefined
    ? undefined
    : { decision: "allow", reason: JEV_ALLOW({ p: p.toFixed(2) }) };
};

/** The last write of the log. Each write waits for it, so two checks at the same time keep both lines. */
let logged: Promise<void> = Promise.resolve();

const log = (
  $: EngineInterface,
  tmp: string,
  lineAt: (at: number) => string,
): Promise<void> => {
  logged = logged
    .then(async () => {
      const [id, at] = await Promise.all([$.session.id(), $.clock.now()]);
      const path = logPath(tmp, id);
      const old = (await $.fs.exists(path)) ? await $.fs.read(path) : "";
      await $.fs.write(path, old + lineAt(at));
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
      othersRun: async () =>
        (await $.agent.list()).some((agent) => isRunning(agent.status)),
    });
    return reason === null ? undefined : { decision: "ask", reason };
  } catch {
    return undefined;
  }
};

/** The verdict of the gate. A `deny` of the engine stays, and an `ask` of the gate goes to Jev or a person. */
export const onCheck: Check = async ($, e, next) => {
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
    await log($, tmp, (at) =>
      logLine({ at, ...e, reason: red.reason ?? "", decider: "person" }),
    );
    return { ...red, decider: "person" };
  }
  const command = (e.input as { command?: unknown }).command;
  const allowed =
    jev && typeof command === "string"
      ? await askJev($, command, own)
      : undefined;
  const decider: Decider = allowed ? "jev" : "person";
  await log($, facts.tmp, (at) =>
    logLine({ at, ...e, reason: own.reason ?? "", decider }),
  );
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

/** The ID of the task that runs `command` now, or `undefined`. A fault of the state gives `undefined`. */
const runningId = async (
  $: EngineInterface,
  command: string,
): Promise<string | undefined> => {
  try {
    const { value } = await $.state.get(watchRef);
    return runningTask(value ?? {}, command, await $.clock.now());
  } catch {
    return undefined;
  }
};

/** Sets the running set to `change` of the set now and the time of the host. A fault of the state leaves the set as it is. */
const updateWatches = async (
  $: EngineInterface,
  change: (held: Watches, now: number) => Watches,
): Promise<void> => {
  try {
    const { value } = await $.state.get(watchRef);
    await $.state.set(watchRef, change(value ?? {}, await $.clock.now()));
  } catch {
    // The state is a help for the agent, so a fault of it adds no stop.
  }
};

/** `tool.call` on `Monitor` and `TaskStop`: a `Monitor` with the command of a running one gets a refusal that names the task (X8), a `Monitor` that runs joins the state, and a `TaskStop` leaves it. */
export const onMonitor: MonitorHook = async ($, e, next) => {
  const command = e.tool === "Monitor" ? e.command : undefined;
  const id =
    typeof command === "string" ? await runningId($, command) : undefined;
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
