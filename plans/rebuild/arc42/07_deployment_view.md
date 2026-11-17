# Deployment View

## Release State

- [ ] **DEP-001** Change `2-1-325-rearchitecture`: created 2026-11-15, schema spec-driven; all tasks 1.1-8.5 done, 9.2 open ("Publish the branch to the `xsyetopz` marketplace; it serves the base commit `6f81c479`, so the branch work is active only through `claudetto-dev` until then").
  Basis: cited. Status: partial at 088a227c (the change's tasks as deleted with the OpenSpec).
  Source: openspec/changes/2-1-325-rearchitecture/.openspec.yaml:2; openspec/changes/2-1-325-rearchitecture/tasks.md:50.

## Dev Install

- [ ] **DEP-002** claudetto shall export HEAD to `~/.claudetto-dev` and run `claude plugin update` in `just dogfood`, because Claude Code copies a directory marketplace into `~/.claude/plugins/cache/<marketplace>/<plugin>/unknown` and a plain re-export leaves stale code; `just dogfood-dir` uses `--plugin-dir`, whose options come from `pluginConfigs["claudetto"]` or `["claudetto@inline"]`.
  Acceptance: after `just dogfood` the cached copy equals HEAD. Verification: demonstration.
  Basis: inferred. Status: have at 088a227c (justfile, inferred).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:101.
