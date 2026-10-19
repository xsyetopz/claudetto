# Claude Code System Prompt Sections

The system prompt is built from named sections, and each section has a rule for when it appears.
Knowing the names lets you find the part you want to change, or lets a mod remove it.
No docs page lists the sections, so every row has the mark 🔍 unless the row says otherwise.

## Example

You want to remove the memory section.
A mod can hook `prompt.section` with `{ name: "memory" }` and return `{ text: null }`.
See [System Prompt](Claude-Code-System-Prompt) and [Mod API](Claude-Code-Mod-API).

## Shared Sections

These come first.
Claude Code uses either the short row or the full rows.

| Section | Mark | When | Content |
| --- | --- | --- | --- |
| `lean_body` | 🔍 | Short prompt | A list of harness rules: markdown output, permission modes, hooks as user feedback, and dedicated tools first. |
| `intro` | 🔍 | Full prompt | Who the agent is and whom it works for. |
| `system` | 🔍 | Full prompt | Output is shown to the user, tool results can hold prompt injection, and old messages get compressed. |
| `doing_tasks` | 🔍 | Full prompt, and the output style is none or has `keep-coding-instructions: true` | Do only what the task needs, add no extra features, and write few comments. |
| `actions` | 🔍 | Full prompt | Confirm actions that are hard to undo. |
| `tools` | 🔍 | Full prompt | Use dedicated tools before `Bash`, and call independent tools in parallel. |
| `tone` | 🔍 | Full prompt | No emojis, short answers, and `file_path:line_number` references. |
| `memory_static` | 🔍 | Only with `--exclude-dynamic-system-prompt-sections` | The memory text, moved to the shared part. |

## Session Sections

They follow in this order.
A section that has no text is left out.

| Section | Mark | When | Content |
| --- | --- | --- | --- |
| `communication` | 🔍 | Always | How to write for the user, with text that depends on the model. |
| `pronouns` | 🔍 | Always | Use `they/them` when pronouns are not stated. |
| `action_caution` | 🔍 | Short prompt | Confirm actions that reach outside the session or are hard to undo. |
| `task_continuity` | ❌ | Never in `2.1.303` | The condition is always false. |
| `fable_identity` | 🔍 | A Fable model, or the model in `ANTHROPIC_DEFAULT_FABLE_MODEL` | A paragraph about Fable 5.1 or Fable 5 and Mythos. |
| `tool_param_json` | 🧪 | An experiment, or a tool strictness setting | One sentence: object and array values are one JSON value. |
| `session_guidance` | 🔍 | When any of its items applies | The `! <command>` tip, the `Agent` tool and forks, skills by `/name`, and `ultrareview`. |
| `memory` | 🔍 | Not with `--exclude-dynamic-system-prompt-sections` | Instructions for auto memory (see [Memory and Rules](Claude-Code-Memory-And-Rules)). |
| `surface:<kind>`, `system_messages` | 🧪 | An experiment form of the prompt | Where Claude Code runs, such as `desktop`, `vscode`, `web`, or `terminal`. |
| `env_info_simple` | 🔍 | Normally | The latest model IDs, where Claude Code runs, and a note about `/fast`. |
| `env_info_static` | 🔍 | With `--exclude-dynamic-system-prompt-sections` | The same text, without data of the machine. |
| `bg-session` | 🧪 | `CLAUDE_CODE_SESSION_KIND=bg` and `CLAUDE_JOB_DIR` set | Rules for background jobs: use `$CLAUDE_JOB_DIR/tmp`, use `EnterWorktree`, and end with a report. |
| `context_management` | 🔍 | Always | Old context gets summarized, so do not wrap up early. |
| `brief` | 🔍 | `--brief`, or the `SendUserMessage` tool | Rules for that tool. |
| `focus_mode` | 🔍 | The view mode is focus | The user sees only the final message. |
| `act_dont_rederive` | 🧪 | `CLAUDE_CODE_ACT_DONT_REDERIVE`, or an experiment that is on by default | Act when you have enough information. |
| `delivering_work_max` | 🧪 | `CLAUDE_CODE_BISON_CAIRN`, or an experiment for some models | Do the full scope of the work. |
| `overcorrection` | 🧪 | `CLAUDE_CODE_LARCH_CISTERN`, or an experiment | Correct yourself only when it matters. |
| `subagent_steer_delegation` | 🧪 | The `Agent` tool exists and an experiment arm is on | Steers when to delegate. |
| `opus5_reduced_delegation` | 🧪 | Opus 5 prompt bundle, with an experiment that is on by default | Do not use the `Agent` tool, workflows, or deep research unless asked. |
| `heron_brook`, `brook_heron` | 🧪 | An experiment, or Haiku 5.5 early-stopping guidance | Text that the server sets. |
| `willow_tern` | 🧪 | `CLAUDE_CODE_WILLOW_TERN`, or an experiment | Rules for writing to the user. |
| `autonomy_append` | 🧪 | Mythos 5, a Fable 5 mitigation model, or `CLAUDE_CODE_AMBER_ASTROLABE` | Work without asking in the middle of a task. |
| `endconv_deferred_hint` | 🧪 | The `EndConversation` tool exists | A hint for that tool. |
| `total_tokens` | 🧪 | Not with `CLAUDE_CODE_DISABLE_ATTACHMENTS` or `CLAUDE_CODE_SIMPLE`, and the mode comes from `CLAUDE_CODE_TOTAL_TOKENS_REMINDER` | A reminder of the token budget. |
| `user_pays` | 🧪 | An experiment that is off by default | The user pays for each token. |
| `repl_working` | ❌ | Never | The section has no text. |

Experiments come from GrowthBook, a flag service that Anthropic runs.
You cannot set an experiment, but the env vars in the table switch some of the sections.

## See Also

- [System Prompt](Claude-Code-System-Prompt)
- [Env Vars](Claude-Code-Env-Vars)
- [Request Build](Claude-Code-Request-Build)
