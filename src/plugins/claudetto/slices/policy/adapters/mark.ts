// The `tool.call` handler of the `policy` slice that marks a `Bash` call of Claude for the `pre-push` hook of git.
// It sets `CLAUDETTO_AGENT_CALL` with `$.env.set` before the command runs, and removes it after, so the hook checks the pushes of Claude and not a `!` command of the user.
// In a checkout that is not the user's and has no verdict `allowed` or `conditions`, it also blanks `GH_TOKEN` and `GITHUB_TOKEN` for a command that runs a script.
// The blank is a soft barrier: a script can read a token from another place, such as the keychain.
// Each `$` call is in this file, because `claude plugin validate` follows `$` only into a function of one file, and each `$.env` call needs a literal name.

import type { EngineInterface } from "claude-code";
import type { Handler } from "../../../../../kernel/slice.ts";
import { scriptOf } from "../domain/opaque.ts";
import { normalize } from "../domain/paths.ts";
import { kept, NOT_RUN, runInit, tokens } from "./host.ts";
import { loadRecord, type StoreFs } from "./store.ts";
import { type Run, targetOfDir } from "./target.ts";

/** The token value in a blank window. An empty value does not work, because `gh` then uses its stored login. */
export const BLANK_TOKEN = "claudetto-ai-policy-no-token";

/** The file API of the engine, as calls, because `claude plugin validate` follows `$.fs.read(...)` and not `$.fs` as a value. */
const diskOf = ($: EngineInterface): StoreFs => ({
  exists: (path) => $.fs.exists(path),
  read: (path) => $.fs.read(path),
  list: (path) => $.fs.list(path),
  write: (path, text) => $.fs.write(path, text),
});

const homeOf = async ($: EngineInterface): Promise<string | undefined> =>
  (await $.env.get("HOME")) ?? (await $.env.get("USERPROFILE"));

/** Runs a program on the host. A program that cannot start gives `NOT_RUN`. */
const runOf =
  ($: EngineInterface): Run =>
  async (argv, cwd) => {
    try {
      const r = await $.process.run(argv, runInit(cwd));
      return { exitCode: r.exitCode, stdout: r.stdout, stderr: r.stderr };
    } catch {
      return NOT_RUN;
    }
  };

/** The `Bash` calls that run now, and the chain that puts each change of the env in order. */
const state = { calls: 0, chain: Promise.resolve() as Promise<unknown> };

/** Runs `step` after each step before it. A step that fails does not stop the next one. */
const queue = <T>(step: () => Promise<T>): Promise<T> => {
  const done = state.chain.then(step);
  state.chain = done.catch(() => undefined);
  return done;
};

/** Runs `f`, and ignores a fault, so that one failed change of the env does not stop the other changes. */
const attempt = async (f: () => Promise<unknown>): Promise<void> => {
  try {
    await f();
  } catch {
    // The window then stays open or closed, and the docs of the slice name this gap.
  }
};

/** True when `dir` is in a checkout that is not the user's and has no verdict `allowed` or `conditions`. */
const closedAt = async ($: EngineInterface, dir: string): Promise<boolean> => {
  const target = await targetOfDir(runOf($), dir);
  if (target === null || target.own) return false;
  const home = await homeOf($);
  const record =
    home === undefined
      ? undefined
      : await loadRecord(diskOf($), home, target.key);
  return record?.verdict !== "allowed" && record?.verdict !== "conditions";
};

/** True when `command` runs a script in a closed checkout: the session folder or a folder of a `cd`. A failed check blanks. */
const blanks = async ($: EngineInterface, command: string) => {
  try {
    const script = scriptOf(command);
    if (!script.opaque) return false;
    const cwd = await $.session.cwd();
    const home = (await homeOf($)) ?? "";
    const dirs = script.dirs.map((d) =>
      normalize(
        d.startsWith("/")
          ? d
          : d.startsWith("~")
            ? `${home}${d.slice(1)}`
            : `${cwd}/${d}`,
      ),
    );
    for (const dir of [cwd, ...dirs]) if (await closedAt($, dir)) return true;
    return false;
  } catch {
    return true;
  }
};

/**
 * Sets the marker for the first call that runs, and blanks the tokens for the first call that needs it.
 * It gives true when the call counts in the blank window.
 * A token that cannot be read is not blanked, because the restore after the call could then lose it.
 */
const enter = ($: EngineInterface, blank: boolean) =>
  queue(async () => {
    state.calls += 1;
    if (state.calls === 1)
      await attempt(() => $.env.set("CLAUDETTO_AGENT_CALL", "1"));
    if (!blank) return false;
    if (tokens.blanked === 0) {
      try {
        tokens.gh = await $.env.get("GH_TOKEN");
        tokens.github = await $.env.get("GITHUB_TOKEN");
      } catch {
        return false;
      }
    }
    tokens.blanked += 1;
    if (tokens.blanked > 1) return true;
    await attempt(() => $.env.set("GH_TOKEN", BLANK_TOKEN));
    await attempt(() => $.env.set("GITHUB_TOKEN", BLANK_TOKEN));
    return true;
  });

const leave = ($: EngineInterface, blank: boolean) =>
  queue(async () => {
    state.calls -= 1;
    if (state.calls === 0)
      await attempt(() => $.env.set("CLAUDETTO_AGENT_CALL", undefined));
    if (!blank) return;
    tokens.blanked -= 1;
    if (tokens.blanked > 0) return;
    await attempt(() => $.env.set("GH_TOKEN", tokens.gh));
    await attempt(() => $.env.set("GITHUB_TOKEN", tokens.github));
  });

/** Marks the `Bash` call while it runs. The gate of `onCall` comes first, so a denied call is not marked. */
export const onMark: Handler<"tool.call"> = async ($, e, next) => {
  const command = (e as { command?: unknown }).command;
  if (!kept.on || typeof command !== "string") return next(e);
  const blank = await enter($, await blanks($, command));
  try {
    return await next(e);
  } finally {
    await leave($, blank).catch(() => undefined);
  }
};
