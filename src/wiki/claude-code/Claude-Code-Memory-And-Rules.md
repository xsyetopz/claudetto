# Claude Code Memory and Rules

Claude Code remembers your project in two ways.
`CLAUDE.md` files hold instructions that you write, and auto memory holds notes that Claude writes.
For example, the line `Use bun, not npm` in `CLAUDE.md` is read in every session.
Rules in `.claude/rules/` split instructions by topic and by file path.
Claude treats these files as context, not as enforced configuration.
Content arrives as a user message after the system prompt.
For the system prompt see [System Prompt](Claude-Code-System-Prompt).

## Legend of Marks

✅ documented, 🔍 undocumented (found in the bundle), ⚠️ the docs differ from the bundle, 🧪 behind a flag or gate, ❌ removed or inert.

## Instruction File Locations

The order is the load order, broad scope first.
A later file sits later in the context.

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | Managed `CLAUDE.md` | Organization instructions | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS), `/etc/claude-code/CLAUDE.md` (Linux and WSL), `C:\Program Files\ClaudeCode\CLAUDE.md` (Windows). Cannot be excluded | Machine | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | `claudeMd` setting | Managed `CLAUDE.md` text inside managed settings | Same precedence as the managed file. Honored only from managed settings | `managed-settings.json` | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory), bundle |
| ✅ | `~/.claude/CLAUDE.md` | Personal instructions | Loads for all projects. Imports in it need no approval dialog | User | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | `~/.claude/rules/*.md` | Personal rules | Load before project rules. No override between the two sets | User | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Project instructions | Files in the working directory and each directory above it load at launch | Project | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | `./CLAUDE.local.md` | Private project notes | Appended after `CLAUDE.md` in the same directory. Add it to `.gitignore` | Project | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | Subdirectory `CLAUDE.md` | Lazy instructions | Loads once after Claude reads, writes, or edits a file in that subdirectory | Project | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | `AGENTS.md`, `.claude/AGENTS.md` | Read when no `CLAUDE.md` or `CLAUDE.local.md` is in or above the working directory | Needs `2.1.277`. `AGENTS.local.md`, `AGENTS.override.md`, and `.agents/` are not read | Project | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | `.claude/rules/**/*.md` | Project rules | Found recursively. Rules without `paths` load at launch with the priority of `.claude/CLAUDE.md` | Project | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | `--add-dir` directories | Extra directories | Memory files load only when `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`. Loads `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/rules/*.md`, `CLAUDE.local.md` | CLI | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory), [Environment Variables](https://code.claude.com/docs/en/env-vars) |

## Imports and Rule Files

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `@path/to/file` | Imports a file at launch | Relative paths resolve from the importing file. Maximum depth is four hops. Put a backslash before each space in the path. Quoted paths do not import. Code spans and fenced blocks are skipped | Any memory file | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | External import | An import that resolves outside the working directory | A dialog asks once per project. If declined, they stay off. User-scope files skip the dialog | Project files | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | `paths` frontmatter in a rule | Scopes a rule to files | YAML list or comma string of globs. Loads when `Read`, `Write`, or `Edit` (or a Bash read like `cat`) touches a match. Brace expansion budget: 1,000 patterns and 4 MiB per rule | `.claude/rules/*.md` | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | Other rule frontmatter keys | Ignored | `paths` is the only key read. Bad YAML loads the rule without `paths` | `.claude/rules/*.md` | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | HTML block comments | Stripped before injection | Comments in code blocks stay | Any `CLAUDE.md` | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | Symlinks in `.claude/rules/` | Share rules across projects | A target outside the working directory counts as an external import. Network paths do not load | `.claude/rules/` | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | `claudeMdExcludes` | Skips files by glob | Absolute paths with `picomatch`. Arrays merge across scopes. User, project, and local files only | Any settings scope | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory), schema |
| ✅ | **Project instructions** (`/config`) | Chooses `claude-md-or-agents-md` (default), `claude-md-and-agents-md`, `claude-md`, or `managed-only` | Stored in `pluginConfigs["cc-plugin-agents-md@builtin"].options.instructionFiles`. Read from user, `--settings`, and managed settings. `agents-md@builtin` also works from `2.1.285` | User, managed | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | `includeGitInstructions` | Removes built-in commit and PR instructions | Default `true`. Env `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` wins | Settings | schema, [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `CLAUDE_CODE_DISABLE_CLAUDE_MDS` | No `CLAUDE.md` files in context | `1` disables user, project, and auto memory files | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |

## Auto Memory

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `autoMemoryEnabled` | Turns auto memory on or off | Default on in local sessions. `/memory` toggle writes it to user settings | Any settings scope | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory), schema |
| ✅ | `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | Env switch | `1` disables. `0` forces on even with `--bare` or `autoMemoryEnabled: false` | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| ✅ | `autoMemoryDirectory` | Memory location | Absolute path or `~/`. Default `~/.claude/projects/<project>/memory/`. Ignored in checked-in project settings in the schema text. The docs say project scope works after trust | Settings | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory), schema |
| ⚠️ | `autoMemoryDirectory` scope | The schema says project settings are ignored. [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) says project and local scopes work under workspace trust | Docs and schema text differ | Settings | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory), schema |
| ✅ | `MEMORY.md` | Index file | The first 200 lines or 25KB load at each session start. Topic files load on demand | Memory directory | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | Memory types | `user`, `feedback`, `project`, `reference` in the `type` frontmatter | Claude writes a `modified` ISO 8601 field (since `2.1.214`) | Memory files | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | `/memory` | Lists memory files, toggles auto memory, opens the folder | Editor opens a file | Interactive | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| 🔍 | `autoDreamEnabled` | Background memory consolidation (auto-dream) | Overrides the server default | Settings | schema |
| 🔍 | `/pause-memory` | Pauses memory for the session | Only the user can turn it back on. Text `memory access blocked by /pause-memory` | Interactive | bundle |
| 🔍 | `CLAUDE_CODE_REMOTE_MEMORY_DIR`, `CLAUDE_CODE_POST_TURN_MEMORY`, `CLAUDE_COWORK_MEMORY_*`, `CLAUDE_MEMORY_STORES` | Cloud, Cowork, and post-turn memory | Use not verified | Env | env names in the bundle |
| ✅ | Subagent `memory` field | A separate memory directory for a subagent | See [Subagents](Claude-Code-Subagents) | Agent frontmatter | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |

## Limits

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `CLAUDE.md` size | Files over 4 MiB are skipped | A warning shows for files over 200 lines, and for a combined size | Instruction files | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |
| ✅ | `MEMORY.md` size | 200 lines or 25KB | A write over the limit succeeds but returns an error that asks for a rewrite | Memory | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory), bundle |
| ✅ | Compaction | Project-root `CLAUDE.md` is re-read after `/compact` | Nested files and `paths` rules load again on demand. `InstructionsLoaded` shows `load_reason` `compact` | Context | [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory) |

## The `InstructionsLoaded` Hook

The hook fires when an instruction file enters context.
It is async and has no decision control.
It does not fire for an `AGENTS.md` read through the Project instructions setting.
The matcher runs on `load_reason`.

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `file_path` | Absolute path of the file | String | Hook input | [Hooks Reference](https://code.claude.com/docs/en/hooks), d.ts |
| ✅ | `memory_type` | Scope | `User`, `Project`, `Local`, `Managed` | Hook input | [Hooks Reference](https://code.claude.com/docs/en/hooks), d.ts |
| ✅ | `load_reason` | Why it loaded | `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact` | Hook input | [Hooks Reference](https://code.claude.com/docs/en/hooks), d.ts |
| ✅ | `globs`, `trigger_file_path`, `parent_file_path` | Extra context | `globs` only for `path_glob_match`. `parent_file_path` for `include` | Hook input | [Hooks Reference](https://code.claude.com/docs/en/hooks), d.ts |
| 🔍 | `InstructionFileKind` | Tiers `managed`, `user`, `project`, `local`, `memory` | Used by the Mod API | Mod API | d.ts |

See [Hooks](Claude-Code-Hooks) for common fields.

## Not Yet Checked

- Not verified: the combined-size warning limit for instruction files.
- Not verified: the use of the cloud and Cowork memory env vars.

## See Also

- [How Claude Remembers Your Project](https://code.claude.com/docs/en/memory)
- [Explore the .claude Directory](https://code.claude.com/docs/en/claude-directory)
- [Subagents](Claude-Code-Subagents)
- [Hooks](Claude-Code-Hooks)
- [System Prompt](Claude-Code-System-Prompt)
