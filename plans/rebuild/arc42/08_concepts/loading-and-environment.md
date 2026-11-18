# Loading and Environment

- [ ] **CC-073** claudetto shall load about 1,000 tokens of core terms each session (`.claude/rules/agent-terms.md`), load `paths:`-scoped rules on touching tests, shipped source, or own config, keep the full text (27-31K tokens) opt-in, and give a routing table naming which instrument to read before which action. Rule files under `plugins/claudetto/rules/` have no frontmatter, one to four non-empty lines, and a reason with "because" (`tools/rules.test.ts`); the root file is about 80 lines (build and test commands, directory boundaries).
  Acceptance: `tools/rules.test.ts` fails on a rule file with frontmatter. Instruction count itself degrades following. Verification: test.
  Basis: reported. Status: partial at 088a227c (`tools/rules.test.ts` exists per `git ls-tree -r 088a227c`).
  Source: external/please-use-me-often/agent-terms/AGENTS.snippet.md:3.

- [ ] **CC-074** claudetto shall record environment quirks once in a session-start file (grep is ugrep, `.env` deny, BSD userland, zsh globbing), fix at the root (`bunfig.toml` `env = false`), skip dot-entries in tests that list folders, make a silent tool failure name the denied path (file upstream if not), keep absolute scratch paths identical with and without the sandbox, and re-read the target after a write is rejected, interrupted, or fails (a rejected command had already written the file).
  Acceptance: the quirks file loads at session start. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (`bunfig.toml` and `plugins/claudetto/scripts/session-start.ts` exist per `git ls-tree -r 088a227c`).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:14.
