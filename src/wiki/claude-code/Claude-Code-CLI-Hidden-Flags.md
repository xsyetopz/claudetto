# Claude Code CLI Hidden Flags

A hidden flag works, but `claude --help` does not show it.
Most of them serve the SDK, the desktop app, the IDE extensions, or tests.
For example, `claude -p --max-turns 3 "Fix the failing test"` stops after three agent turns, and the docs list `--max-turns` although the help does not.

## About the Table

A row has the mark ✅ when a docs page names the flag, even though the help hides it.
A row has the mark 🔍 when only the bundle has the flag, or when only the changelog and the Agent SDK pages name it.
Treat a 🔍 flag as unstable, because Anthropic can change it without notice.

| Flag | Mark | What it does |
| --- | --- | --- |
| `-d2e, --debug-to-stderr` | 🔍 | Turns on debug mode and writes to stderr, and the flag is deprecated. |
| `--init` | ✅ | Runs `Setup` hooks with the `init` trigger and then goes on. |
| `--init-only` | ✅ | Runs `Setup` and `SessionStart:startup` hooks and then exits. |
| `--maintenance` | ✅ | Runs `Setup` hooks with the `maintenance` trigger and then goes on. |
| `--session-mirror` | 🔍 | Writes `transcript_mirror` frames to stdout, for the SDK. |
| `--await-claim` | 🔍 | Starts as a spare process for an SDK host and waits for a `claim_session` request. |
| `--await-initialize` | 🔍 | Reads the `initialize` request from stdin at startup so its fields apply like flags. |
| `--thinking <mode>` | 🔍 | Sets the thinking mode: `enabled` (the same as `adaptive`) or `disabled`. |
| `--thinking-display <display>` | 🔍 | Sets how the thinking text appears in the response. |
| `--max-thinking-tokens <tokens>` | 🔍 | Sets a thinking token limit, and the flag is deprecated in favor of `--thinking`. |
| `--max-turns <turns>` | ✅ | Stops after a number of agent turns, with `--print` only. |
| `--task-budget <tokens>` | 🔍 | Sets a task budget in tokens on the API side (`output_config.task_budget`). |
| `--enable-auth-status` | 🔍 | Turns on auth status messages in SDK mode. |
| `--permission-prompt-tool <tool>` | ✅ | Names an MCP tool that answers permission prompts, with `--print` only. |
| `--system-prompt-file <file>` | ✅ | Reads the system prompt from a file. |
| `--append-system-prompt-file <file>` | ✅ | Reads text from a file and adds it to the end of the default system prompt. |
| `--append-subagent-system-prompt <prompt>` | ✅ | Adds text to the system prompt of every subagent, with `--print` only. |
| `--append-subagent-system-prompt-file <file>` | ✅ | Reads text from a file and adds it to every subagent prompt, with `--print` only. |
| `--plan-mode-instructions <instructions>` | 🔍 | Replaces the default steps of plan mode with your own text. |
| `--inherit-permission-mode <mode>` | 🔍 | Sets a permission mode from a parent session, used only when nothing else sets one. |
| `--watch-artifact <artifact>` | 🔍 | Watches a Claude artifact for new versions and comments. |
| `--watch-artifact-no-autoreact <artifact>` | 🔍 | Watches an artifact and does not react to it by itself. |
| `--prefill <text>` | 🔍 | Fills the prompt box with text and does not send it. |
| `--deep-link-origin` | 🔍 | Says that a deep link started this session. |
| `--deep-link-repo <slug>` | 🔍 | Gives the repo slug that the deep link resolved to the current folder. |
| `--deep-link-last-fetch <ms>` | 🔍 | Gives the time of the last fetch of the repo, in milliseconds. |
| `--prefill-b64 <b64>` | 🔍 | Fills the prompt box with base64url text, for deep links. |
| `--deep-link-cwd-b64 <b64>` | 🔍 | Gives the working folder as base64url text, for deep links. |
| `--resume-session-at <message id>` | 🔍 | Resumes only up to one message of the chain, with `--resume` in print mode. |
| `--resume-drops-turn <message id>` | 🔍 | Names the turn that a truncating resume drops, and the resume fails if more would go. |
| `--reply-on-resume` | 🔍 | Asks the model to reply at once when the transcript ends with a user message. |
| `--rewind-files <user-message-id>` | 🔍 | Restores the files to the state at a user message and exits, and it needs `--resume`. |
| `--include-unsupported-models` | 🔍 | Offers models that your account can use and this version does not know. |
| `--fast-mode <on\|off>` | 🔍 | Turns fast mode on or off. |
| `--workload <tag>` | 🔍 | Sets a workload tag for the attribution block, with `--print` only. |
| `--client-data-url <url>` | 🔍 | Loads a signed configuration document from a URL and exits if it fails. |
| `--allow-other-models` | 🔍 | With `--client-data-url`, starts on a model that the document does not list. |
| `--managed-settings <json>` | 🔍 | Gives policy settings as JSON from a parent process, for the SDK. |
| `--host-auth-is-org-sign-in` | 🔍 | Says that the token of the host is an organization sign-in, for desktop hosts. |
| `--project-config-root <dir>` | 🔍 | Reads project settings and the `.claude` trees from another folder. |
| `--plugin-dir-no-mcp <path>` | 🔍 | Works like `--plugin-dir` but does not read the `.mcp.json` of the plugin. |
| `--advisor <model>` | ✅ | Turns on the server-side advisor tool with the model that you name. |
| `--enable-auto-mode` | ✅ | Opts in to auto mode, and the flag is deprecated. |
| `--proactivity <level>` | 🔍 | Sets the level of proactivity, and the bundle gives no help text. |
| `--messaging-socket-path <path>` | 🔍 | Sets the socket or pipe path of the cross-session messaging server. |
| `--channels <servers...>` | ✅ | Lists the MCP servers whose channel notifications may register this session. |
| `--dangerously-load-development-channels <servers...>` | ✅ | Loads channel servers that are not on the allowlist, for local development only. |
| `--agent-id <id>` | 🔍 | Sets the ID of a teammate agent. |
| `--agent-name <name>` | 🔍 | Sets the display name of a teammate. |
| `--team-name <name>` | 🔍 | Sets the team name for teammate coordination. |
| `--agent-color <color>` | 🔍 | Sets the UI color of a teammate. |
| `--plan-mode-required` | 🔍 | Requires plan mode before the teammate implements anything. |
| `--parent-session-id <id>` | 🔍 | Gives the parent session ID for analytics. |
| `--teammate-mode <mode>` | ✅ | Sets the mode of a teammate, and the bundle gives no help text. |
| `--agent-type <type>` | 🔍 | Sets a custom agent type for a teammate. |
| `--sdk-url <url>` | 🔍 | Uses a WebSocket endpoint for SDK input and output, with `-p` and `stream-json`. |
| `--forward-home-settings <true\|false>` | 🔍 | Sets whether this machine sends its settings to the cloud session. |
| `--remote [description\|session_id\|url]` | ✅ | Is a deprecated alias for `--cloud`. |
| `--attach-serve <session_id>` | 🔍 | Attaches a helper to a cloud session, and the desktop app starts it. |
| `--pool <pool_id>` | 🔍 | Is a deprecated alias for `--environment`. |
| `--correlation-id <id>` | 🔍 | Sets an ID that goes back to the environment orchestrator, and it needs `--environment`. |
| `--ref <ref>` | ✅ | Sets the branch, tag, or SHA to check out in the remote session, and it needs `--cloud` or `--environment`. |
| `--on-branch <branch>` | 🔍 | Works directly on a branch in the remote session, with checkout and push. |
| `--rc [name]` | ✅ | Is an alias for `--remote-control`. |

## See Also

- [CLI](Claude-Code-CLI)
- [CLI Flags](Claude-Code-CLI-Flags)
