# Headless Session Cycle

- [x] **RT-020** Superseded by RT-025 and [ADR-0184](../../decisions/0184-headless-renewal-by-driver.md). The 2.1.325 design had the mod clear a headless session itself (`$.command.run({command:'clear'})`, then `$.prompt.submit` of the handoff) on a context-size or idle-gap trigger. On 2.1.327 the plugin clear under `-p` is dropped whenever a next prompt is queued (`clearCommandQueue`, chunk-m14bt1pz.js@740648) and fails with "host has ended its input" when stdin has closed; it resolves only with no queued prompt. Headless renewal therefore belongs to the driver, which sends `/clear` as a prompt, and the trigger is a task boundary (RT-027), never an idle gap.
  Basis: measured on claude 2.1.327 (probe A: plugin clear discarded in 3 of 3 runs with a queued prompt, resolved in a rerun with one prompt; probe F: host input ended). Status: superseded.
  Source: handover probes A and F, claude 2.1.327, 2026-11-18, cc-inspect `code cli` with a repo plugin dir, stream-json prompts (reports/2026-11-18-research/handover-probes/probe-a/probe.log, probe-f/probe.log); session-cycle probe, claude 2.1.325, 2026-11-16 (recorded in specs-curation.md at commit dc499712).
  Verified: not re-run 2026-11-19: superseded; the 2.1.327 statement needs a code search not done; static evidence: specs/decisions/0178-renewal-at-task-boundaries.md.

- [x] **RT-021** State reset runs on `session.end` with `reason === "clear"`, because `session.start` does not fire after a clear.
  Basis: measured on claude 2.1.325 and re-measured on 2.1.327 (probe log: `turn.complete #1`, `command.run clear`, `session.end {"reason":"clear"}`, `clear resolved`, one `session.start` only, none after the clear). Status: have (repeat.ts:180-183 clears loop state on `session.end` with reason `clear`; repeat.test.ts:106 covers it) at 088a227c.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in specs-curation.md at commit dc499712); plugins/claudetto/hooks/features/repeat/repeat.ts:180-183@088a227c.
  Verified: read handover/clear.ts: session.end with reason "clear" calls resetRenewal; claude plugin test plugins/claudetto -> 54 pass (2.1.327, 2026-11-19).
  Verified: inspection 2026-11-19: plugins/claudetto/hooks/handover/clear.ts:20-23 calls resetRenewal on session.end with reason clear.

- [x] **RT-022** Moved Out as OUT-2604: needs a live TUI or driver run to observe request order; no free probe.
