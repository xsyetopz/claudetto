# Eval and Grader Integrity

- [ ] **CON-055** Evals and graders shall be designed with complexity and a hard pass; a grader shall never be loosened, and a task, scaffold, or grader shall never be edited after a run was seen, to make it pass.
  Acceptance: the history of each grader, scaffold, and task shows no edit after its first run; a failing run stays a result. Verification: inspection.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:6480 (user's rule on hard graders); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7424 (the user calls post-run edits cheating).

- [ ] **CON-056** The task, scaffold, graders, and criteria of each eval shall be fixed before its first run; a failing run is a result; a criteria change makes a new version reported apart.
  Acceptance: each eval has a recorded version; a changed criterion has a new version and a separate report. Verification: inspection.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889 (framework the user pasted, relayed in the handoff); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7424.

- [ ] **CON-057** The agent under test shall be unable to write graders, hidden tests, the holdout set, or results.
  Acceptance: an eval run gives the agent no write access to those paths. Verification: test.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889.

- [ ] **CON-058** A grader shall be trusted only after it rejects known-bad runs.
  Acceptance: each grader has a known-bad fixture that it fails. Verification: test.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889.

- [ ] **CON-059** Tuning shall use a dev set, and the final score shall be taken once on an unseen holdout.
  Acceptance: the holdout is not read before the final scoring. Verification: inspection.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889.

- [ ] **CON-060** A doc the agent wrote shall be a claim, never evidence; a fact shall be checked against git, tool calls, tests, and the user's instructions.
  Acceptance: each cited fact names a git commit, a tool result, a test, or an instruction. Verification: inspection.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889.
