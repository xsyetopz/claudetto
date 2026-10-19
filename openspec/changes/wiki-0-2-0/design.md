# Design: wiki-0-2-0

## W1. Layout

- `src/wiki/Home.md` links to the two parts. `_Sidebar.md` has one group for each part.
- Part 1: `src/wiki/claudetto/` (start, slices, add-ons, reference, rationale, evidence, development).
- Part 2: `src/wiki/claude-code/`. Each page name starts with `Claude-Code-`, because the GitHub wiki finds a page by its file name only, and names must be unique.
- Drafts of part 2 are written to `.claudetto/wiki/claude-code/` (ignored by git) first, so that `just generate` in other work does not see half pages.

## W2. Pages of Part 2

| Page | Content |
| --- | --- |
| `Claude-Code` | Index, legend, version, sources, how to read |
| `Claude-Code-Architecture` | Process, modules, startup sequence |
| `Claude-Code-Turn-Pipeline` | Input, hooks, request, stream, tool loop, stop |
| `Claude-Code-Request-Build` | System prompt parts, messages, tools, betas, headers, cache breakpoints |
| `Claude-Code-System-Prompt` | Each section and its condition |
| `Claude-Code-Models-And-API` | Model table, effort, thinking, endpoints, retries, limits |
| `Claude-Code-Context-And-Compaction` | Window, auto compaction, micro compaction, attachments |
| `Claude-Code-Sessions-And-Storage` | Transcripts, `~/.claude` layout, resume, fork |
| `Claude-Code-CLI` | Flags, subcommands, print mode, `stream-json` |
| `Claude-Code-Settings` | Each key, scopes, precedence (split by area) |
| `Claude-Code-Env-Vars` | Each env var |
| `Claude-Code-Permissions-And-Sandbox` | Rules, modes, auto mode, sandbox |
| `Claude-Code-Hooks` | Each event, input, output, exit codes |
| `Claude-Code-Memory-And-Rules` | `CLAUDE.md`, rules, imports |
| `Claude-Code-Output-Styles`, `Claude-Code-Status-Line` | Each field |
| `Claude-Code-Tools` | Each built-in tool, schema, deferral |
| `Claude-Code-Subagents` | Agents, forks, teams, spawn depth |
| `Claude-Code-Skills-And-Commands` | Skills, built-in slash commands |
| `Claude-Code-Plugins` | Manifest, marketplace, loader, CLI |
| `Claude-Code-Mod-API` | The `$` API of `types-2.1.303.d.ts` (split by namespace) |
| `Claude-Code-MCP` | Config, transports, tools, resources |
| `Claude-Code-Undocumented` | Index of each undocumented surface, with links |

A page over about 150 lines splits into sub-pages, such as `Claude-Code-Settings-Permissions`.

## W3. Style

- STE, semantic line breaks, inline code for each code item, no semicolons (`CLAUDE.md`).
- Headings and citation titles use Chicago-style Title Case, such as `[Hooks Reference](https://code.claude.com/docs/en/hooks)`.
- Headings and code blocks have at most 100 columns (`bun run lint:md`).
- Tables for item lists. Emojis only as marks:
  - ✅ documented, 🔍 undocumented (found in the bundle), ⚠️ the docs differ from the bundle,
    🧪 behind a flag or a gate, ❌ removed or inert in `2.1.303`.
- Each fact gives its source: a docs page (title and URL), or the bundle (a string, a key, or a type name).

## W4. Sources of Part 2

- `external/cc-2.1.303/`: `docs-live/` (all 228 docs pages, which match `2.1.303`, the newest release on 2026-10-19), `docs/`, `strings.txt`, `types-2.1.303.d.ts`, `models-2.1.303.tsv`, `automode-defaults.json`.
- The binary `~/.local/share/claude/versions/2.1.303` (read only, never patch).
- `external/cc-kg/2.1.300/` and `external/cc-diff-301-302/`, `external/cc-diff-302-303/` for what changed.
- The old pages `wiki/claude-code/`, `wiki/reference/Builtins*.md`, `wiki/reference/Settings-Schema.md` as a start, checked again against `2.1.303`.
- No model call, no eval, no sandbox session. `claude --help` and `claude <cmd> --help` are free.
