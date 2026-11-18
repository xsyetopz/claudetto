# Design Law

- [ ] **CC-079** Each part of claudetto needs a measured reason to exist. No workaround, scaffold, plumbing, or stub without a present use; a guard stays only for a failure caught in real transcripts; each control sits at the highest rung that holds (hook, gate, or permission over prose); when a bounded pattern does a job better for less, it becomes a design decision and claudetto uses it fully, paired with the built-in where each fits best.
  Acceptance: each guard and part cites a failure or a measurement. Verification: inspection.
  Basis: user decision. Status: partial at 088a227c.
  Source: user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10779); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10693); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Rebuild paragraph).

- [ ] **CC-080** claudetto follows DRY in its design and at runtime: no instruction stated twice in runtime text, and code checked for duplication before it is written; the best carrier (rule, CLAUDE.md line, hook) is found by trial.
  Acceptance: jscpd reports no new clone; no runtime instruction repeats. Verification: test.
  Basis: user decision. Status: partial at 088a227c (`.jscpd.json` and `AGENTS.md:38` hold the jscpd rule per `git grep -n jscpd 088a227c`; no runtime repeat check).
  Source: user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10615); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10928).

- [x] **CC-081** Moved Out as OUT-2632: third-party report with no probe.
