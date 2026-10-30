// The bounds of the shell reader.

/** The most characters that `parse` in `src/shell/shell.ts` reads in one command with its nested scripts. */
export const SHELL_SCAN_MAX_CHARS = 200_000;

/** The most words that the brace expansion of one word gives. A word that gives more is unreadable. */
export const BRACE_WORDS_MAX = 256;

/** The most values that the program words and scripts of one command can take together, when its variables hold more than one value each. A command over the bound is unreadable. */
export const SHELL_VARIANTS_MAX = 32;

/** The deepest chain of `git` aliases that call aliases. A chain over the bound is unreadable (`git` itself stops at a loop). */
export const ALIAS_DEPTH_MAX = 8;
