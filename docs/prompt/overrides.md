# Overriding Claude Code's Own Prompt Text

Read on 2026-10-27 from the Claude Code docs for `2.1.311` with `cc-docs read`. Every line names the route it came from. A line of `not given` means the docs do not say.

All sizes are characters, as the pages count them. The baseline is the page `prompts/default-lean`, which the task did not list, so it was not read. Its numbers below are worked out from the pages that were read. Each such number says so.

## Does a Custom Agent or Style Replace or Add

A main-thread custom agent replaces the body. A custom output style adds to it.

### Main-Thread Custom Agent

Route `prompts/agent-main`, switch `claude --agent <name>` with a file in `.claude/agents/`.

- The page says: "The agent file body replaces the body (`system[2]`), like `--system-prompt`."
- The page says: "The attribution reminder and the environment message are still sent."
- `system[2]` is `58` characters. The default body is `5,627` characters (`prompts/disable-builtin-agents` and `prompts/disable-explore-plan` both list `system[2]` as `5,627` with the default body untouched).
- Size change against `prompts/default-lean`: `-5,499` characters. Lines removed: `53`. Lines added: `2`.
- The diff removes the whole default body: the security notice, `# Harness`, `# Session-specific guidance`, `# Memory`, `# Environment`, and `# Context management`.
- The tool list is the same as the baseline (`12` tools sent).
- One line is added to the agent list in `messages[1]`, for the custom agent. `messages[1].content[0]` is `9,126` against `9,056` on `prompts/system-prompt`.

### Custom Output Style

Route `prompts/style-custom`, switch a Markdown file in `~/.claude/output-styles/` or `.claude/output-styles/`, then `/output-style`.

- The page says: "Your file body is put under `# Output Style: <name>` in the environment message. The front matter is not sent."
- The page says: "The first line of the body changes, as with the built-in styles."
- The first line `You are an agent working with the user toward their goals, using your own judgment along the way.` becomes `You are an interactive agent that helps users according to your "Output Style", which describes how you should respond to user queries.`
- The rest of the default body stays. The diff shows `1` line removed and `6` lines added.
- Size change against `prompts/default-lean`: `+218` characters.
- Where the characters go: `system[2]` is `5,665` (`+38` over `5,627`, worked out). `messages[1].content[0]` is `9,236` (`+180` over `9,056`, worked out).

### Built-in `Concise` Style

Route `prompts/style-concise`, switch `/output-style Concise` or `"outputStyle": "Concise"` in `settings.json`.

- Same change in the first line of `system[2]`, then `# Output Style: Concise` and `# Concise Style Active` added after the model line.
- Size change against `prompts/default-lean`: `+1,540` characters. Lines added: `18`. Lines removed: `1`.
- `messages[1].content[0]` is `10,558`. `system[2]` is `5,665`.

### `keep-coding-instructions`

- Route `prompts/style-custom-keep` says: "With `keep-coding-instructions: true`, the `Doing tasks` section stays. Compare with the previous page, where it is removed."
- Route `prompts/style-custom-keep` is measured on the full prompt, where `system[2]` is `26,842` and system blocks are `26,982`. The size of the `Doing tasks` section: not given.
- Route `prompts/style-custom-keep-lean` says: "On the lean prompt the key changes nothing." The diff against `prompts/style-custom` reads "There are no differences in the text."

## Each Override, with Its Switch and Its Size

System Characters is the row `System blocks only` on the page. The baseline for the lean prompt is `5,767` system characters (`78 + 62 + 5,627`, worked out from `prompts/disable-explore-plan`).

The change column names the baseline the page names. Rows for subagents use a subagent baseline, not the main prompt.

