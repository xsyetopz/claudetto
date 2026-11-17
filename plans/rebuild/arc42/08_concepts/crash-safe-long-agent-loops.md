# Crash-Safe Long Agent Loops

- [ ] **CC-031** A long agent loop records an idempotency key before each side-effecting tool call, holds a monotonic fencing token on leases, and keeps a spec-driven `tasks.md` checklist with status files so that a rerun does not restart; a crash mid-handoff does not stall the swarm.
  Basis: reported. Status: missing at 088a227c.
  Source: unresolved: no source line located for this claim.
