# Glossary

## Failure Issue Codes

- [x] **TERM-001** Moved Out as OUT-2695: describes a part that plugins/ does not ship: the Issue Codes, levers, medical-error record and repeat guard are not in plugins/.

- [x] **TERM-002** Moved Out as OUT-2696: describes a part that plugins/ does not ship: the Issue Codes, levers, medical-error record and repeat guard are not in plugins/.

## Terms

- [x] **TERM-003** Moved Out as OUT-2697: describes a part that plugins/ does not ship: the Issue Codes, levers, medical-error record and repeat guard are not in plugins/.

- [x] **TERM-004** Builtin: a plugin with the id `<name>@builtin` that the `claude` binary registers.
  Acceptance: the 13 ids that claude 2.1.327 registers are the ids in `plugins/claudetto/hooks/builtins/builtins.ts`. Verification: inspection.
  Decision: 2.1.327 retired `cc-plugin-claude-test`; it keeps only an alias and a cleanup of the old data folder (chunk-ddhdrc1h.js@15315), so the count is 13, not 14.
  Basis: measured. Status: have.
  Source: `chunk-62ne6tjy.js` (claude 2.1.325 binary; the module is gone from 2.1.327; on 2.1.327 the `@builtin` id suffix is verified: the builtin source id is built as `${name}@builtin` (chunk-ja5z738t.js@165996), `Sxn` tests `endsWith("@builtin")` (chunk-dafpvz32.js@52175), and the builtin plugins register in a map keyed by name and are listed as `<name>@builtin` (chunk-dafpvz32.js@80491, `xhe`); the count of 14 was not recounted on 2.1.327) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4661).
  Verified: grep -c -a "@builtin" in the 2.1.327 binary -> 20; builtins.ts lists the ids (2.1.327, 2026-11-19).
  Verified: code read, claude 2.1.327, 2026-11-19: the builtin init in chunk-syz79m2z.js@500 calls SPe for 13 names (sec-default, agents-md, telemetry, privacy, plugin-authoring, mods-guide, tips, mermaid, responsive-mode, diff, you-should-know, easel, claude-platform); builtins.ts lists the same 13. The earlier 14 counted the retired claude-test.

- [x] **TERM-005** Handover: the text a session writes so a cleared session resumes; it replaces core compaction's summary in claudetto.
  Acceptance: used in REQ-HANDOVER. Verification: inspection.
  Basis: user decision. Status: partial at 088a227c (the code says `handoff`; `git grep -n -i handover 088a227c -- plugins` finds only a `handover-probe` tool call).
  Source: user decision, 2026-11-14 02:46 UTC, a cheap handover through /clear instead of auto-compaction (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31369).
  Verified: claude plugin test plugins/claudetto -> 54 pass; compact.ts replaces the core summary with the handover (2.1.327, 2026-11-19).

- [x] **TERM-006** Moved Out as OUT-2698: describes a part that plugins/ does not ship: the status line shows cache reads over all prompt tokens of one turn, a different measure.

- [x] **TERM-007** Moved Out as OUT-2699: describes a part that plugins/ does not ship: the Issue Codes, levers, medical-error record and repeat guard are not in plugins/.
