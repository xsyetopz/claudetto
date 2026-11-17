# Headless Session Cycle

- [ ] **RT-020** In a headless session (`-p`, SDK) the cycle starts on a context-size trigger or an idle gap of at least the cache TTL since the last request start, retries the clear if it is rejected while a prompt is queued, and writes the handoff (a fork's reply plus `git rev-parse --short HEAD` and `git status --short`, as handoff.ts builds it), then calls `$.command.run({command:'clear'})` and, once it resolves, `$.prompt.submit({text: handoff, asUser: true})`. Both calls stay unawaited in the hook, because the turn waits on its hooks and a command run inside one rejects.
  Basis: measured on claude 2.1.325 (unverified in 2.1.326). Status: partial (handoff.ts:43-65 builds fork plus git state; no command.run clear and no prompt.submit) at 088a227c.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in plans/rebuild-curation.md at commit dc499712); plugins/claudetto/hooks/features/compaction/handoff.ts:43-65@088a227c; probe, `claude` 2.1.325, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352).

- [ ] **RT-021** State reset runs on `session.end` with `reason === "clear"`, because `session.start` does not fire after a clear.
  Basis: measured on claude 2.1.325 (unverified in 2.1.326). Status: have (repeat.ts:180-183 clears loop state on `session.end` with reason `clear`; repeat.test.ts:106 covers it) at 088a227c.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in plans/rebuild-curation.md at commit dc499712); plugins/claudetto/hooks/features/repeat/repeat.ts:180-183@088a227c.

- [ ] **RT-022** The `/clear` command record stays in front of the handoff in request 2; the handoff text must not repeat it.
  Basis: measured on claude 2.1.325 (unverified in 2.1.326). Status: missing (no clear cycle at 088a227c) at 088a227c.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in plans/rebuild-curation.md at commit dc499712).
