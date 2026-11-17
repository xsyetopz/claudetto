# Concurrent Edits

- [ ] **CC-083** A file shall not be edited while workers read it; a merge step gives each worker its own stage directory and concatenates after.
  Acceptance: workers write only under their stage directory. Verification: inspection.
  Basis: observed in transcript. Status: missing at 088a227c (`git grep -n -i 'stage dir' 088a227c` finds nothing).
  Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8799); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:9309).

- [ ] **CC-084** Bulk text jobs shall stay under 150 items per one-call pass, and a large prompt shall go by file, not by stdin or one command line.
  Acceptance: no pass truncates. Verification: demonstration.
  Basis: measured. Status: missing at 088a227c (`git grep -n -i '150 items' 088a227c` finds nothing).
  Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281).
