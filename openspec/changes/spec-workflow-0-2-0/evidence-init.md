# Evidence: `openspec init` sizes

Date: 2026-10-18.
Step 1 of `design.md`.

## Pin

`@fission-ai/openspec` is pinned to `1.14.3` in `devDependencies` of `package.json`, with no `^`.
`bun.lock` is updated.

## Commands

Each run used an empty temp folder.
The global config was a temp `$XDG_CONFIG_HOME/openspec/config.json`, so the real config was not changed.

```sh
OPENSPEC_TELEMETRY=0 bunx --bun @fission-ai/openspec@1.14.3 \
  init --tools claude --profile core --no-animation
```

The global config of each run:

| Run | `config.json` |
| --- | --- |
| `both` | `{"profile":"core","delivery":"both"}` |
| `skills` | `{"profile":"core","delivery":"skills"}` |
| `commands` | `{"profile":"core","delivery":"commands"}` |
| `skills+verify` | `{"profile":"custom","delivery":"skills","workflows":[` the six `core` ids and `"verify"` `]}` |

For the last run, `init` had no `--profile` flag and read `custom` from the config.

## Findings

- The delivery mode is the `delivery` key of the global config (`both`, `skills`, or `commands`).
  `init` has no flag for it.
  Set it with `openspec config set delivery skills`, or write the config file.
- The default is `both`, which makes each workflow twice.
- `verify` is not in `core`.
  `core` is `propose`, `explore`, `apply`, `update`, `sync`, `archive`.
- To add `verify`, use `profile: custom` and a `workflows` list that holds the six ids and `verify`.
  `openspec config profile` sets it in a picker.
- The `claude` tool makes `.claude/skills/openspec-*/SKILL.md` and `.claude/commands/opsx/*.md`.
- The global config is outside the project.
  So the skill text must tell the user to set `delivery`, or claudetto must write it.

## Bytes

Common to each run: `openspec/config.yaml` is 998 bytes.
`.gitkeep` files are 0 bytes.

| File | `skills` | `commands` | `both` |
| --- | ---: | ---: | ---: |
| `apply` | 11430 | 11173 | 22570 |
| `archive` | 16594 | 17330 | 33913 |
| `explore` | 23506 | 20459 | 43930 |
| `propose` | 16700 | 16395 | 33084 |
| `sync` | 15779 | 15579 | 31348 |
| `update` | 11578 | 11186 | 22720 |
| Prompt total | 95589 | 92122 | 187565 |
| With `config.yaml` | 96585 | 93120 | 188563 |

With `verify` in `skills`: `openspec-verify-change/SKILL.md` is 20229 bytes.
The total is 116814 bytes, and the prompt total is 115818 bytes.

## Comparison

| Setup | Prompt bytes | Times `minispec` (12.5 KB) |
| --- | ---: | ---: |
| `minispec` of 0.1.0 | 12500 | 1.0 |
| `core`, `commands` | 92122 | 7.4 |
| `core`, `skills` | 95589 | 7.6 |
| `core` + `verify`, `skills` | 115818 | 9.3 |
| `core`, `both` (default) | 187565 | 15.0 |

Result: the budget rule holds only in part.
One mode halves the text, but `core` + `verify` is still about 9 times `minispec`.
Each installed skill is 11 to 23 KB.
Only the skill description loads at session start.
The body loads when the skill runs.
`commands` has no description cost at start, so it is the smaller choice for context.
Later steps must trim the text or accept the size.
