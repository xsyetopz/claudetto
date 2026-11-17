# Facts and Limits Found in the 2.1.325 Rearchitecture

- [ ] **CON-064** Mod tests shall run only through `just lab` on the whole `plugins/claudetto` folder, outside the sandbox, because a run on a subfolder fails with "no hooks module" and the sandbox blocks a PTY.
  Acceptance: `claude plugin test plugins/claudetto` outside the sandbox exits 0. Verification: demonstration.
  Basis: observed in transcript, 2026-11-16. Status: have.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, Decisions; "Failed to open PTY" in `claude-tty.test.ts`); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (mod tests only through `just lab`).

- [ ] **CON-065** Lint limits are `max-lines` 300 and `max-dependencies` 10; a mod shall not use `$` as a value such as a WeakMap key.
  Acceptance: `just check` exits 0; the mod loads. Verification: test.
  Basis: observed in transcript, 2026-11-14. Status: have.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, Facts: a WeakMap keyed by `$` caused 311 lab failures).
