# Claude Code Environment Variables: Sessions and Storage

These 82 environment variables of Claude Code `2.1.303` cover folders, session files, resume, install, and updates.
A session is one saved conversation on your disk.
An environment variable is a named setting that you put in your shell or in the `env` key of `settings.json`.

## Example

Run `export DISABLE_AUTOUPDATER=1` before `claude` to stop the automatic updates.
Or put `{ "env": { "DISABLE_AUTOUPDATER": "1" } }` in `~/.claude/settings.json`.

## Variables

The marks are explained on the [index](Claude-Code-Env-Vars#marks).

| Name | Mark | What It Does | Value | Where It Works |
| --- | --- | --- | --- | --- |
| `BUN_INSTALL` | 🔍 | Names the Bun install folder. Claude Code uses it to detect a Bun global install and pick `bun` or `npm` for update commands. | Text. Checked against `<value>/install/global/` in the executable path | Auto-update and install detection |
| `CLAUDE_AFTER_LAST_COMPACT` | 🔍 | Asks the session logs API for only the lines after the last compaction. | On or off. Truthy value adds the query param `after_last_compact=true` to the session logs fetch | Remote session log fetch. Not set from project `env` before trust |
| `CLAUDE_BG_TCC_DISCLAIMED` | 🔍 | Marks that a macOS process already re-executed with disclaimed responsibility. This avoids a second re-exec. | Text. Set to `1` by Claude Code before `execve`. The new process reads it, then deletes it | MacOS background sessions. Not set from project `env` before trust |
| `CLAUDE_BG_WORKSPACE_TRUSTED` | 🔍 | Tells a background session that the workspace was already trusted. Project settings env and hooks then stay on. | On or off. The dispatcher sets `1`. The session also checks the stored trust record | Background sessions. Not set from project `env` before trust |
| `CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST` | 🔍 | Tells Claude Code that the host manages updates. Plugin autoupdate then turns off when the host pin says so. | On or off | Host-embedded sessions |
| `CLAUDE_CODE_BASE_REF` | 🔍 | Sets the git base ref that Claude Code uses in `merge-base` calls for diffs. A ref that starts with `-` is rejected. | Text. A per-checkout ref from `CLAUDE_CODE_BASE_REFS` wins | Cloud and repo checkout sessions |
| `CLAUDE_CODE_BASE_REFS` | 🔍 | Gives a base ref for each repo checkout. It feeds the same `merge-base` diff logic as `CLAUDE_CODE_BASE_REF`. | Text | Cloud and repo checkout sessions |
| `CLAUDE_CODE_CCR_SKIP_FRESH_MIGRATIONS` | 🔍 | Skips the config migrations on a fresh config. It marks them as done. | On or off. Applies only when two further checks about a fresh cloud config pass | Cloud sessions |
| `CLAUDE_CODE_CHILD_SESSION` | ✅ | Marks a session that Claude Code started as a subprocess. Set by Claude Code. | On or off. A nested interactive session skips `--resume` lists. `CLAUDE_CODE_FORCE_SESSION_PERSISTENCE` overrides that | All sessions |
| `CLAUDE_CODE_CONFIG_WATCH_EVENTS` | 🔍🧪 | Makes the config freshness watcher use file system events instead of interval polling. | On or off, off by default. Only takes effect on Linux. Background sessions unset it | Linux only |
| `CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION` | ✅ | Uses only the top admin source `env` block instead of merging `env` per key across admin sources. | On or off. Must come from the launch environment | Managed settings |
| `CLAUDE_CODE_DISABLE_AWAITING_USER_IDLE` | 🔍 | Turns off the idle accounting that parks session activity while Claude waits for the user. | On or off, off by default | All sessions |
| `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING` | ✅ | Turns off file checkpointing, so `/rewind` cannot restore code. Overrides `fileCheckpointingEnabled`. | On or off. SDK sessions also need `CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING` | All sessions. Project `env` can set it before trust |
| `CLAUDE_CODE_DISABLE_HOME_SETTINGS_SEED` | 🔍 | Stops the home settings seed from starting in the file sync worker. The start check reports `disabled`. | On or off, off by default. Truthy string read from the child spawn environment | Remote and hosted sessions |
| `CLAUDE_CODE_DISABLE_NESTED_CHAIN_IDLE` | 🔍 | Stops the session activity tracker from counting nested prompts that block on the user. | On or off, off by default | All sessions |
| `CLAUDE_CODE_DISABLE_NESTED_USER_REPAIR` | 🔍 | Turns off the repair of a user message that arrives wrapped one level deep on the input stream. The log then says `repair_disabled`. | On or off, off by default | SDK and stream input |
| `CLAUDE_CODE_DISABLE_STARTUP_WORK_GATE` | 🔍 | Skips arming the startup work gate that makes queued startup tasks wait. | On or off, off by default | All sessions |
| `CLAUDE_CODE_DOWNLOAD_DEADLINE_MS_FOR_TESTING` | 🔍 | Overrides the total download deadline of the updater download, for tests. | A number. Invalid or `0` gives the default | Native installer and updater download |
| `CLAUDE_CODE_EAGER_FLUSH` | 🔍 | Flushes the transcript to storage right after each persist, before the turn goes on. | On or off, off by default. Also on when `CLAUDE_CODE_IS_COWORK` is set | SDK and print mode with session persistence |
| `CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING` | ✅ | Turns on file checkpointing in non-interactive mode. | On or off, off by default. `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING` still wins. Set to `true` by the SDK when its option is on | SDK and `--print` mode |
| `CLAUDE_CODE_EXIT_AFTER_STOP_DELAY` | ✅ | Exits the process this many ms after the query loop goes idle. | A number, off by default. Whole number. A value above `0` turns it on | SDK mode and scripts |
| `CLAUDE_CODE_FORCE_SESSION_PERSISTENCE` | ✅ | Keeps transcripts and history when `CLAUDE_CODE_CHILD_SESSION` would mark a session as nested. | On or off, off by default | All sessions |
| `CLAUDE_CODE_HARBOR_KITE_PACING_OFF` | 🔍🧪 | Turns off the pacing of outbound messages to local `uds` inboxes (code credits and debits a pacer per send). | On or off. When set, the pacing check returns false. When unset, a feature flag decides | All sessions, cross-session messaging |
| `CLAUDE_CODE_HOME_SEED_HOLD_TIMEOUT_MS` | 🔍 | Lowers the longest hold time of the home seed step. The value cannot raise the built-in maximum. | A number of milliseconds. Whole number with min `0`. Result is the smaller of this value and a built-in cap | Host-seeded home or settings sync |
| `CLAUDE_CODE_HOME_SEED_VERDICT_TIMEOUT_MS` | 🔍 | Lowers the longest wait for the verdict of the home seed step. The value cannot raise the built-in maximum. | A number of milliseconds. Whole number with min `0`. Result is the smaller of this value and a built-in cap | Host-seeded home or settings sync |
| `CLAUDE_CODE_HOST_SESSION_ID` | 🔍 | Records the session id that the host app gave in the session registry entry as `hostSessionId`. | Text. Read only for host-started sessions | Host apps (desktop) |
| `CLAUDE_CODE_HOST_WORKTREE` | 🔍 | A host declares the worktree path of the session. Claude Code checks it against the start directory and reports problems. | Text. Removed from the env of child processes | Host apps |
| `CLAUDE_CODE_HOST_WORKTREE_FENCE` | 🔍 | A host declares the fence for the worktree. Claude Code checks it and reports a problem such as `fence_too_wide`. | Text. Removed from the env of child processes | Host apps |
| `CLAUDE_CODE_HOVER_REST` | 🔍🧪 | Pins the storage backend and the config home at start. A later change of `CLAUDE_CONFIG_DIR` is then reported. | On, off, or unset, off if unset. Any truthy string also triggers the pin at CLI entry. Unset falls back to a feature flag | All sessions |
| `CLAUDE_CODE_INSTALLED_VIA_NPM_WRAPPER` | 🔍 | The name appears only in a list of env names. No property read of this name was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | - | Install |
| `CLAUDE_CODE_MANAGED_SETTINGS_PATH` | 🔍 | Names the folder of managed (policy) settings in place of the machine default. | Text. Claude Code also sets it to a config dir in the env it builds for isolated runs | All sessions, managed settings |
| `CLAUDE_CODE_MESSAGING_SOCKET` | ✅ | Gives the path of the session inbox socket to hooks and Bash commands. | Set by Claude Code when it binds the socket | Sessions with cross-session messaging |
| `CLAUDE_CODE_MESSAGING_TOKEN` | ✅ | Gives a per-session token that a script can send to the inbox socket to prove it belongs to the session. | Text (a secret). Set by Claude Code beside the socket path. Removed when the socket closes | Sessions with cross-session messaging |
| `CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE` | ✅ | Lets Claude Code run the package manager upgrade command in the background. Matches the docs for Homebrew and WinGet. | On or off. The upgrade runs with a 300000 ms timeout and logs `pm_homebrew` or `pm_winget` telemetry | Homebrew and WinGet installs |
| `CLAUDE_CODE_PROJECT_DIR_NAME` | ✅ | Sets the `projects/` subdir name for transcripts and memory. Needs `CLAUDE_CONFIG_DIR`. | Text. Windows reserved names are refused | All sessions |
| `CLAUDE_CODE_RELAUNCH_HOME_TRUST` | 🔍 | Carries a `pid:starttime` token across a relaunch. It proves that the home dir trust came from the parent process. | Text. Set by Claude Code on relaunch | Relaunched sessions |
| `CLAUDE_CODE_RELAUNCH_PROACTIVITY_BASELINE` | 🔍 | Carries the proactivity baseline permission mode across a relaunch. `bypassPermissions` is dropped when not allowed. | Set by Claude Code on relaunch. Read once and removed from the env | Relaunched sessions |
| `CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED` | 🔍 | Carries across a relaunch whether the proactivity choice was already made. | Set by Claude Code on relaunch. Read once and removed | Relaunched sessions |
| `CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON` | 🔍 | Carries across a relaunch whether proactivity was ever on. | Set by Claude Code on relaunch. Read once and removed from the env | Relaunched sessions |
| `CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL` | 🔍 | Carries the proactivity level across a relaunch. An invalid level clears the related relaunch vars. | Set by Claude Code on relaunch. Read once and removed from the env | Relaunched sessions |
| `CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG` | 🔍 | Restricts use of personal Claude Code files, per a bundle message. The check also reads a settings-level source. | On or off. Part of the env list that background sessions pass on | All sessions |
| `CLAUDE_CODE_RESUME_FROM_SESSION` | 🔍 | Names a source session to load at start with the sessions API. It applies when a URL or SDK URL start has no messages. | Text. Claude Code clears it for child worker processes | Remote and SDK starts |
| `CLAUDE_CODE_RESUME_INTERRUPTED_TURN` | ✅ | Resumes a turn that ended in the middle. | On or off. Claude Code sets it to `1` when it restarts a worker or background session a second time | SDK and background sessions |
| `CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS` | ✅ | Bounds the age of the last message for auto resume of a turn. | A number of milliseconds. `0` or unset gives no bound. Negative or non-numeric gives 3600000 ms | SDK and background sessions |
| `CLAUDE_CODE_RESUME_PROMPT` | ✅ | Overrides the continuation text sent to the model when an interrupted turn resumes instead of resending its prompt. | Text, `Continue from where you left off.` by default. Empty string uses the default. The background supervisor sets it on respawn after a first attempt | Resume, background sessions, `-p`. Not set from project `env` before trust |
| `CLAUDE_CODE_RESUME_REASON` | 🔍 | Names why a host resumed an interrupted turn. The value is stamped on the first reply frames of the resumed turn. | Text. Other values fall back to `interrupted_turn` | Hosts and SDK output. Docs of the SDK frame list examples such as `host_draining` |
| `CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS` | 🔍 | On resume, waits up to this many ms for `SessionStart` hooks, then goes on without them. A [Probes](Claude-Code-Probes) run saw no effect. | A number of milliseconds. Integer 1 to 2147483647, unset by default. When unset, resume does not wait for these hooks | Resume of a session that has messages |
| `CLAUDE_CODE_RESUME_SOURCE_ALIVE` | 🔍 | Tells a resumed or forked session that its source session is still alive. It carries ids and a boundary time used to skip rows already seen. | Text. Fields seen are `sessionId`, `parentSessionId`, and `boundaryAt` | Resume and fork. Set by a host. Not set from project `env` before trust |
| `CLAUDE_CODE_RESUME_THRESHOLD_MINUTES` | 🔍🧪 | Sets the idle age in minutes after which a resumed session gets the return prompt. Default is 70. | A number, `70` by default. Integer, default `70`. Works only when a feature flag or a feature flag is on | Interactive resume. gated by a feature flag and a feature flag |
| `CLAUDE_CODE_RESUME_TOKEN_THRESHOLD` | 🔍🧪 | Sets the estimated token size above which a resumed session gets the return prompt. Default is 100000. | A number, `100000` by default. Integer, default `100000`. Works only when a feature flag or a feature flag is on | Interactive resume. gated by a feature flag and a feature flag |
| `CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_APPENDS` | 🔍 | On resume, treats trailing context-only user rows from the host as not a new prompt. This keeps interrupted-turn detection correct. | On or off. Also passed to the parked-permission logic as `toleratesContextAppends` | Resume and SDK or remote hosts |
| `CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_SEEDS` | 🔍 | On resume, lets context seed rows and queued task notifications pass in interrupted-turn detection. Then the log reads as no turn rows. | On or off | Resume and SDK or remote hosts |
| `CLAUDE_CODE_SESSION_ID` | ✅ | Holds the current session ID for Bash, hook, and stdio MCP subprocesses. It is also read for session sync. | Text. Set by Claude Code for subprocesses. It is deleted from some inherited envs so a child does not reuse it | Bash, PowerShell, hooks, MCP stdio. Set by Claude Code |
| `CLAUDE_CODE_SESSION_KIND` | 🔍 | Names the kind of session. The value `bg` marks a background session, which changes cwd handling and restart advice. | Text. Value `bg` is the one tested by the code seen | Background sessions. Set by the supervisor |
| `CLAUDE_CODE_SESSION_NAME` | 🔍 | Sets the session name in the concurrent-session record. A user-set name has source `user`. | Text. The code trims it. An empty result means no name | Concurrent-session registry, background sessions |
| `CLAUDE_CODE_SESSION_START_ANNOUNCEMENTS_BEFORE_PROMPT` | 🔍 | Changes when session start announcements are placed relative to the first prompt. When set, they come before it. | On or off. The exact order effect was not read further | All sessions |
| `CLAUDE_CODE_SKIP_PROMPT_HISTORY` | ✅ | Skips writing prompt history and session transcripts to disk. Such sessions do not show in resume or up-arrow history. | On or off. Persistence reports the reason `skip_prompt_history`. It also marks a nested ambient session | All sessions |
| `CLAUDE_CODE_STALL_TIMEOUT_MS_FOR_TESTING` | 🔍 | Overrides the no-data stall timeout of the update download. Meant for tests. | A number. A zero or invalid value falls back to `120000` ms | Installer and updater downloads |
| `CLAUDE_CODE_STARTUP_FAILURE_RESULTS` | ✅ | Makes a `stream-json` run write a result message with a `startup_failure_reason` for startup failures that end with stderr alone. | On or off | Print mode with `--output-format stream-json` |
| `CLAUDE_CODE_TMPDIR` | ✅ | Overrides the temp directory for internal temp files. Also passed to child shells and used as `TMPDIR` in the sandbox. | Text. Falls back to `/tmp`. The sandbox also reads undocumented `CLAUDE_TMPDIR` and uses `/tmp/claude` last | All sessions |
| `CLAUDE_CODE_TRANSCRIPT_LOCAL_GC` | ✅⚠️ | Trims the transcript before each compaction once the file passes 5 MB. Docs match this. Docs omit that `0` also blocks a flag-driven path. | On, off, or unset. For the remote path it overrides a feature flag. The local path needs non-interactive and not `CLAUDE_CODE_REMOTE` | `-p` and SDK sessions |
| `CLAUDE_CODE_TRANSCRIPT_SLIM_TOOL_RESULTS` | 🔍 | Picks `slim` over `counted` mode for tool results in the transcript of SDK sessions that use an SDK URL. | On or off. Read at startup in non-interactive sessions with an SDK URL | SDK URL sessions |
| `CLAUDE_CONFIG_DIR` | ✅ | Sets the config directory in place of `~/.claude`. Also changes the secure storage entry name by a hash of the path. | Text | All sessions |
| `CLAUDE_IMPORT_CONVERSATIONS` | 🔍 | Enables the import-conversations command. Without it the command says it is not enabled. | On or off. The command also needs `--cwd` | CLI import command |
| `CLAUDE_JOB_DIR` | ✅ | Holds the job directory of a background session. Claude Code writes `exit-cause` and `exit-detail` files there. | A path. Set by Claude Code | Background sessions |
| `CLAUDE_RELAUNCH_SESSION_ADD_DIRS` | 🔍 | Carries the session `--add-dir` paths over a relaunch of Claude Code. | - | - |
| `CLAUDE_TMPDIR` | 🔍 | Sets the temp directory for the Bash sandbox, after `CLAUDE_CODE_TMPDIR`. | - | - |
| `DISABLE_AUTOUPDATER` | ✅ | Turns off automatic background updates. | On or off | - |
| `DISABLE_INSTALLATION_CHECKS` | ✅ | Turns off installation warnings. | On or off | - |
| `DISABLE_UPDATES` | ✅ | Blocks every update, including `claude update` and `claude install`, with the message "Updates are disabled by your administrator". | On or off. Also reported as the reason the auto-updater is off, ahead of `DISABLE_AUTOUPDATER` | All sessions. Project `env` can set it before trust |
| `ENABLE_LOCKLESS_UPDATES` | 🔍❌ | In the schema, but nothing reads it. | On or off | Nowhere, nothing reads it |
| `ENABLE_PID_BASED_VERSION_LOCKING` | 🔍❌ | In the schema, but nothing reads it. | On, off, or unset | Nowhere, nothing reads it |
| `ENABLE_SESSION_PERSISTENCE` | 🔍❌ | In the schema, but nothing reads it. | On or off | Nowhere, nothing reads it |
| `TEMP` | ✅ | Temp directory name. Claude Code uses it to find the temp dir when `CLAUDE_CODE_TMPDIR` is not set. | Text. Non-empty string. On Windows tries `TEMP`, then `TMP` | All sessions |
| `TERMUX_VERSION` | 🔍 | Marks the Termux app on Android. Claude Code then uses `$PREFIX/tmp` instead of `/tmp` for sockets and daemon files. | Text. Non-empty string, with `PREFIX` set. Used for the daemon dir and the socks dir, and for a path check | Termux on Android |
| `TMP` | ✅ | Temp directory name. Claude Code uses it as a fallback when `CLAUDE_CODE_TMPDIR` and `TMPDIR` are not set. | Text. Non-empty string. Windows tries `TEMP` then `TMP` | All sessions |
| `TMPDIR` | ✅ | Temp directory. Claude Code uses it as the temp root on Linux when `CLAUDE_CODE_TMPDIR` is not set. | Text. Non-empty string. macOS ignores it for the temp root. Also added to allowed write paths | All sessions |
| `XDG_CACHE_HOME` | ✅ | XDG cache directory. Claude Code uses it for cache paths and adds it to allowed sandbox paths. | Text. Non-empty string. Default is `~/.cache` | Linux |
| `XDG_CONFIG_HOME` | ✅ | XDG config directory. Claude Code uses it for the global git ignore file and the Anthropic config dir. | A path. Non-empty absolute path. Default is `~/.config` | Linux and macOS |
| `XDG_DATA_HOME` | ✅ | XDG data directory. Claude Code uses it to find shell history and adds it to allowed sandbox paths. | Text. Non-empty string. Default is `~/.local/share` | Linux |
| `XDG_RUNTIME_DIR` | 🔍 | XDG runtime directory. Claude Code puts the `cc-socks` socket dir under it. | Text, dir by default. Non-empty string. Falls back to a default dir if unset or if the path is too long for a socket | Linux |
| `XDG_STATE_HOME` | ✅ | XDG state directory. Claude Code uses it for log and state paths and adds it to allowed sandbox paths. | Text. Non-empty string. Default is `~/.local/state` | Linux |

## See Also

- [Environment Variables](Claude-Code-Env-Vars)
- [Probes](Claude-Code-Probes)
- [Settings](Claude-Code-Settings)