| Lever | Route | Switch | Replaces or Adds | System Characters | Change against the baseline the page names |
| --- | --- | --- | --- | --- | --- |
| Replace the system prompt | `prompts/system-prompt` | `--system-prompt` or `--system-prompt-file` | Replaces the body | `166` | `-5,601` against `prompts/default-lean` |
| Append to the system prompt | `prompts/append-system-prompt` | `--append-system-prompt`, or `--append-system-prompt-file` in `-p` | Adds at the end of the body | `5,824` | `+57` against `prompts/default-lean` |
| Replace and append together | `prompts/system-prompt-append` | `--system-prompt` with `--append-system-prompt` | Replaces, then adds | `223` | `+57` against `prompts/system-prompt` |
| Main-thread custom agent | `prompts/agent-main` | `--agent <name>` with `.claude/agents/<name>.md` | Replaces the body | `198` | `-5,499` against `prompts/default-lean` |
| Custom output style | `prompts/style-custom` | file in `.claude/output-styles/`, then `/output-style` | Adds, and swaps the first line | `5,805` | `+218` against `prompts/default-lean` |
| Built-in `Concise` style | `prompts/style-concise` | `/output-style Concise` or `"outputStyle": "Concise"` | Adds, and swaps the first line | `5,805` | `+1,540` against `prompts/default-lean` |
| Style with `keep-coding-instructions` on the lean prompt | `prompts/style-custom-keep-lean` | `keep-coding-instructions: true` in the style front matter | No effect | `5,805` | `0` against `prompts/style-custom` |
| Style with `keep-coding-instructions` on the full prompt | `prompts/style-custom-keep` | `keep-coding-instructions: true` in the style front matter | Keeps `Doing tasks` | `26,982` | not given |
| Turn off all built-in agents | `prompts/disable-builtin-agents` | `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` in print mode | Turns off | `5,767` | `-1,638` against `prompts/default-lean` |
| Turn off `Explore` and `Plan` | `prompts/disable-explore-plan` | `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` | Turns off | `5,767` | `-905` against `prompts/default-lean` |
| Replace `Explore` with a file | `prompts/override-agent-file` | `.claude/agents/Explore.md` with `name: Explore` | Replaces the subagent prompt | `1,518` | `-1,893` against `prompts/subagent-explore` |
| Replace `general-purpose` with a flag | `prompts/override-agents-flag` | `--agents '{"general-purpose":{...}}'` | Replaces the subagent prompt | `1,499` | `-1,382` against `prompts/subagent-general-purpose` |
| Append to every subagent | `prompts/override-append-subagent` | `--append-subagent-system-prompt` or `--append-subagent-system-prompt-file`, with `-p` only | Adds at the end of the subagent body | `3,452` | `+28` against `prompts/subagent-explore` |

Notes from the pages:

- `prompts/system-prompt` says: "The tool list is not changed." and "The attribution reminder and the environment message (agent types, skills, date) are still sent."
- `prompts/append-system-prompt` says the identity line also changes. In `-p` mode with an appended prompt it reads `You are Claude Code, Anthropic's official CLI for Claude, running within the Claude Agent SDK.` Line `system[1]` goes from `62` to `94` characters, so `32` of the `+57` is that line (worked out).
- `prompts/system-prompt` and `prompts/agent-main` both keep `messages[1]` (the environment message). The `-5,601` and `-5,499` changes are the body.
- `prompts/override-agent-file`: the file set no `tools`, so the agent is not held to the read-only list. The page shows `8` tools against `5`.
- `prompts/override-agent-file` and `prompts/override-agents-flag`: agent sources merge by name, and the later one wins. The order is built-in, plugin, user (`~/.claude/agents`), project (`.claude/agents`), `--agents`, managed settings.
- `prompts/override-append-subagent`: the flag is hidden from `--help`, works only with `-p`, and reaches subagents of subagents.
- `prompts/override`: `--system-prompt` and `--append-system-prompt` do not reach built-in subagents.

## Turning Off the Built-in Agents

### All Built-in Agents

Route `prompts/disable-builtin-agents`.

- Switch: `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1`, in print mode.
- The page says: "In print mode, the whole `Available agent types` list is gone. The `Agent` tool stays but its text changes."
- Removed from `messages[1]`: the `Available agent types for the Agent tool:` list (`claude`, `Explore`, `general-purpose`, `Plan`, `statusline-setup`) and the sentence about launching multiple agents in one message.
- Size change: `-1,638` characters. Lines removed: `9`. Lines added: `0`.
- `system[2]` stays `5,627`. `messages[1].content[0]` goes from `9,056` to `7,418`.
- The page says the `Agent` tool text or schema changes. By how many characters: not given. The page points to `prompts/tools-per-variant`, which was not in the list to read.

### `Explore` and `Plan` Only

Route `prompts/disable-explore-plan`.

- Switch: `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1`, set before Claude Code starts.
- The page says: "The `Explore` and `Plan` lines leave the agent list that the model reads. The other agents stay."
- Size change: `-905` characters. Lines removed: `2`. Lines added: `0`.
- `messages[1].content[0]` goes from `9,056` to `8,151`.
- The page says: "The tool list is the same as the baseline." So the `Agent` tool text is not changed by this switch.
- `prompts/override` says this switch "removes both from the agent list" and names no mode limit.

### The `Agent` Tool Text

- The project measured the `Agent` tool at `4,850` characters in `docs/surfaces.md`. That number is the project's own reading, not a docs number.
- No page read here gives a size for the `Agent` tool text, with or without the agent list. Not given.
- `prompts/built-in-agents` lists five default agents in `-p`: `claude`, `Explore`, `general-purpose`, `Plan`, `statusline-setup`. It says the interactive screen also lists `claude-code-guide`. The size of that extra line: not given.

## What This Means for `main.md` and `Concise.md`

Facts about the files, from `wc -mc` in `plugins/claudetto`: `agents/main.md` is `10865` and `output-styles/Concise.md` is `2407`. The task gave `main.md` as `10,865` bytes. The `wc` run printed one number for both counts, so a character count apart from bytes: not given.

