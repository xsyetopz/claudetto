# Crash-Safe Long Agent Loops

- [ ] **CC-031** A long agent loop records an idempotency key before each side-effecting tool call, holds a monotonic fencing token on leases, and keeps a spec-driven `tasks.md` checklist with status files so that a rerun does not restart; a crash mid-handoff does not stall the swarm.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-12_p3/export-For those running long Claude agent loops in production- how do you handle crashes mid-run-.jsonl:3 (spec-driven Tasks.md checklist with run status files, safe to rerun), :5 (idempotency key carried by the effect, taken from the plan step), :6 (monotonic fencing token; the store rejects a lower token).
