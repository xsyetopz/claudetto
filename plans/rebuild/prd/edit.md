# Edit Requirements

## Perl Batch Edit

- [ ] **REQ-EDIT-001** claudetto shall let the agent do many edits in one `Bash(perl -0pi -e ...)` call in place of many `Edit` calls; no batch tool is registered ([ADR-0097](../adr/0097-batched-edit-tool.md)).
  Acceptance: a change to 10 places of one file takes one tool call. Verification: demonstration.
  Basis: user decision. Status: missing at 088a227c (`git grep -n -i perl 088a227c -- plugins project.just` finds no hit)
  Source: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4661).

- [ ] **REQ-EDIT-002** claudetto shall allow `Bash(perl -0pi -e *)` in permissions and run a `PostToolUse` hook on its result that prints `git diff --stat` of the touched files and tells the model to Read each touched file before a Write, because Write refuses a file changed after its Read (chunk-4h798pp0.js@1719124, claude 2.1.326).
  Acceptance: under `acceptEdits` the perl call runs with `decision: accept, source: config`, the hook shows the diff stat, and a Write after the re-Read succeeds where the same flow without the hook fails with "File has been modified since read". Verification: probe.
  Basis: user decision. Status: missing at 088a227c (`git grep -n -i perl 088a227c -- plugins project.just` finds no hit; settings.ts:86 allows `Bash(git diff)` only)
  Source: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290); probe, `claude` 2.1.325, 2026-11-16: without the allow rule `perl -0pi` was denied, "requires approval" (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290).
