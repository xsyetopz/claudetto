# Spec Commands: The Gap to OpenSpec and Spec Kitty

## Sources

- OpenSpec CLI: <https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md>
- OpenSpec slash commands: <https://github.com/Fission-AI/OpenSpec/blob/main/docs/commands.md>
- Spec Kitty README: <https://github.com/Priivacy-ai/spec-kitty>
- Spec Kitty kanban: <https://github.com/Priivacy-ai/spec-kitty/blob/main/docs/architecture/kanban-workflow.md>
- Spec Kitty agent commands: <https://github.com/spec-kitty/spec-kitty/blob/main/docs/api/agent-subcommands.md>
- dotclaude-spec: `src/plugins/dotclaude/slices/spec/` and `wiki/dotclaude/Spec-Store.md`, at commit `44e74425` of dotclaude 1.0.0.
- Limit: Spec Kitty `agent tasks list-tasks` flags and a `dashboard` command are not confirmed (page read 100000 of 149086 characters).

## Dotclaude-Spec Today

The CLI is `dotclaude-spec`, in `src/plugins/dotclaude/slices/spec/adapters/`.
The store is `.dotclaude/spec/` (`wiki/dotclaude/Spec-Store.md`).
Sizes are `trivial`, `medium`, and `large`.
Only `large` has packages, waves, and `events.jsonl`.

| Command | What it does |
| --- | --- |
| `new <id> [--size]` | Writes the template files of a change. |
| `status [<id>]` | Prints the lane of each package. |
| `next [<id>]` | Prints the next step of a change. |
| `lane <package> <lane>` | Moves a package, appends to `events.jsonl`, sets the checkbox. |
| `ready [<id>]` | Prints planned packages with done deps and no `owns` overlap. |
| `merge <package> <branch>` | Merges a reviewed branch, runs `just generate`, sets `done`, commits. |
| `validate [<id>]` | Checks specs, deltas, tasks, packages, and `owns` overlap in a wave. |
| `archive <id>` | Applies the deltas to `specs/` and moves the change to `archive/`. |
| `record <text>` | Writes a hotfix record. |
| `runs` | Prints how many agent runs a wave may start now. |

Lanes are `planned`, `doing`, `review`, `done`, and `blocked`.
Allowed moves (`adapters/lane.ts`, `NEXT_LANES`):

- `planned` to `doing`, `review`, `done`, `blocked`.
- `doing` to `review`, `done`, `blocked`.
- `review` to `doing`, `done`, `blocked`.
- `blocked` to `planned`, `doing`, `done`.
- `done` has no move out.

Two mod handlers in `slices/spec/adapters/mod.ts` set `doing` at an `implementer` spawn and `review` at its end.
`lane` and `merge` run only in the main checkout, so the root session owns the store.
There is no read command for one package, no list, no diff, no review verdict, and no cancel.

## OpenSpec

Model: a change folder holds a proposal, a design, tasks, and delta specs.
`archive` merges the deltas into the main specs.

| Command | What it does |
| --- | --- |
| `list [--specs\|--changes] [--sort] [--json]` | Lists changes or specs. |
| `view` | Opens an interactive dashboard. |
| `show [item] [--type] [--json] [--deltas-only] [--requirements] [-r <id>]` | Shows a change or a spec. |
| `validate [item] [--all\|--changes\|--specs\|--archived] [--strict] [--json]` | Checks changes and specs. |
| `archive [change] [-y] [--skip-specs] [--no-validate]` | Merges deltas and archives. |
| `new change <name> [--schema]` | Creates a change folder. |
| `status [--change] [--json]` | Shows artifact completion. |
| `instructions [artifact]` | Returns the instruction for the next artifact, `apply`, or `archive`. |

