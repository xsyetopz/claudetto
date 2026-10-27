## 1. Texts

- [x] 1.1 After probe round 6 exits, change `<delivering_work>`, `<asking>`, and `<doing_tasks>` of `plugins/claudetto/agents/main.md`, and the list lines of `plugins/claudetto/output-styles/Concise.md`. Check: `just check`.

## 2. Evidence

- [x] 2.1 Write to `src/wiki/claudetto/evidence/Evals.md` why no eval run shows the change: a run of `claude plugin eval` has no `AskUserQuestion` (the user chose no eval, 2026-10-27). Check: `just check`, which runs `just generate --check`.
