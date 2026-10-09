# Move map to the layout of design D17 (task 3.1)

Each line names a current path or file group and its target.
"stays" means that the path does not change.
Paths are relative to the repository root.

## Marketplace and repository

| Current | Target |
| --- | --- |
| `.claude-plugin/marketplace.json` | stays, without the `dotclaude-modder` entry (task 3.7), with the `dotclaude-codegraph` entry (task 17.2) |
| `tests/dotclaude/*.test.mjs` | stays, with the import paths changed |
| `tests/browser/`, `tests/jev/`, `tests/support/` | stays, with the import paths changed |
| (new) | `tests/codegraph/`, `tools/limits.mjs`, `tools/baseline.json` (repository bounds, design D18) |
| `tests/modder/` | removed (task 3.7) |
| `tools/*.mjs` | stays |
| `plugins/dotclaude-modder/` | `external/archive/dotclaude-modder/` (task 3.8) |

## `plugins/dotclaude/`

| Current | Target |
| --- | --- |
| `.claude-plugin/plugin.json` | stays, with `types` added only when a feature uses `$.state` |
| `agents/*.md` | stays |
| `output-styles/dotclaude.md` | stays |
| `skills/handoff/SKILL.md` | stays |
| `skills/setup/SKILL.md` | stays, with the script path changed |
| `skills/setup/scripts/settings.mjs` | stays |
| `hooks/hooks.json` | stays, with `modules: ["./register.mjs"]` and the script paths changed |
| `hooks/mod.mjs`, registration part | `hooks/register.mjs` |
| `hooks/mod.mjs`, `context_management` text | `features/prompt/data.mjs` |
| `hooks/auto-mode-guard.mjs` | `features/guard/cli.mjs` |
| `tests/mod.test.ts` | stays in `tests/`, with one file for each feature |
| `lib/budget.mjs` | stays in `lib/`, with the shared runtime bounds only (design D18) |
| `lib/guard.mjs` | `features/guard/rules.mjs` |
| `lib/setup.mjs` | `features/setup/rules.mjs` |
| `status-line/statusline.mjs` | `features/statusline/cli.mjs`, with the parts of design D6 in the same folder |
| `templates/settings.json` | `features/setup/profile.json` |
| `templates/managed-settings.json` | removed (task 6.9): its five keys move into `features/setup/profile.json` |
| `tsconfig.json` | stays |
| (new) | `types/index.d.ts`, `settings.json` |

## `plugins/dotclaude-jev/` (stays an add-on, design D24)

| Current | Target |
| --- | --- |
| `skills/second-opinion/scripts/jev.mjs` | `features/jev/cli.mjs`, called through `$.process.run` (tasks 3.11, 3.12) |
| `skills/second-opinion/decision.json` | `features/jev/decision.json` |
| `hooks/module/index.mjs` | `hooks/register.mjs`, and registers the second-opinion tool and the `AskUserQuestion` hook (task 3.13) |
| `hooks/session-start/second-opinion.md`, `skills/second-opinion/SKILL.md` | text into the tool description, files removed |
| `hooks/hooks.json`, `.claude-plugin/plugin.json`, `tsconfig.json` | stay |
| `tests/jev/` | stays |

## `plugins/dotclaude-browser/` (stays an add-on, design D24)

| Current | Target |
| --- | --- |
| `skills/drive-web-browser/SKILL.md` | stays (task 3.15) |
| `skills/.markdownlint.jsonc`, `.claude-plugin/plugin.json` | stay |
| `tests/browser/` | stays |

## `plugins/dotclaude-codegraph/` (new add-on, design D26)

| Current | Target |
| --- | --- |
| (new) | `.claude-plugin/plugin.json`, `hooks/hooks.json` (classic command hooks), `bin/`, `features/graph/cli.mjs` (tasks 17.2 to 17.5) |

## `plugins/dotclaude-docs/` (new add-on, design D24)

| Current | Target |
| --- | --- |
| (new) | `plugins/dotclaude-docs/skills/docs/SKILL.md`, `.claude-plugin/plugin.json`, and a `marketplace.json` entry (task 15.1) |

## Notes

- `features/<name>/` holds `rules.mjs`, `limits.mjs`, and an optional `cli.mjs` and `data.mjs` (design D17).
  The dependency rule is in design D18.
- The guard keeps its own folder, because the classic `PreToolUse` hook needs a script and the guard is its own concern.
- D17 puts `types/index.d.ts` in the plugin only when a feature uses `$.state`.
  The `plugin-layout` spec allows it as the one `.d.ts` file that the manifest names (decision of the user).

## Files by runtime after task 3.2 (task 3.5)

| Runtime | Files |
| --- | --- |
| Node 22.18, `.mjs` | `plugins/dotclaude/hooks/register.mjs`, `features/*/{cli,rules,data}.mjs`, `lib/budget.mjs`, `skills/setup/scripts/settings.mjs`, and the two `.mjs` files of `dotclaude-jev` |
| `claude plugin test` | `plugins/dotclaude/tests/mod.test.ts` |
| Bun | `tests/**`, `tools/**` |
| Python | none |

- No file breaks design D19, so task 3.5 moves nothing.
- The `.claude-plugin/types/` folders are generated, and git ignores them.
- `tests/support/runtimes.test.mjs` fails on a script in `plugins/` that is not `.mjs`, except a hook-lab `.test.ts` and the `types` file that a manifest names.
