# Architecture Ladder

- [ ] **CC-030** The design escalates from a single call to a workflow, an agent loop, and multi-agent only on measured need, uses deterministic code for deterministic steps, and treats a same-session subagent as the cheap handoff. The Anthropic guide (cited via a thread) says one loop beats many subagents, and subagents often cost more tokens in total because each re-reads files; serial runs avoid duplicate context; the subagent model is checked in `/tasks`; the agent stops and asks after two failures.
  Basis: cited (via a thread). Status: partial at 088a227c (in the design only).
  Source: external/please-use-me-often/agent-failure-dossier/judged/subagent.jsonl:72; openspec/changes/archive/2026-11-16-2-1-323/design.md:1.
