// A choice of the author: each bound in this file is a limit that the gate sets, not a value of a tool.
export const GLOB_WORD_MAX = 256;

// A choice of the author: the `git` verbs that the gate takes as known without reading the config; each is a command that `git --list-cmds=main,nohelpers,others,alias` gives for Git 2.54.0.
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

export const GIT_TIMEOUT_MS = 5000;

export const GIT_CONFIG_FILE_MAX_BYTES = 1_000_000;

/** The longest time in milliseconds that one scan for env files runs. */
export const ENV_SCAN_MS = 10_000;

export const ENV_SCAN_CACHE_MS = 10_000;
