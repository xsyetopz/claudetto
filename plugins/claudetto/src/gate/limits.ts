// The bounds of the gate rules.

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

/** The longest time of one `git` run for the gate, in milliseconds. A slower run fails the gate, and a person decides. */
export const GIT_TIMEOUT_MS = 5000;

/** The largest `git` config file, in bytes, that the gate reads for its stamp. The gate reads each config file in full on each call, and a real config is a few kilobytes. A larger file counts as unread, so the alias facts are unknown and the gate asks for a verb that is not built in. */
export const GIT_CONFIG_FILE_MAX_BYTES = 1_000_000;

/** The longest time in milliseconds that one scan for env files runs. */
export const ENV_SCAN_MS = 10_000;

/** The time in milliseconds for which the secrets rule keeps the list of env files of a scan, because a folder deep in the project does not change the modification time of the project folder. A scan after a call is always new. */
export const ENV_SCAN_CACHE_MS = 10_000;
