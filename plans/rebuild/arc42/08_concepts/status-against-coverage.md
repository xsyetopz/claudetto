# Status Against Coverage

- [ ] **CC-032** Execution status is mechanical and coverage is its own field (N of M checked, missing, findings that fail validation). Missing optional evidence gives a partial report with the gap on top; missing required evidence fails the run. A run can report "completed" while child work failed (Managed Agents, not the dynamic workflows beta; the workflows page on code.claude.com read on 2.1.327 says nothing of it). The agent never sets its own done bit.
  Basis: cited. Status: partial at 088a227c (verification hooks, unconfirmed).
  Source: external/2026-10-13/export-Claude Managed Agents completed status can still include failed work.jsonl:2 (post) and :5 (the agent no longer sets its own done bit; parent completion is the AND of the child results); plans/rebuild-curation.md:472@8ef531151.
