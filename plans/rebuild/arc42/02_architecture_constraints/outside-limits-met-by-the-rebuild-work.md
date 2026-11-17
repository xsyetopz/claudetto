# Outside Limits Met by the Rebuild Work

- [ ] **CON-063** `claude plugin eval` shall run outside the macOS sandbox, because inside it the eval's own sandbox fails with EPERM on its socket; `just check` shall also run outside it, because its PTY test needs that.
  Acceptance: the same eval run passes outside the sandbox and fails with the EPERM text inside. Verification: probe.
  Basis: observed in transcript, 2026-11-16. Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7424 (handoff, Decisions: "Sandbox is required but failed to initialize: EPERM ... srt-mux sock"); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:3402 (`just check` outside the sandbox); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281).
