# Research

## Research and Studies

- [x] **CTX-394** A third-party blog teardown claims more than 6 system-prompt variants across Claude Code and Desktop, an injectable live-prompt section `heron_brook`, fast mode for Opus as a different decoding layer, and a human-in-the-loop against a no-human variant.
  Acceptance: the blog states each claim. Verification: inspection.
  Basis: measured in part (claude 2.1.327, 2026-11-18). `heron_brook` is confirmed (chunk-m14bt1pz.js@2773954, see Source). The variant count (more than 6), the Desktop variants and the human-in-the-loop against no-human variant are not found in the program: a literal search for 'system prompt variant' returns no hit, and 'no human' hits only notification and permission-provenance text (chunk-zspx3ycy.js@3245, @4579; chunk-rj3e7agr.js@330592), not a prompt variant. Fast mode is a request field the client sends (`speed`, `usage.speed` 'standard' in the probe result); the decoding layer behind it is server-side and cannot be checked from the program. Status: have at 088a227c.
  Source: the blog was not found (Dropped (2026-11-18) for the 6-variant, fast-mode-decoding-layer and human-in-the-loop claims: no source located in external/, openspec/, reports/, git history or the user's transcripts). `heron_brook` is verified in the program on 2.1.327: a string flag `tengu_heron_brook` read from client data or the feature-value store and used when non-empty (chunk-m14bt1pz.js@2773960); it also appears as a section id at openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:17@088a227c9^ and plugins/claudetto/hooks/features/prompt/compose.test.ts:9@088a227c.
  Verified: source already on 2.1.327.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: item reports a third-party blog claim; heron_brook x6 present in 2.1.327 binary; the claim itself is not verified
