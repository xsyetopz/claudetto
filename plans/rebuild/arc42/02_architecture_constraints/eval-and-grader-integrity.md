# Eval and Grader Integrity

ADR-0193 reinstates these constraints on 2026-11-21, because `claude plugin eval` suites now exist (`plugins/claudetto-spec/evals/`). OUT-2501 to OUT-2506 keep the record of their time Out.

- [ ] **CON-055** Evals and graders shall have a hard pass; a grader is never loosened, and a task, scaffold or grader is never edited after a run was seen to make it pass.
  Acceptance: `git log` on `plugins/*/evals/<case>/` shows no commit to a case after the first run recorded for it; a changed case carries a new `-v2` name. Verification: inspection.
  Basis: user decision. Status: missing at 088a227c.
  Source: OUT-2501 (the user decision of 2026-11-16 it records); ADR-0193 (reinstated 2026-11-21).

- [ ] **CON-056** The prompt, scaffold, graders and criteria of each eval case shall be fixed and committed before its first run; a failing run is a result; a criteria change makes a new case reported apart.
  Acceptance: each case directory's first commit predates the first `results/` timestamp for that case. Verification: inspection.
  Basis: user decision. Status: missing at 088a227c.
  Source: OUT-2502 (the user decision of 2026-11-16 it records); ADR-0193 (reinstated 2026-11-21).

- [ ] **CON-057** The agent under test shall be unable to read case definitions or write graders, the held-out set or results.
  Acceptance: `claude plugin eval` hides case files from the agent (docs, read 2026-11-21); `~/.claudetto-holdout` read and write are denied (REQ-GUARDS-058); `just eval-holdout` runs outside the agent's sandbox. Verification: inspection and probe.
  Basis: user decision. Status: missing at 088a227c.
  Source: OUT-2503 (the user decision of 2026-11-16 it records); ADR-0193 (reinstated 2026-11-21).

- [ ] **CON-058** A grader shall be trusted only after it rejects known-bad samples.
  Acceptance: each `regex` grader has a good and a bad sample in `tools/__tests__/`, and `bun test` fails if the pattern accepts the bad one. Verification: test.
  Basis: user decision. Status: missing at 088a227c.
  Source: OUT-2504 (the user decision of 2026-11-16 it records); ADR-0193 (reinstated 2026-11-21).

- [ ] **CON-059** Tuning shall use the dev cases, and the claim that a part beats vanilla shall come from one run on the held-out set.
  Acceptance: a REQ that claims a gain over vanilla cites a held-out `aggregate-result.json`, never a dev run. Verification: inspection.
  Basis: user decision. Status: missing at 088a227c.
  Source: OUT-2505 (the user decision of 2026-11-16 it records); ADR-0193 (reinstated 2026-11-21).

- [ ] **CON-060** A doc the agent wrote shall be a claim, never evidence; graders read files, tool calls, git state and test exits.
  Acceptance: no case is graded by an `llm` grader alone, and no grader targets a file the agent wrote about its own work (a summary or report). Verification: inspection.
  Basis: user decision. Status: missing at 088a227c.
  Source: OUT-2506 (the user decision of 2026-11-16 it records); ADR-0193 (reinstated 2026-11-21).
