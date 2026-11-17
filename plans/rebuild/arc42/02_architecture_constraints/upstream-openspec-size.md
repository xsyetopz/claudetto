# Upstream OpenSpec Size

- [ ] **CON-006** claudetto-openspec shall ship only after a measurement shows lower skill bytes and fewer code lines than upstream `@fission-ai/openspec` (core profile 95,443 skill bytes plus 92,122 command bytes at 1.16.0 init; near-duplicate commands; 57 packages; exit 127 under `env node` 5 times; a sandbox violation for `edge.openspec.dev:443`; 7 installed skills total 116,067 bytes).
  Acceptance: a recorded measurement shows lower skill bytes and code lines. Verification: inspection.
  Basis: measured. Status: have at 088a227c (`plugins/claudetto-openspec`).
  Source: openspec/specs/lean-openspec/spec.md:129.
