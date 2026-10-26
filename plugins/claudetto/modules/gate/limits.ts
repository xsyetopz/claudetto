// The bounds of the `guard` slice.

/** The longest time of one `git` run for the gate, in milliseconds. A slower run fails the gate, and a person decides. */
export const GIT_TIMEOUT_MS = 5_000;

/** The largest `git` config file, in bytes, that the gate reads for its stamp. The gate reads each config file in full on each call, and a real config is a few kilobytes. A larger file counts as unread, so the alias facts are unknown and the gate asks for a verb that is not built in. */
export const GIT_CONFIG_FILE_MAX_BYTES = 1_000_000;

/** The least `P(yes)` of Jev that allows a call: `1 - APPROVAL_MAX` of the `decide` slice, which a test pins. It is above the 0.7 of `primitives-noul.md` because the docs say "raise it when acting on a false yes is expensive", and a false yes here loses files. */
export const JEV_YES_MIN = 0.8;

/** The longest `timeout` in milliseconds of a foreground `Bash` call of a subagent. The cache TTL of a subagent is 5 minutes (300,000 ms), and the bound leaves 1 minute for the time of the request before the call. A longer call can wake after the TTL and write the whole context to the cache again. */
export const BASH_WAIT_MAX_MS = 240_000;

/** The `timeout` in milliseconds of a `Bash` call that sets none and has no `BASH_DEFAULT_TIMEOUT_MS`. */
export const BASH_TIMEOUT_DEFAULT_MS = 120_000;

/** The shortest value of an env file that the secrets rule replaces in a result. A shorter value, such as `true`, `1`, or `dev`, would change each output. */
export const ENV_VALUE_MIN = 8;

/** The shortest value of an env file that the secrets rule replaces under a key name that says it is secret. It is replaced as a whole word only. */
export const ENV_SHORT_MIN = 4;

/** The longest time in milliseconds that one scan for env files runs. */
export const ENV_SCAN_MS = 10_000;

/** The time in milliseconds for which the secrets rule keeps the list of env files of a scan, because a folder deep in the project does not change the modification time of the project folder. A scan after a call is always new. */
export const ENV_SCAN_CACHE_MS = 10_000;

/** The most env files that the secrets rule reads. A scan that finds more leaves the rest unmasked and says so in the result. */
export const ENV_FILES_MAX = 1_000;

/** The most characters of an env file that the secrets rule reads. A longer file is no env file, and the result says that it is not masked. */
export const ENV_FILE_CHARS = 200_000;

/** The most values that the secrets rule keeps as a hash in the state, so that they stay replaced when the file is gone. */
export const ENV_VALUES_MAX = 500;

/** The shortest value, in characters, that the secrets rule keeps as a record in the state. A shorter value stays in the memory of the mod only, because a short value falls to a brute force of its record fast. `$.state` is a map in the memory of the Claude Code process, with no file (`wln` of Claude Code 2.1.310), so no tool call of the agent can read a record. */
export const ENV_PERSIST_MIN = 12;

/** The bits of the rolling hash of the start of a value that a record keeps. With 32 bits a result of 30,000 characters has about 0 false finds for 200 records (about 6 with 20 bits), so no find goes unconfirmed. `$.state` is in memory with no file, so a longer head gives no brute force of a file. */
export const ENV_HEAD_BITS = 32;

/** The rounds of SHA-256 of the slow hash that confirms a value. One confirm takes about 5 to 20 ms in the runtime of a mod. */
export const ENV_SLOW_ROUNDS = 1_000;

/** The most records that the secrets rule makes in one read of the env files. A slow hash takes about 10 ms, so a project with many values gets its records over several calls, and a value is replaced from its file until then. */
export const ENV_HASHES_PER_READ = 6;

/** The most slow confirms that the secrets rule runs for one call, over its result, context, and text together. One confirm takes about 6 ms in `bun` and about 11 ms in the lab runtime, and a result of 30,000 characters with 200 records takes about 16 ms with this bound (38 ms with 3). A find over the bound is masked with no confirm, so a text that is no value can be masked too, and the call gets one line that says so. */
export const ENV_CONFIRMS_MAX = 1;

/** The most tries of one write of the records to `$.state`. A try misses when another call wrote first, and then the write reads the records again and merges its own. */
export const ENV_STATE_TRIES_MAX = 5;

/** The deepest level of a tool result that the secrets rule cleans. */
export const RESULT_DEPTH_MAX = 12;

/** The longest word, in characters, that the gate reads as a glob. A longer word with a glob character counts as a glob that can match a secret file, because the match of a long glob is slow. */
export const GLOB_WORD_MAX = 256;

/** The `git` commands that the gate knows when it cannot read the list of `git --list-cmds=main,others`. A verb outside the list and outside the aliases is unknown. */
export const GIT_COMMON_COMMANDS = [
  "add",
  "am",
  "apply",
  "archive",
  "bisect",
  "blame",
  "branch",
  "bundle",
  "cat-file",
  "checkout",
  "cherry",
  "cherry-pick",
  "clean",
  "clone",
  "commit",
  "config",
  "describe",
  "diff",
  "difftool",
  "fetch",
  "for-each-ref",
  "format-patch",
  "fsck",
  "gc",
  "grep",
  "init",
  "log",
  "ls-files",
  "ls-remote",
  "ls-tree",
  "maintenance",
  "merge",
  "merge-base",
  "mergetool",
  "mv",
  "notes",
  "pull",
  "push",
  "range-diff",
  "rebase",
  "reflog",
  "remote",
  "reset",
  "restore",
  "rev-list",
  "rev-parse",
  "revert",
  "rm",
  "shortlog",
  "show",
  "show-ref",
  "sparse-checkout",
  "stash",
  "status",
  "submodule",
  "switch",
  "tag",
  "update-index",
  "update-ref",
  "worktree",
];
