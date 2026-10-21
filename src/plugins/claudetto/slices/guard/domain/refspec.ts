// The delete-refspec rule of `git push` (task 4.1 of `post-0-2-0`): `git push origin :branch` deletes a branch on the remote.
// A `permissions.ask` rule cannot match it: Claude Code warns on the inner `:*` of `Bash(git push* :* *)`.
// The functions are pure, and `adapters/mod.ts` turns a ref into an ask.

import { commands } from "../../../../../kernel/shell.ts";
import { baseName, stripWrappers } from "../../../../../kernel/wrappers.ts";

/** The global options of `git` that take a separate argument. */
const GIT_VALUE_OPTS = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
  "--super-prefix",
  "--config-env",
]);

/** The options of `git push` that take a separate argument. */
const PUSH_VALUE_OPTS = new Set([
  "--repo",
  "--receive-pack",
  "--exec",
  "--push-option",
  "-o",
]);

/** The arguments after `push` of a `git push` call, or `null` for another command. */
const pushArgs = (argv: string[]): string[] | null => {
  const rest = stripWrappers(argv);
  if (rest[0] === undefined || baseName(rest[0]) !== "git") return null;
  let i = 1;
  while (i < rest.length && (rest[i] as string).startsWith("-"))
    i += GIT_VALUE_OPTS.has(rest[i] as string) ? 2 : 1;
  return rest[i] === "push" ? rest.slice(i + 1) : null;
};

/** The plain words of `git push` arguments, and true when `--repo` names the remote. */
const plainWords = (args: string[]): { plain: string[]; repo: boolean } => {
  const plain: string[] = [];
  let repo = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (arg === "--") {
      plain.push(...args.slice(i + 1));
      break;
    }
    if (arg === "--repo" || arg.startsWith("--repo=")) repo = true;
    if (!arg.startsWith("-")) plain.push(arg);
    else if (PUSH_VALUE_OPTS.has(arg)) i++;
  }
  return { plain, repo };
};

/**
 * The ref of the first delete refspec (`:ref` or `+:ref`) that `command` pushes, or `null`.
 * `commands` reads each simple command, also in a substitution, `bash -c`, `eval`, a group, and a branch of `if`.
 * The first plain word of `git push` is the remote, and each later plain word is a refspec.
 * A refspec with a source (`a:b`, `HEAD:main`) and a plain name pass.
 */
export const deleteRefspec = (command: unknown): string | null => {
  for (const argv of commands(String(command ?? ""))) {
    const args = pushArgs(argv);
    if (!args) continue;
    const { plain, repo } = plainWords(args);
    for (const refspec of repo ? plain : plain.slice(1)) {
      const ref = /^\+?:(.+)$/.exec(refspec)?.[1];
      if (ref) return ref;
    }
  }
  return null;
};
