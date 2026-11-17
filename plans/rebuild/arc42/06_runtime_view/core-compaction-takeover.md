# Core Compaction Takeover

- [ ] **RT-042** claudetto shall register a `session.compact` hook that answers triggers `auto` and `precompute` with `{messages:[handover]}`, and `{skip}` for none.
  Acceptance: see REQ-HANDOVER. Verification: probe.
  Basis: measured. Status: partial at 088a227c (`handoff.ts` registers `session.compact` but answers by session age, not by triggers `auto` and `precompute` with `{skip}`).
  Source: `chunk-wqb2b4v0.js:2497458` (claude 2.1.325 binary) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297).
