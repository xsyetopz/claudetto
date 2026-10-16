/**
 * The verbs that the matchers below read.
 * A word of one of them after an unreadable name shows a git call.
 */
const GIT_VERBS = new Set([
  "branch",
  "checkout",
  "clean",
  "filter-branch",
  "gc",
  "push",
  "reflog",
  "reset",
  "restore",
  "rm",
  "stash",
  "switch",
  "worktree",
]);

/**
 * The index of the git verb in `words`, when the name of `words` is unreadable, or -1.
 * The walker gives a command name that a substitution wrote as `""`, as in `$(echo git) reset --hard`.
 * Such a name reads as `git` when a later word is a git verb, or a word that the hook cannot read.
 * A name followed by option words only, such as `$(which ls) -la`, has no verb, so it stays unreadable.
 */
export const gitVerbAt = (words: readonly string[]): number =>
  words[0] !== ""
    ? -1
    : words.findIndex((w, i) => i > 0 && (GIT_VERBS.has(w) || w === ""));

/**
 * The words that the git matchers read.
 * An unreadable name with a git verb after it reads as `git` from that verb on, as `gitVerbAt` finds it.
 * The words before that verb, such as `-C .`, are dropped here, and `walk.ts` keeps their `-C` folder.
 * No git matcher applies to a name that has no verb after it.
 */
export const gitWords = (words: readonly string[]): readonly string[] => {
  const at = gitVerbAt(words);
  return at < 0 ? words : ["git", ...words.slice(at)];
};
