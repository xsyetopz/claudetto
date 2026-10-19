# Claude Code Output Styles

An output style changes the role, tone, and format of the answers of Claude in a session.
You pick one with `/output-style`, and it applies from the next message.
For example, the `Concise` style makes Claude lead with the result and skip the recap.
An output style is an instruction, so nothing enforces it.
For project facts use [Memory and Rules](Claude-Code-Memory-And-Rules).
For guaranteed actions use [Hooks](Claude-Code-Hooks).

## Legend of Marks

✅ documented, 🔍 undocumented (found in the bundle), ⚠️ the docs differ from the bundle, 🧪 behind a flag or gate, ❌ removed or inert.

## Built-In Styles

Each non-default style keeps the standard coding instructions and adds its own.
The bundle sets `keepCodingInstructions: true` and `source: "built-in"` for the four styles.

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `default` | No style instructions | The standard system prompt for software engineering. It shows in the `/output-style` list | All sessions | [Output Styles](https://code.claude.com/docs/en/output-styles) |
| ✅ | `Proactive` | Starts work at once and assumes on routine choices | No plan mode unless asked. It checks in the chat before it deletes data or changes shared systems. It does not change the permission mode | All sessions | [Output Styles](https://code.claude.com/docs/en/output-styles), bundle |
| ✅ | `Concise` | Leads with the result, no preamble, narration, or recap | Simple answers take one to three sentences. Full length stays for requested detail and safety content. Needs `2.1.237`. The bundle gives it a `turnReminder` | All sessions | [Output Styles](https://code.claude.com/docs/en/output-styles), bundle |
| ✅ | `Explanatory` | Adds `Insight` blocks | Two or three points per block, not written into files | All sessions | [Output Styles](https://code.claude.com/docs/en/output-styles), bundle |
| ✅ | `Learning` | `Insight` blocks plus `TODO(human)` tasks | Claude asks you to write 2 to 10 lines when it generates 20 or more lines with a design choice. It then stops and waits | All sessions | [Output Styles](https://code.claude.com/docs/en/output-styles), bundle |

## The `outputStyle` Setting and Switching

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `outputStyle` | Names the active style | The value is case-sensitive: `Explanatory` works and `explanatory` gives Default. No value means Default. A project file wins over user settings | Any settings scope | [Output Styles](https://code.claude.com/docs/en/output-styles), schema |
| ✅ | `/output-style <style>` | Switches the style | Saves to `.claude/settings.local.json`. No argument lists the styles. Ignores case. Works in print mode and the SDK. Needs `2.1.269` for remote lists | Interactive, print | [Output Styles](https://code.claude.com/docs/en/output-styles) |
| ✅ | `/config` Output style | Menu picker | Saves to local settings | Terminal | [Output Styles](https://code.claude.com/docs/en/output-styles) |
| ✅ | Switch in a session | New style applies from the next message | Before `2.1.251` it needed `/clear`. Prompt caching costs the first message | All sessions | [Output Styles](https://code.claude.com/docs/en/output-styles) |
| 🔍 | Custom style over Remote Control | Not selectable | The bundle text says to pick one in the session itself | Remote Control | bundle |
| ✅ | `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` | Chooses the full or short system prompt | `0` selects the full prompt. `keep-coding-instructions` has no effect on the short prompt | Env | [Output Styles](https://code.claude.com/docs/en/output-styles) |
| ✅ | Safe mode | Styles do not load | `CLAUDE_CODE_SAFE_MODE=1` skips output styles | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |

## Locations and Precedence

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `~/.claude/output-styles/*.md` | User styles | The file name is the style name unless `name` is set | User | [Output Styles](https://code.claude.com/docs/en/output-styles) |
| ✅ | `.claude/output-styles/*.md` | Project styles | Every such directory between the working directory and the repository root loads. The closest one wins for a name | Project | [Output Styles](https://code.claude.com/docs/en/output-styles) |
| ✅ | Managed `.claude/output-styles` | Policy styles | Inside the managed settings directory | Managed | [Output Styles](https://code.claude.com/docs/en/output-styles) |
| ✅ | Plugin `output-styles/` | Plugin styles | See [Plugins](Claude-Code-Plugins) | Plugin | [Output Styles](https://code.claude.com/docs/en/output-styles) |
| 🔍 | `outputStylesPath`, `outputStylesPaths` | Manifest key for style files or directories | When set, the `output-styles/` directory is not auto-loaded | Plugin manifest | bundle |
| 🔍 | Merge order | For the same name the later source wins | The order in the bundle is built-in, one more list (inferred: plugin styles), user, project, then policy | All | bundle |
| ✅ | File reading | Styles load when Claude Code starts | A new file needs a restart in the terminal | Terminal | [Output Styles](https://code.claude.com/docs/en/output-styles) |

## Frontmatter Keys

All keys are optional.
A misspelled key is ignored.
Bad YAML loads the style under its file name with no fields.

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `name` | Style name in the picker | Default is the file name | Style file | [Output Styles](https://code.claude.com/docs/en/output-styles) |
| ✅ | `description` | Text in the picker | String | Style file | [Output Styles](https://code.claude.com/docs/en/output-styles) |
| ✅ | `keep-coding-instructions` | Keeps the built-in software engineering section | Default `false`. Works only on the full system prompt | Style file | [Output Styles](https://code.claude.com/docs/en/output-styles), bundle |
| ✅ | `force-for-plugin` | Applies the style when the plugin is enabled | Overrides `outputStyle`. The first loaded plugin wins and a warning names the others. On a non-plugin style the key is ignored with a warning | Plugin styles | [Output Styles](https://code.claude.com/docs/en/output-styles), bundle |

## How Styles Reach the Model

- The active style text goes with every request.
  Source: [Output Styles](https://code.claude.com/docs/en/output-styles).
- A style applies to the main thread and to a fork.
  Other subagents use their own system prompt.
  Source: [Output Styles](https://code.claude.com/docs/en/output-styles).
- The style name is in the status line field `output_style.name`.
  See [Status Line](Claude-Code-Status-Line).
- The SDK init can report `outputStyle` as `null` or `{ name, isKeepingCodingInstructions }`.
  Source: bundle string `no { outputStyle } (null, or { name, isKeepingCodingInstructions })`.

## Not Yet Checked

- Not verified: the full text of each built-in style prompt.
  The bundle holds it as `prompt` fields.
- Not verified: how `force-for-plugin` ranks against a managed `outputStyle`.

## See Also

- [Output Styles](https://code.claude.com/docs/en/output-styles)
- [Memory and Rules](Claude-Code-Memory-And-Rules)
- [Hooks](Claude-Code-Hooks)
- [Status Line](Claude-Code-Status-Line)
- [Plugins](Claude-Code-Plugins)
