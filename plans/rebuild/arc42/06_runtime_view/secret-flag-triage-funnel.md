# Secret Flag Triage Funnel

- [ ] **RT-031** A triage funnel runs in three stages. Rules clear the obvious flags. Sonnet subagents do a second pass on the ambiguous flags. A person confirms every real leak by hand. One audit went from 2,179 secret-rule flags to 69 critical; a commenter notes the miss rate of the second pass is the number left out.
  Acceptance: The funnel counts the flags each stage cleared and the second-pass misses found by hand. Verification: demonstration.
  Basis: reported, one author. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xhmtya-i-used-claude-code-to-audit-21k-20261029T124002Z.md:36; external/2026-10-30/reddit.com-r-claudeai-comments-1xhmtya-i-used-claude-code-to-audit-21k-20261029T124002Z.md:67 (url: https://www.reddit.com/r/ClaudeAI/comments/1xhmtya/i_used_claude_code_to_audit_21k_product_hunt/).
