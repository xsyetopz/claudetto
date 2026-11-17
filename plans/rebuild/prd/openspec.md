# OpenSpec Requirements

## Core Parity

- [ ] **REQ-OPENSPEC-001** claudetto-openspec shall match openspec@latest in core profile only, lighter than openspec 1.15.0, with Claude 5.5 optimised prompts, selective XML tags where they fit, and fixes for what SDD and TDD complaints in external/ show it does wrong.
  Acceptance: behaviour matches openspec@latest core profile; each complaint has a fix or a recorded reason. Verification: demonstration.
  Basis: reported. Status: partial at 088a227c.
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459).

- [ ] **REQ-OPENSPEC-002** claudetto-openspec shall initialise OpenSpec on a new project with core parity to upstream OpenSpec, in a lighter form.
  Acceptance: a new project gets the OpenSpec layout that upstream's init writes, with fewer files and less text. Verification: demonstration.
  Basis: reported. Status: have at 088a227c (plugins/claudetto-openspec/hooks/layout.ts:14 `init` writes the layout; openspec.test.ts:185 "Empty Project: init writes the layout, and validate then passes", :198 "Existing Layout: init changes no file"; parity with upstream's init file set is not compared)
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:198 (user decision, 2026-11-09).

- [ ] **REQ-OPENSPEC-003** claudetto-openspec shall carry fixes for upstream OpenSpec issues and PRs.
  Acceptance: each upstream issue or PR the plan names has a fix or a recorded reason. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (plugins/claudetto-openspec/hooks/openspec.test.ts:133,144 keep upstream verdicts on MODIFIED; no list of upstream issues or PRs in plugins; the list was not read)
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:198 (user decision, 2026-11-09).
