# Manual Clear

- [ ] **RT-041** claudetto shall, on a user `/clear`, run a `command.run` hook that awaits `$.model.fork({prompt, effort:'low'})`, stores the text in `$.store`, returns `next(e)`, and let a `prompt.context` block `claudetto:handover` inject the text in the first message after the clear; on `nothing-to-fork` or an error it injects the extract of `$.session.messages()`.
  Acceptance: probe A makes 3 requests, with the handover in request 3; probe B makes 2. Verification: probe.
  Basis: measured. Status: missing at 088a227c (`git grep -n -E "command\.run|prompt\.context" 088a227c -- plugins/claudetto/hooks` shows `command.run` hooks only for reply, setup, and surface, and no `prompt.context`).
  Source: probes A and B, `claude` 2.1.325, fake API, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738).
