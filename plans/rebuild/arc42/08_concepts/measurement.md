# Measurement

- [ ] **CC-024** claudetto shall measure the right thing in each eval and probe.
  Acceptance: an arm assertion, kept traces, and a discrimination check; the scorer scores the answer set, not the last N results (a scorer reading the last 10 results scored 1/10 on a 10/10 run); a probe is judged by what the command did, not the exit code (`open -R` exit 0 while blocked); no prompt rule whose only payoff is a benchmark metric (a mutation rule cost 17 Stryker commands, $2.14, 20.8 min in hono, c8b12403); cost per task is measured. Verification: inspection.
  Basis: measured. Status: have as practice in the deleted OpenSpec; not a plugin feature.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/tasks.md:45; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:162; external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:63. Not located: the source of the 1/10 scorer and the 17-command Stryker cost.
