# Glossary

## Failure Issue Codes

- [ ] **TERM-001** **Issue Codes** map symptom to issue: guessed version or stack I01; ignores CLAUDE.md I02; long-session drop I03 (also "Prompt is too long" with compaction off); false done I04; test edits I05; caves or asks too much I06; unrequested edits I07; invented API or flag I08; bloat I09; injection or over-refusal I10; parallel conflicts I11; token burn I12; hand-back I13; changed user value or retried rejection I14; wording tests I15; invalid eval I16; orphan jobs I17; wrong model served or rejected write landed I18.
  Source: external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md:28.

- [ ] **TERM-002** **Levers by Issue** (Appendix A): I01 Edit stale-read refusal, `InstructionsLoaded`, auto-memory; I02 CLAUDE.md, rules, managed `claudeMd`; I03 `autoCompactWindow`, `idleCompaction`, sleep compaction, PreCompact and PostCompact, `/rewind`; I04 Stop, SubagentStop, TaskCompleted, `/goal`; I05 deny rules, `ConfigChange`; I06 AskUserQuestion; I07 modes, classifier, sandbox, checkpoints, `disableBypassPermissionsMode`; I10 `switchModelsOnFlag`; I11 `autoContinueAtUsageLimit`; I12 `maxEffortLevel`, subagent model and TTL env vars, ToolSearch. In claude 2.1.326 these are present (code search of 2.1.326): `claudeMd`, `autoCompactWindow`, `idleCompaction`, `maxEffortLevel`, `switchModelsOnFlag`, `autoContinueAtUsageLimit`, `fileCheckpointingEnabled`, the hooks InstructionsLoaded, TaskCompleted and ConfigChange (`chunk-m33vdkhs.js@5365`), `CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_PROMPT_CACHE_TTL`, `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`, and `permissions.disableBypassPermissionsMode` (`chunk-m33vdkhs.js:197428`). PreCompact, PostCompact, Stop and SubagentStop are present in 2.1.326 (chunk-m33vdkhs.js@5211), and the tool `ToolSearch` too (chunk-txkmavag.js@196).
  Source: external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md:28.

## Terms

- [ ] **TERM-003** Medical error: a fault of the agent or product, such as sycophancy, recorded with its diagnosis, mechanism, and cure.
  Acceptance: each risk item names its cure. Verification: inspection.
  Basis: user decision. Status: missing at 088a227c (`git grep -n -i 'medical error' 088a227c` finds nothing).
  Source: user goal set through `/goal`, 2026-11-16 17:53 UTC, flag faults as medical errors (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4481).

- [ ] **TERM-004** Builtin: a plugin with the id `<name>@builtin` that the `claude` binary registers.
  Acceptance: the 14 ids are listed in CTX. Verification: inspection.
  Basis: measured. Status: have.
  Source: `chunk-62ne6tjy.js` (claude 2.1.325 binary) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4661).

- [ ] **TERM-005** Handover: the text a session writes so a cleared session resumes; it replaces core compaction's summary in claudetto.
  Acceptance: used in REQ-HANDOVER. Verification: inspection.
  Basis: user decision. Status: partial at 088a227c (the code says `handoff`; `git grep -n -i handover 088a227c -- plugins` finds only a `handover-probe` tool call).
  Source: user decision, 2026-11-14 02:46 UTC, a cheap handover through /clear instead of auto-compaction (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31369).

- [ ] **TERM-006** Prefix reuse: the cache hit measure, the cached read of request n over the read and creation tokens of request n-1, capped at 1.
  Acceptance: used in QS. Verification: inspection.
  Basis: measured. Status: have.
  Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281).

- [ ] **TERM-007** Withheld Read: a Read the repeat guard answers with a notice instead of the file; the file still counts as read for `Edit` and `Write`.
  Acceptance: see REQ-GUARDS. Verification: inspection.
  Basis: measured. Status: have.
  Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281).
