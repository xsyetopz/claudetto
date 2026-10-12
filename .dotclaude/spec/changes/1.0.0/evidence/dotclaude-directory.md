# P32 The files that dotclaude writes

This report lists each file and folder that code in `src/` writes, in the tree of the commit that starts P32.
It is the first step of P32 (`.dotclaude/`).
The search used `Bun.write`, `writeFile`, `appendFile`, `mkdir`, `mkdtemp`, `rm`, `rename`, `cp`, `tmpdir`, `homedir`, and `CLAUDE_CONFIG_DIR`.
A hook module (`hooks/register.ts`) cannot write a file, because its import graph has no `node:` import and no `Bun`.
The plugins `dotclaude-codegraph`, `dotclaude-browser`, `dotclaude-docs`, `dotclaude-jev`, and `dotclaude-sessions` write no file.
`dotclaude-sessions` only reads `~/.claude/projects/`.

## Columns

- Path now: where the code writes.
- Scope: `project` (a folder of the repository), `user` (the home folder), or `temp` (the system temp folder).
- Tracked: whether git tracks the file.
- New path: the place under `.dotclaude/` (project) or `~/.dotclaude/` (user), with a layout based on `.claude/`.
- Git rule: `.gitignore` when the team shares the rule, `.git/info/exclude` when only the local checkout needs it, `none` when git tracks the file.

## Files that Claude Code reads

Claude Code reads these files from `.claude/`, so they stay there.
dotclaude writes them only as the settings of Claude Code.
The rule of `change.md` is that `.claude/` keeps the files that Claude Code reads.

| Slice | Path now | Scope | Tracked | New path | Git rule |
| - | - | - | - | - | - |
| `setup` | `.claude/settings.json` | project | yes | stays | none |
| `setup` | `.claude/settings.local.json` | project | no | stays | `.git/info/exclude` (P09 has the line `**/.claude/settings.local.json`) |
| `setup` | `~/.claude/settings.json`, or `$CLAUDE_CONFIG_DIR/settings.json` | user | no (outside any repository) | stays | none |

The `setup` slice reads, and does not write, `~/.claude.json`, `<config>/plugins/installed_plugins.json`, and `<config>/cache/model-catalog/`.
The `asks` slice writes no file.
It matches `.claude/settings*.json` and `.claude/hooks/` in the calls of a session, so it keeps the `.claude/` names.

## Files of git

| Slice | Path now | Scope | Tracked | New path | Git rule |
| - | - | - | - | - | - |
| `setup` | `.git/info/exclude` (lines under the header `# dotclaude-runtime`) | project | no (inside `.git/`) | stays | none, this file is the rule store |

P32 adds the lines of the new `.dotclaude/` paths to this file.

## Files in the temp folder that are scratch by design

These files stay in the temp folder.
Nothing reads them in a later session, and the user can delete them at any time.

| Slice | Path now | Scope | Tracked | New path | Git rule | Why it stays |
| - | - | - | - | - | - | - |
| `sandbox` | `<tmp>/dotclaude-sandbox/` (`config/`, `home/`, `project/`, `.claude.json` in `config/`) | temp | no | stays | none | A separate config for `just sandbox`, with `--clean` to remove it. |
| `sandbox` | `<tmp>/sandbox-frontmatter-*` (`mkdtemp`) | temp | no | stays | none | A scratch folder for one front matter check. |
| `capture` | `<tmp>/dotclaude-capture/` (`report-<n>.json`, `error-<n>.txt`, the recount files) | temp | no | stays | none | The output of one proxy run. `--out DIR` changes the place. |

## Files that the user names

| Slice | Path now | Scope | Tracked | New path | Git rule | Why it stays |
| - | - | - | - | - | - | - |
| `schema` | `--out DIR` (the repository passes `schemas`) | project | yes | stays | none | The output of a build, named by the caller. It is a published file, not a runtime file. |

## Decided: the spec store

The user decided that the spec store moves into `.dotclaude/`, and that git tracks it.
The move is done.
dotclaude 1.0.0 reads `.dotclaude/` by itself, with no fallback for the old layout.

| Slice | Path before | Scope | Tracked | New path | Git rule |
| - | - | - | - | - | - |
| `spec` | `spec/changes/<id>/` (`state.json`, `packages/`, `evidence/`, the plan files) | project | yes | `.dotclaude/spec/changes/<id>/` | none |
| `spec` | `spec/specs/` (the specs, the truth) | project | yes | `.dotclaude/spec/specs/` | none |
| `spec` | `spec/.specs-new/` (a scratch copy during `archive`, then renamed to `.dotclaude/spec/specs/`) | project | no, and it exists only during one command | `.dotclaude/spec/.specs-new/` | none |

## Files that dotclaude 1.0.0 starts to write

No code of `src/` writes a file to `.dotclaude/` before P32.
The handoff file of P13 is the first.
P13 starts after P32, so P32 defines its place.

| Slice | Path now | Scope | Tracked | New path | Git rule |
| - | - | - | - | - | - |
| `handoff` (P13) | none yet | project | no | `.dotclaude/handoff/` | `.git/info/exclude`, line `**/.dotclaude/handoff/` |

The handoff belongs to one checkout and one session, so no team shares its rule.
No file of the layout needs a `.gitignore` rule now.
A later file that the team shares as ignored, such as a build cache, gets its line in `.gitignore`.

## Layout

The folder `.dotclaude/` in the project and the folder `~/.dotclaude/` follow the shape of `.claude/`.
A name that `.claude/` uses keeps its meaning, so `settings.json` is shared, and `settings.local.json` is local.
The only entry now is `handoff/`.

## Result

- The code of `src/` writes no file of its own to `.claude/`.
  The move to `.dotclaude/` is therefore a new place for the handoff file, and not a rename of a file that exists.
- The paths go in `src/kernel/paths.ts`, with the Claude Code names that the slices use, so that a slice names no path in a string of its own.
- The spec store moved to `.dotclaude/spec/`.
