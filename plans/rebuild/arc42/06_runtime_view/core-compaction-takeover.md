# Core Compaction Takeover

- [ ] **RT-042** claudetto shall register a `session.compact` hook that answers triggers `auto` and `precompute` with `{messages:[handover]}`, and `{skip}` for none.
  Acceptance: see REQ-HANDOVER. Verification: probe.
  Basis: measured. Status: partial at 088a227c (`handoff.ts` registers `session.compact` but answers by session age, not by triggers `auto` and `precompute` with `{skip}`).
  Source: `chunk-wqb2b4v0.js:2497458` (claude 2.1.325 binary; the module is gone from 2.1.327; on 2.1.327 triggers `auto` and `precompute` are both passed to the `session.compact` hook, chunk-m14bt1pz.js@2628332 and @3003857, and the answer check in chunk-b0yr0k8v.js@205424 corrects the shape: `{skip}` needs a non-empty string reason and no `messages`, while `{messages}` alone is rejected ("token counts that are not numbers") unless `tokensBefore`, `tokensAfter` and a four-count `usage` come with it) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297).
