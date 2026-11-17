# Design Law

- [ ] **CON-052** claudetto shall invent no file, format, schema, version, order or priority; it uses what a standard, Anthropic, OpenSpec or a large project defines, and puts findings in `design.md`.
  Acceptance: each such choice cites its standard. Verification: inspection.
  Basis: user decision. Status: missing at 088a227c (sibling item status adopted; no check at 088a227c enforces it).
  Source: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (standing goal lines).

- [ ] **CON-053** claudetto shall carry no scaffolding, plumbing or stub without a present use, and shall fix a cause, never work around it.
  Acceptance: no unused export or stub in the tree. Verification: inspection.
  Basis: user decision. Status: missing at 088a227c (sibling item status adopted; `git grep -n -i -E '\bstub\b|scaffold' 088a227c -- plugins ':!*.test.ts'` finds no code that checks it).
  Source: user decision, 2026-11-16 06:11 UTC, no workaround, scaffolding or stub; guards only for a valid reason (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10779); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (standing goal lines).