Slash commands (<https://github.com/Fission-AI/OpenSpec/blob/main/docs/commands.md>):

- Core: `/opsx:propose`, `/opsx:explore`, `/opsx:apply`, `/opsx:update`, `/opsx:sync`, `/opsx:archive`.
- Expanded: `/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify`, `/opsx:bulk-archive`.

OpenSpec has no lane model and no package model.
Its control is read access (`list`, `show`, `view`), `validate --strict`, `verify`, and `sync` before archive.

## Spec Kitty

Model: mission, work packages (WP), 9 lanes, one git worktree per WP.

| Command | What it does |
| --- | --- |
| `next --agent --mission` | Says what the agent does next. |
| `agent tasks status [--json]` | Prints the kanban board by lane. |
| `agent tasks move-task <WP> --to --assignee --note --approval-ref --review-feedback-file --force` | Moves a WP with a guard. |
| `agent action implement <WP> --agent` | Prints the WP prompt and moves `planned` to `in_progress`. |
| `agent action review <WP>` | Prints the prompt with prior feedback and moves `for_review` to `in_review`. |
| `agent mission accept --mode auto\|pr\|local\|checklist` | Runs the acceptance workflow. |
| `agent mission merge --strategy --push --dry-run --keep-branch` | Merges the mission branch. |
| `/spec-kitty.charter\|specify\|plan\|tasks\|review\|accept\|merge` | The slash flow. |

Lanes (<https://github.com/Priivacy-ai/spec-kitty/blob/main/docs/architecture/kanban-workflow.md>):

- `planned`, `claimed`, `in_progress`, `for_review`, `in_review`, `approved`, `done`, `blocked`, `canceled`.
- 27 allowed moves, with rework back to `in_progress` or `planned`, and `blocked` or `canceled` from any lane.
- A move outside the table needs `--force` with an actor and a reason.
- Rejection is `move-task --to planned --review-feedback-file`.

## Gap Table

| Control | OpenSpec | Spec Kitty | dotclaude-spec |
| --- | --- | --- | --- |
| List changes | `list` | none found | none (`status` with no id only) |
| Show one change or package | `show` | prompt via `action implement` | none |
| Dashboard or board | `view` | `agent tasks status` | `status` (text) |
| Validate | `validate --strict` | `finalize-tasks --validate-only` | `validate` |
| Move a lane | none | `move-task` | `lane` |
| Rework from review | none | `move-task --to planned` with feedback file | `lane review doing` without a record |
| Block with a note | none | `move-task --to blocked --note` | `lane blocked` without a note |
| Review verdict | `verify` | `acceptance-verdict`, `approved` with `--approval-ref` | none |
| Accept a change | none | `mission accept` | none (`archive` only) |
| Merge | none | `mission merge --dry-run` | `merge` without `--dry-run` |

## Recommended Commands (Ranked)

The root session is the orchestrator and subagents are workers.
Each command runs in the main checkout only, like `lane`, and has `--json`.

1. `show <id> [<package>]`: prints the brief, deps, `owns`, lane, and last events.
   The root reads one package with one call and hands it to a worker.
2. `list`: prints open and archived changes with size and lane counts.
   The user finds a change after `/clear`.
3. `lane <package> <lane> --note <text>`, with the note required for `blocked` and for a move back.
   The reason goes to `events.jsonl`, so `block` and `unblock` need no new command.
4. `review <package> approve|reject [--finding <text>]...`: writes a verdict event.
   `reject` moves to `doing` and stores the findings.
   `merge` refuses a package with no `approve`.
5. `retry <package>`: moves `review` or `blocked` to `doing` and prints the stored findings.
   The root re-spawns an `implementer` with no free-form paste.
6. `drop <package> --reason <text>`: adds the terminal lane `canceled`.
   The root removes a package that the plan no longer needs.
7. `deps [<id>]`: prints the wave graph, blocked chains, and `owns` overlaps.
   The user sees why `ready` prints nothing.
8. `log [<id>] [--package <p>]`: prints `events.jsonl` as lines.
   Needed to audit what the hooks moved.
9. `diff <id>`: shows the effect of `archive` on `specs/` with no write.
   The user approves a spec change before `archive`.
10. `merge --dry-run` and `archive --dry-run`: cheap, like Spec Kitty `--dry-run`.
11. `accept <id>`: checks that all packages are `done`, `validate` passes, and each `Verify:` line ran.
    Then `archive` is allowed.
    `dashboard`, `init`, `config`, `store`, `workset`, and `schema` add surface without control, so skip them.

## Open Questions

- Should `canceled` count as a done dep, or block its dependents?
- Should the hooks (`agent.spawn`, `turn.complete`) write the `claimed` and `in_review` lanes, or stay with 5 lanes?
- Where do review findings live: in `events.jsonl` or in `packages/NN-<slug>.md`?