- `main.md` used with `--agent` replaces the default body of `5,627` characters (`prompts/agent-main`). It does not sit on top of it.
- So the cost of `main.md` is its body size minus `5,627`, not its body size. If the whole file were sent, that is `10,865 - 5,627 = 5,238`, worked out.
- The front matter of an agent file is not sent, measured in this repository on 2026-10-28 and no longer open: a file of `5,519` characters with `74` of front matter arrived as a `system[2]` of `5,443`, which is its body with the ends trimmed, to the character (`docs/prompt/footprint.md`, task 3.1). For a style, `prompts/style-custom` says the same.
- An agent file also costs characters in `messages` while it merely exists in the plugin, because the harness names each custom agent in the agent listing of the first message with its description and its tools. That is measured too, on the same two runs: `78` for `main` alone, whose `agent.offer` the plugin refuses, and `492` for `Artemis.md` and `Athena.md` together, read on 2026-10-29 as 30,462 with both files present against 29,970 with both moved aside. The same pair reads `480` on 2026-10-30: 29,970 held and the arm with both files fell 12, which `docs/prompt/footprint.md` prices against the `tools` array.
- Removing the default body is a gain of `5,499` only when the agent body is near `58` characters, as in the probe. With a larger body the gain shrinks by the difference.
- The default body holds the memory section, the security notice, and `# Context management`. An agent body replaces all of them, so `main.md` has to carry any of that text it still wants. What the model does without them: not given.
- `Concise.md` adds to the default body. The built-in `Concise` style costs `+1,540` (`prompts/style-concise`). A custom style costs `+218` for a one-line body (`prompts/style-custom`).
- `Concise.md` at `2407` is a custom style, so by the same rule its body goes into `messages[1]` and its front matter does not. The exact cost of `Concise.md`: not given, because no page measured a body of that size.
- A style never removes the body on the lean prompt. The first line is swapped, which is `+38` in `system[2]` (worked out from `5,665` and `5,627`).
- `keep-coding-instructions` in `Concise.md`: the lean prompt ignores the key (`prompts/style-custom-keep-lean`). So the key has no size effect on the lean prompt.
- Using `--agent` with an output style together: not given. Neither page combines them.
- `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` saves `905` in `messages[1]` and leaves the tool list alone (`prompts/disable-explore-plan`).
- `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` saves `1,638` in `messages[1]` and changes the `Agent` tool text, by an amount not given (`prompts/disable-builtin-agents`). It applies in print mode.
- The largest cut on a page is `--system-prompt` at `-5,601`, then `--agent` at `-5,499`. Both leave the tool list, the environment message, and the attribution reminder as they were.

## The Test the Body Is Cut By

The user set the rule on 2026-10-27: "does it help coding? no? then it gets dropped without hesitation". And, on the same day, about the pronouns paragraph: "the same way the system prompt having pronouns is completely unnecessary as it has nothing to do with software development/coding whatsoever. that's what we mean by *coding agent*".

This is what makes the body replacement worth doing. The body is the one part of the prompt the project can rewrite line by line, so the rule applies to it directly.

Four passages of the default body fail that test. Their text is in the baseline of the diff on `prompts/simple-env`, and the counts below were taken with `python3` over that text on 2026-10-27:

| Passage | Characters |
| --- | --- |
| The pronouns paragraph, from "When you use a pronoun for someone" to "including visible thinking." | 357 |
| "Claude Code is available as a CLI in the terminal, desktop app (Mac/Windows), web app (claude.ai/code), and IDE extensions (VS Code, JetBrains)." | 147 |
| The `/fast` mode sentence | 138 |
| The `# Context management` paragraph | 259 |

They sum to `901` characters, which is 16.0 percent of the `5,627`-character body.

Two notes on that figure. The surfaces sentence and the `/fast` sentence describe surfaces this project turns off, so they are wrong for a claudetto session and not merely unused. The `# Context management` paragraph is different in kind: the project replaces that behaviour with its own handoff, so the text is not useless, it is superseded, and `main.md` states the project's own rule in its place.

The remaining `4,726` characters of the body are not automatically kept. Each one faces the same test when `main.md` is rewritten.

## Not Given by the Docs

- The total size of `prompts/default-lean`. The pages read only give the diff against it.
- The size of the `Agent` tool text, and by how much `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` changes it (`prompts/disable-builtin-agents`).
- The size of the `Doing tasks` section, and any diff for the full prompt (`prompts/style-custom-keep`).
- Whether the front matter of an agent file counts toward `system[2]` (`prompts/agent-main`).
- What happens when `--agent` and an output style are used together.
- How the model behaves once the default body is gone. The pages show text only.
- The size effect of a style body as large as `Concise.md`.
- Whether `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` works outside print mode. The page says print mode, and nothing about other modes.
- The pages say `--append-system-prompt-file` works in `-p` mode (`prompts/append-system-prompt`). Whether it works in interactive mode: not given.
