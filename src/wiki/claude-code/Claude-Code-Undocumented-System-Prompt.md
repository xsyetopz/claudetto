# Claude Code Undocumented System Prompt

The system prompt is the text that tells Claude how to work.
Some parts of how Claude Code builds it are not in the official docs.
Of its 41 rows, 26 are found only in the program, 1 differs from the docs, and 14 work only behind a flag or a gate.
Anthropic can change or remove each item in any release.

## Found Only in the Program

26 items are in the program but not in the official docs.
These are the most useful ones.

- `DISABLE_PROMPT_CACHING_MYTHOS`: Turns caching off for the Mythos models. See [Request Build](Claude-Code-Request-Build).
- `memory_static`: Only with `--exclude-dynamic-system-prompt-sections`. See [System Prompt Sections](Claude-Code-System-Prompt-Sections).
- `memory`: Not with `--exclude-dynamic-system-prompt-sections`. See [System Prompt Sections](Claude-Code-System-Prompt-Sections).
- `brief`: `--brief`, or the `SendUserMessage` tool. See [System Prompt Sections](Claude-Code-System-Prompt-Sections).
- `env_info_static`: With `--exclude-dynamic-system-prompt-sections`. See [System Prompt Sections](Claude-Code-System-Prompt-Sections).
- `doing_tasks`: Full prompt, and the output style is none or has `keep-coding-instructions: true`. See [System Prompt Sections](Claude-Code-System-Prompt-Sections).
- `fable_identity`: A Fable model, or the model in `ANTHROPIC_DEFAULT_FABLE_MODEL`. See [System Prompt Sections](Claude-Code-System-Prompt-Sections).
- `safeguards`: A list of safety checks, such as `dangerous_tool_use`, with the context that the check needs. See [Request Build](Claude-Code-Request-Build).
- `system[1]` (identity line): `ephemeral`, `ttl: 1h`, `scope: global`. See [Request Build](Claude-Code-Request-Build).

## Where the Docs Differ

1 items work in a different way from what the docs say.
This is the whole list.

- `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`: `1` chooses the short prompt, and `0` chooses the full prompt. See [System Prompt](Claude-Code-System-Prompt).

## Behind a Flag or a Gate

14 items work only when a flag or a gate is on.
These are some of them.

- `bg-session`: `CLAUDE_CODE_SESSION_KIND=bg` and `CLAUDE_JOB_DIR` set. See [System Prompt Sections](Claude-Code-System-Prompt-Sections).
- `autonomy_append`: Mythos 5, a Fable 5 mitigation model, or `CLAUDE_CODE_AMBER_ASTROLABE`. See [System Prompt Sections](Claude-Code-System-Prompt-Sections).
- `overcorrection`: `CLAUDE_CODE_LARCH_CISTERN`, or an experiment. See [System Prompt Sections](Claude-Code-System-Prompt-Sections).
- `user_pays`: An experiment that is off by default. See [System Prompt Sections](Claude-Code-System-Prompt-Sections).
- `subagent_steer_delegation`: The `Agent` tool exists and an experiment arm is on. See [System Prompt Sections](Claude-Code-System-Prompt-Sections).
- `total_tokens`: Not with `CLAUDE_CODE_DISABLE_ATTACHMENTS` or `CLAUDE_CODE_SIMPLE`, and the mode comes from `CLAUDE_CODE_TOTAL_TOKENS_REMINDER`. See [System Prompt Sections](Claude-Code-System-Prompt-Sections).

## Full Lists

Each page below has the full rows, with the value and the effect.

| Page | Rows |
| --- | --- |
| [Request Build](Claude-Code-Request-Build) | 7 |
| [System Prompt](Claude-Code-System-Prompt) | 1 |
| [System Prompt Sections](Claude-Code-System-Prompt-Sections) | 33 |

## See Also

- [Undocumented](Claude-Code-Undocumented)
- [Claude Code](Claude-Code)
- [Probes](Claude-Code-Probes)
