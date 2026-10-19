# Claude Code Hooks: Session Events

These events fire when a session starts or ends, and when its settings, files, or folders change.
The events are `SessionStart`, `Setup`, `SessionEnd`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged`, and `DirectoryAdded`.
For example, a `SessionStart` hook can add your open tickets as context.

## SessionStart

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `SessionStart` | Fires when a session starts or resumes | Matcher is `source`. Interactive starts run it in the background, but the first reply waits for it. Exit 2 shows stderr to the user only | `command`, `mcp_tool` (skipped at launch) | [Hooks Reference][hr], `SessionStartHookInput` |
| ✅ | `source` | How the session began | `startup`, `resume`, `clear`, `compact`, `fork` | stdin | [Hooks Reference][hr] |
| ✅ | `model` | Active model ID | Can be missing, for example after `/clear` | stdin | [Hooks Reference][hr] |
| ✅ | `agent_type` | Agent name of `--agent` | Optional | stdin | [Hooks Reference][hr] |
| ✅ | `session_title` | Custom title | Present only when a custom title exists | stdin | [Hooks Reference][hr] |
| ✅ | `seconds_since_last_response`, `context_tokens`, `prompt_cache_likely_expired`, `estimated_cache_write_usd` | The cost of a stale resume | Only for `resume` and `fork` with a prior reply. Needs 2.1.251 | stdin | [Hooks Reference][hr] |
| ✅ | `additionalContext` | Text before the first prompt | Plain stdout works too | `hookSpecificOutput` | [Hooks Reference][hr] |
| ✅ | `initialUserMessage` | First user message | Only in `-p`. From a plugin it works only if the plugin was installed before the start | `hookSpecificOutput` | [Hooks Reference][hr] |
| ✅ | `sessionTitle` | Sets the title | Works for `startup`, `resume`, `fork`. Same as `/rename` | `hookSpecificOutput` | [Hooks Reference][hr] |
| ✅ | `watchPaths` | Absolute paths for `FileChanged` | | `hookSpecificOutput` | [Hooks Reference][hr] |
| ✅ | `reloadSkills` | Re-scan skill and command dirs | Use after a hook installs skills | `hookSpecificOutput` | [Hooks Reference][hr] |

## Setup

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| 🧪 | `Setup` | Fires for `--init-only`, or `--init` or `--maintenance` with `-p` | Gate: those CLI flags. Not on a normal start. `--init-only` also runs `SessionStart` with `startup` | `command` only | [Hooks Reference][hr], `SetupHookInput` |
| ✅ | `trigger` | `init` or `maintenance` | It is also the matcher | stdin | [Hooks Reference][hr] |
| ⚠️ | `additionalContext` | Docs: all JSON fields of `Setup` are dropped on every exit code. The bundle output schema and `ClassicResultFields` list `additionalContext` for `Setup` | Treat it as not delivered | `hookSpecificOutput` | [Hooks Reference][hr], bundle |
| ✅ | `CLAUDE_ENV_FILE` | Persist env vars | As for `SessionStart` | Env | [Hooks Reference][hr] |

## SessionEnd

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `SessionEnd` | Fires when a session ends | Matcher is `reason`. Budget 1.5 s. Exit 2 shows stderr to the user. JSON is dropped | `command`, `http`, `mcp_tool` | [Hooks Reference][hr], `SessionEndHookInput` |
| ✅ | `reason` | Why it ended | `clear`, `resume`, `logout`, `prompt_input_exit`, `other` | stdin | [Hooks Reference][hr], `ExitReason` |
| ❌ | `bypass_permissions_disabled` | Removed in 2.1.234 | Not sent. Not in `ExitReason`. Drop it from matchers | stdin | [Hooks Reference][hr] |

## InstructionsLoaded

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `InstructionsLoaded` | Fires when `CLAUDE.md` or `.claude/rules/*.md` loads | Matcher is `load_reason`. Runs async. No decision. Not for `AGENTS.md` read directly | `command`, `http`, `mcp_tool` | [Hooks Reference][hr], `InstructionsLoadedHookInput` |
| ✅ | `file_path` | Absolute path of the file | | stdin | [Hooks Reference][hr] |
| ✅ | `memory_type` | `User`, `Project`, `Local`, `Managed` | | stdin | [Hooks Reference][hr] |
| ✅ | `load_reason` | `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact` | | stdin | [Hooks Reference][hr] |
| ✅ | `globs`, `trigger_file_path`, `parent_file_path` | Extra data for lazy and `include` loads | `globs` is only for `path_glob_match` | stdin | [Hooks Reference][hr] |

## ConfigChange

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `ConfigChange` | Fires when a settings, managed policy, or skill file changes | Matcher is `source`. Not for server-managed or MDM changes. Exit 2 or `decision: "block"` stops the change, except for `policy_settings` | `command`, `http`, `mcp_tool` | [Hooks Reference][hr], `ConfigChangeHookInput` |
| ✅ | `source` | Config type | `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills` | stdin | [Hooks Reference][hr] |
| ✅ | `file_path` | Changed file | Optional | stdin | [Hooks Reference][hr] |
| ✅ | `decision`, `reason` | `block` keeps the old settings | `reason` is never shown. `systemMessage` and `continue` are dropped. No message is shown | stdout | [Hooks Reference][hr] |

## CwdChanged

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `CwdChanged` | Fires when a shell command in the main conversation changes the directory | No matcher. Cannot block. `CLAUDE_ENV_FILE` is cleared at the next event | `command`, `http`, `mcp_tool` | [Hooks Reference][hr], `CwdChangedHookInput` |
| ✅ | `old_cwd`, `new_cwd` | Directories | | stdin | [Hooks Reference][hr] |
| ✅ | `watchPaths` | Replaces the dynamic watch list | An empty array clears it. `systemMessage` shows as a short notice. `continue` is dropped | `hookSpecificOutput` | [Hooks Reference][hr] |

## FileChanged

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `FileChanged` | Fires when a watched file changes on disk | A file watcher, not tool calls. The matcher names the files to watch and filters by basename. Cannot block | `command`, `http`, `mcp_tool` | [Hooks Reference][hr], `FileChangedHookInput` |
| ✅ | `file_path` | Absolute path | | stdin | [Hooks Reference][hr] |
| ✅ | `event` | `change`, `add`, `unlink` | | stdin | [Hooks Reference][hr] |
| ✅ | `watchPaths` | Replaces the dynamic watch list | The watcher starts only when something names a file | `hookSpecificOutput` | [Hooks Reference][hr] |

## DirectoryAdded

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `DirectoryAdded` | Fires after `/add-dir` or the SDK `register_repo_root` request | Matcher is `source`. Runs in the background with a 600 s timeout. Not for `--add-dir`, `/permissions`, or a known directory | `command`, `http`, `mcp_tool` | [Hooks Reference][hr], `DirectoryAddedHookInput` |
| ✅ | `directory` | Absolute path | | stdin | [Hooks Reference][hr] |
| ✅ | `source` | `slash_command` or `register_repo_root` | `systemMessage` goes to Claude for `slash_command` and to the debug log otherwise | stdin | [Hooks Reference][hr] |

## Sources

- [Hooks Reference][hr].
- d.ts types `SessionStartHookInput`, `SetupHookInput`, `SessionEndHookInput`, `ExitReason`, `InstructionsLoadedHookInput`, `ConfigChangeHookInput`, `CwdChangedHookInput`, `FileChangedHookInput`, `DirectoryAddedHookInput`.
- Bundle: the hook output schema.

## Not Yet Checked

- Not verified: whether `Setup` `additionalContext` reaches the model in `2.1.303`.

## See Also

- [Hooks](Claude-Code-Hooks), with the legend of marks
- [Other Events](Claude-Code-Hooks-Events-Other)
- [Memory and Rules](Claude-Code-Memory-And-Rules)

[hr]: https://code.claude.com/docs/en/hooks
