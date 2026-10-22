// The mod handler of the `guard` slice: the permission gate of spec `permission-gate` (D4 of change `0-3-0`),
// as one `tool.check` hook on `Bash`, `Read`, `Grep`, `Glob`, `Edit`, and `Write`.
// The gate decides by the rules of `domain/gate.ts`, and this file gives it the folders of the session and the `git` state of paths.
// An `ask` of the delete and local `git` gates goes to Jev first, when the `decide` option is `jev` and `TYPESAFE_API_KEY` is set.
// A confident yes allows the call, and each other answer, a failure, or a timeout leaves the `ask` to a person.
// An `ask` has `decider: "person"`, so the dialog has no "always allow" row, and no classifier settles it.
// A deny of the engine, such as a `deny` rule of the user, stays.
// A hook `allow` does not clear an `ask` or `deny` rule (`research/claude-code.md` of change `0-3-0`).
// Each `ask` of the gate goes to a log of the session in the temp folder, with who decided it (task 5.2).
// A log that cannot be written changes no verdict.
//
// When the hook throws or times out, Claude Code skips it, so the call would run.
// So the slice gives `onCheckFail` to `.catch()`, which asks a person (fail closed).

import type {
  CatchHandler,
  EngineInterface,
  MatchedHook,
  PluginOptions,
} from "claude-code";
import { type Facts, gate, type Verdict } from "../domain/gate.ts";
import type { GitScope } from "../domain/git.ts";
import { jevArgs, sureYes } from "../domain/jev.ts";
import { type Decider, logLine, logPath } from "../domain/log.ts";
import { GIT_TIMEOUT_MS, JEV_TIMEOUT_MS } from "../limits.ts";
import { CHECK_FAIL, JEV_ALLOW } from "../prompts.ts";

/** Whether the `decide` option is `jev`, which the generated `register` sets once with `keepOptions`. */
const kept = { jev: false };

export const keepOptions = (options: PluginOptions): void => {
  kept.jev = options["decide"] === "jev";
};

type Check = MatchedHook<
  "tool.check",
  {
    readonly tool: readonly ["Bash", "Read", "Grep", "Glob", "Edit", "Write"];
  }
>;

/** The `status` flags of each scope: `delete` also counts the ignored files, because a delete removes them. */
const STATUS_FLAGS: Record<GitScope, string[]> = {
  changes: ["--untracked-files=no"],
  untracked: ["--untracked-files=all"],
  delete: ["--untracked-files=all", "--ignored"],
};

/**
 * `"clean"` when the files of `paths` in `scope` have a commit and no change in the repository of `dir`.
 * For `delete`, `git ls-files` must also find each path, so a path with no commit is dirty.
 * A run that fails gives `"dirty"`, so a person decides.
 */
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

/** The folders of the session and the `git` state. */
const factsOf = async ($: EngineInterface): Promise<Facts> => {
  const [cwd, home, tmp] = await Promise.all([
    $.session.cwd(),
    $.env.get("HOME"),
    $.env.get("TMPDIR"),
  ]);
  return {
    cwd,
    home: home ?? "/nonexistent",
    tmp: (tmp ?? "/tmp").replace(/\/+$/, ""),
    git: gitState($),
  };
};

/** `allow` when Jev is sure that the loss of the `ask` `own` of `command` is safe, else `undefined`. */
const askJev = async (
  $: EngineInterface,
  command: string,
  own: Verdict,
): Promise<Verdict | undefined> => {
  const key = kept.jev ? await $.env.get("TYPESAFE_API_KEY") : undefined;
  if (!key) return undefined;
  const run = await $.process
    .run(
      [
        "bun",
        "--no-env-file",
        `${$.plugin.root}/bin/claudetto-decide`,
        ...jevArgs(command, own.reason ?? ""),
      ],
      { env: { TYPESAFE_API_KEY: key }, timeoutMs: JEV_TIMEOUT_MS },
    )
    .catch(() => undefined);
  const p = run?.exitCode === 0 ? sureYes(run.stdout) : undefined;
  return p === undefined
    ? undefined
    : { decision: "allow", reason: JEV_ALLOW({ p: p.toFixed(2) }) };
};

/** The last write of the log. Each write waits for it, so two checks at the same time keep both lines. */
let logged: Promise<void> = Promise.resolve();

/** Adds the line that `lineAt` gives for the time of the host to the log of the session. A failure leaves the log as it was. */
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

/** The verdict of the gate. A `deny` of the engine stays, and an `ask` of the gate goes to Jev or a person. */
export const onCheck: Check = async ($, e, next) => {
  const facts = await factsOf($);
  const [engine, { jev, ...own }] = await Promise.all([
    next(e),
    gate(e, facts),
  ]);
  if (engine.decision === "deny") return engine;
  if (own.decision !== "ask") return own;
  const command = (e.input as { command?: unknown }).command;
  const allowed =
    jev && typeof command === "string"
      ? await askJev($, command, own)
      : undefined;
  const decider: Decider = allowed ? "jev" : "person";
  await log($, facts.tmp, (at) =>
    logLine({ at, ...e, reason: own.reason ?? "", decider }),
  );
  return allowed ?? { ...own, decider: "person" };
};

/** The error handler of the gate: a gate that throws asks a person, and the dialog names the gate. */
export const onCheckFail: CatchHandler<Check> = () => ({
  decision: "ask",
  decider: "person",
  reason: CHECK_FAIL,
});
