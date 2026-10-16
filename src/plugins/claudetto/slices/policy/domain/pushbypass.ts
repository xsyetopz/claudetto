// The git calls of a `Bash` text that skip the `pre-push` check or change its hooks, read from the words of the shell reader.
// It also finds a command that changes `AGENT_ENV`, the env var that turns the check on during a call of Claude.
// Only the structure of the words counts: the verb, the options, and the assignments before a command.
// A slice cannot import another slice, so this file holds the small part of `attribution/domain/git-call.ts` that a push needs.
// This file is in the import graph of the hooks module, so it has no `node:` import.

import { GIT_VALUE_OPTIONS } from "../../../../../kernel/gitopts.ts";
import { AGENT_ENV } from "../../../../../kernel/push-hook/index.ts";
import { commands } from "../../../../../kernel/shell.ts";
import { baseName, stripWrappers } from "../../../../../kernel/wrappers.ts";

const CONFIG_ENV =
  /^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+|PARAMETERS|GLOBAL|SYSTEM|NOSYSTEM)$/;

/** A test of an env var name. */
type Watch = (name: string) => boolean;

/** The env vars that change the git config of a command, and the env var that turns the hook on. */
const WATCHED: Watch = (name) => CONFIG_ENV.test(name) || name === AGENT_ENV;

/** The env var that turns the hook on. */
const MARKER: Watch = (name) => name === AGENT_ENV;

/** The config names that move or turn off the hooks: `core.hooksPath` and each `hook.*` key. */
const isHookConfig = (setting: string): boolean => {
  const name = (setting.split("=")[0] ?? "").toLowerCase();
  return name === "core.hookspath" || name.startsWith("hook.");
};

/** The git command in `argv`, as its global options and the words after them, or `undefined` for another command. */
const gitOf = (
  argv: string[],
): { settings: string[]; rest: string[] } | undefined => {
  const [head, ...words] = stripWrappers(argv);
  if (head === undefined || baseName(head) !== "git") return undefined;
  const settings: string[] = [];
  let i = 0;
  while (i < words.length && (words[i] as string).startsWith("-")) {
    const opt = words[i] as string;
    const value = words[i + 1] ?? "";
    if (opt === "-c" || opt === "--config-env") settings.push(value);
    if (opt.startsWith("--config-env=")) settings.push(opt.slice(13));
    i += GIT_VALUE_OPTIONS.has(opt) ? 2 : 1;
  }
  return { settings, rest: words.slice(i) };
};

/** True when the words after `push` hold `--no-verify` or a unique start of it. */
const skipsHook = (args: string[]): boolean => {
  for (const arg of args) {
    if (arg === "--") return false;
    if (!arg.startsWith("--")) continue;
    const name = arg.split("=")[0] as string;
    if (name.length >= 6 && "--no-verify".startsWith(name)) return true;
  }
  return false;
};

/** The shell commands whose words name variables: they set, export, or remove them. */
const VARIABLE_COMMANDS: ReadonlySet<string> = new Set([
  "export",
  "declare",
  "typeset",
  "readonly",
  "local",
  "unset",
]);

/** The name part of a word such as `NAME` or `NAME=value`. */
const nameOf = (word: string): string => word.split("=")[0] as string;

/** True when the `env` options in `before` remove a name that `watch` takes, or remove the whole environment when `whole` is true. */
const envClears = (before: string[], watch: Watch, whole: boolean): boolean => {
  const at = before.findIndex((word) => baseName(word) === "env");
  if (at < 0) return false;
  for (let i = at + 1; i < before.length; i++) {
    const word = before[i] as string;
    if (/^\w+=/.test(word)) continue;
    if (word === "-" || word === "--ignore-environment") {
      if (whole) return true;
      continue;
    }
    if (word === "-u" || word === "--unset") {
      if (watch(before[i + 1] ?? "")) return true;
      i++;
    } else if (word.startsWith("--unset=")) {
      if (watch(word.slice(8))) return true;
    } else if (/^-[A-Za-z]/.test(word)) {
      const unset = word.indexOf("u");
      const clears = /^-[^u]*i/.test(
        word.slice(0, unset < 0 ? undefined : unset),
      );
      if (whole && clears) return true;
      if (unset >= 0) {
        const tail = word.slice(unset + 1);
        if (watch(tail || (before[i + 1] ?? ""))) return true;
        if (!tail) i++;
      }
    } else break;
  }
  return false;
};

/**
 * True when `argv` sets or removes a variable that `watch` takes: an assignment before the command, a variable command with the name, or an `env -u` of the name.
 * When `git` is true, an `env` counts only before a `git` command, and an `env` that clears the whole environment counts too.
 */
const changesEnv = (argv: string[], watch: Watch, git: boolean): boolean => {
  const rest = stripWrappers(argv);
  const before = argv.slice(0, Math.max(0, argv.length - rest.length));
  const assigned = before.map((word) => /^(\w+)=/.exec(word)?.[1] ?? "");
  const named = VARIABLE_COMMANDS.has(rest[0] ?? "")
    ? rest
        .slice(1)
        .filter((word) => !word.startsWith("-"))
        .map(nameOf)
    : [];
  if ([...assigned, ...named].some(watch)) return true;
  if (git && baseName(rest[0] ?? "") !== "git") return false;
  return envClears(before, watch, git);
};

/** What in `text` skips the `pre-push` check, or `undefined`. It looks only at a text that runs `git push`. */
export const pushBypassOf = (
  text: string,
): "--no-verify" | "git config" | "env" | undefined => {
  const all = commands(text);
  const pushes = all.flatMap((argv) => gitOf(argv) ?? []);
  const only = pushes.filter((git) => git.rest[0] === "push");
  if (only.length === 0) return undefined;
  if (only.some((git) => skipsHook(git.rest.slice(1)))) return "--no-verify";
  if (only.some((git) => git.settings.some(isHookConfig))) return "git config";
  return all.some((argv) => changesEnv(argv, WATCHED, true))
    ? "env"
    : undefined;
};

/**
 * True when a command of `text` sets or removes `AGENT_ENV`. Any command counts, because a script that it starts can push.
 * An `env -i` before a command that is not `git` does not count, because it also removes the `GIT_CONFIG_*` vars that add the hook.
 */
export const changesMarker = (text: string): boolean =>
  commands(text).some((argv) => changesEnv(argv, MARKER, false));
