# `claudetto` Documentation

The documentation is in the files of this folder. Each reading of Claude Code is of `2.1.317`.

## `docs/`

- [agent-misattribution.md](agent-misattribution.md): how to pick an agent whose tools fit the task, and what a read-only agent cannot do.
- [auto-mode.md](auto-mode.md): what setup writes to `autoMode`, and what Claude Code does with it.
- [classifier-input.md](classifier-input.md): which forms of a user message the built-in classifier and the `classify` block read, and which they drop.
- [confine.md](confine.md): the `confineEnabled` option, which confines the writes of each `Bash` command at the operating system level.
- [default-body-gap.md](default-body-gap.md): what the default system body carries that the agent file body that replaces it drops, item by item.
- [gates.md](gates.md): the tool gates and settings read from the Claude Code program.
- [instruction-surfaces.md](instruction-surfaces.md): the surfaces on which claudetto writes text, and the placement rule for a rule.
- [levers.md](levers.md): the keys that bound or shape a subagent, each with its source.
- [models.md](models.md): what claudetto sets for models and effort, and the prices it counts with.
- [sandbox.md](sandbox.md): the sandbox keys that the plugin sets and checks.
- [search-tools.md](search-tools.md): which search tools a session has, which ignore files each reads, and the measured output of `ast-grep`, `fd`, `difft`, and `universal-ctags` against `rg` and `git diff`.
- [surfaces.md](surfaces.md): the Claude Code surfaces that claudetto turns off and what each costs.
- [types.md](types.md): the vendored Claude Code types that the mod compiles against, and where they came from.
- [window-weights.md](window-weights.md): how claudetto records the plan-limit windows.
- [worktrees.md](worktrees.md): why a new worktree starts at `origin/<default branch>`, the `worktree.baseRef` setting, and the `worktree-base` block that names a missing branch tip.

## `docs/prompt/`

- [prompt/footprint.md](prompt/footprint.md): the measured size of every prompt piece that a request carries, and the byte budgets.
- [prompt/machinery.md](prompt/machinery.md): the auto mode classifier request, with its size.
- [prompt/overrides.md](prompt/overrides.md): how the prompt text of Claude Code is overridden, and the size of each override.
- [prompt/variants.md](prompt/variants.md): the switch for each prompt variant and what each costs.

## `docs/keep/`

Verbatim records that the code reads or that other pages cite, kept as read, with the licence of each third-party source.

- [keep/gitleaks/](keep/gitleaks/): the vendored Gitleaks config and its licence.
- [keep/lucide/](keep/lucide/README.md): the ISC licence of Lucide and the SVG sources of the two plugin icons.
- [keep/plugins/](keep/plugins/): the source reading and the design note that the `you-should-know` rebuild is based on.
