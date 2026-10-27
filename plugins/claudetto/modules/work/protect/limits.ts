// The bounds of the `protect` slice.

/** The protected files at a fixed path below the project root, besides the plan and spec files and the `tasks.md` boxes that `kindOf` finds. */
export const PROTECTED_FILES: readonly string[] = [
	".claude/claudetto/goal.json",
	".jscpd-baseline.json",
];

/** The folder, below the project root, that holds the plan and spec files. */
export const PLAN_DIR = "openspec";

/** The folder, below the project root, that `openspec archive` moves a finished change into. */
export const ARCHIVE_DIR = `${PLAN_DIR}/changes/archive`;

/** The folders of `PLAN_DIR` that the search leaves out: the finished changes. */
export const PLAN_SKIPPED: readonly string[] = ["archive", "node_modules"];

/** The most protected files that one call saves. */
export const PROTECT_FILES_MAX = 100;

/** The most characters of a protected file that one call saves. A longer file is not saved, and so not guarded. */
export const PROTECT_CHARS_MAX = 1_000_000;

/** The most folders that one search for protected files lists. */
export const PROTECT_DIRS_MAX = 300;

/** The deepest folder of `PLAN_DIR` that the search reads. */
export const PROTECT_DEPTH_MAX = 6;

/** The longest time of the `rm` run that deletes a protected file that a call created, in milliseconds. */
export const RM_TIMEOUT_MS = 5000;

/** The longest time of one `git` run that the undo makes, in milliseconds. */
export const GIT_TIMEOUT_MS = 5000;

/** The most commits whose blob the undo compares with a changed file. */
export const GIT_COMMITS_MAX = 200;

/** The longest time of the `git ls-remote` run that checks a moved remote-tracking ref, in milliseconds. */
export const LS_REMOTE_TIMEOUT_MS = 10_000;

/** The file, below the home folder, that `ssh` reads for the host settings of an `ssh` remote. */
export const SSH_CONFIG = ".ssh/config";

/** The prefixes of the config keys that `git ls-remote <url>` never reads, so a change of them leaves the stamp of the config as it was. `git ls-remote` with a URL reads `core.*`, `remote.<url>.*`, `url.*`, `http.*`, `credential.*`, `protocol.*`, and `ssh.*`, but the keys of a branch (`git push -u`, `git switch -c --track`, `git branch --set-upstream-to`, and the first `git checkout` of `origin/<n>`) pick the default remote of `git pull` and `git push`, which a call with a URL does not use, and `submodule.*` is read by the commands of a submodule only. Any key that is not here counts, because a key that is new to `git` could change the answer. */
export const STAMP_IGNORED: readonly string[] = ["branch.", "submodule."];

/** The script, run with `sh -c`, that prints the program that `ssh` and `git` name in `PATH` as `ssh=<path>` and `git=<path>`, a line each. A name that `PATH` does not have gives an empty path. */
export const BIN_SCRIPT =
	'for c in ssh git; do printf "%s=%s\\n" "$c" "$(command -v "$c")"; done';
