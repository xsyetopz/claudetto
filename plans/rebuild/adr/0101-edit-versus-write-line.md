---
status: rejected
date: 2026-11-17
---
# Add The Edit Versus Write Line To The Root Prompt

## Context and Problem Statement

Reports say Claude drifts back to shell or Python edits instead of the built-in Edit and Write tools, which fail often on Windows from encoding and escaping; a global CLAUDE.md can ban it, though one user reported a conflict with the system prompt (reported, n=3). The CONTEXT section of the root prompt at `plugins/claudetto/hooks/features/prompt/texts.ts:20` holds the absolute-path line and the changelog line and no Edit line. The source says it is unverified whether the built-in tool text already carries the line. The old plan says the stock prompt already has it and rejects the addition.

## Considered Options

- Add "Change an existing file with Edit; use Write for a new file." to the CONTEXT section.
- Leave the root prompt as it is, on the plan's claim that the stock prompt already says it.

## Decision Outcome

Chosen: leave the root prompt as it is; the line is not added, decided by the probe the record called for. In claude 2.1.326 the stock Write description says "When to use: creating a new file, or fully replacing one you've already Read. [...] For partial changes, use Edit instead.", and the stock Bash description says "Avoid using this tool to run `cat`, `head`, `tail`, `sed`, `awk`, or `echo` commands [...] use the appropriate dedicated tool". A claudetto line would repeat both.

## Consequences

- Good: fewer shell edits that bypass Edit tracking.
- Bad: each added root-prompt line costs bytes in every request.

Source: external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:166; plugins/claudetto/hooks/features/prompt/texts.ts:20@088a227c; probe: cc-inspect `code` action `cli`, version 2.1.326, prompts ["hi"], `tool` "Write" and then "Bash" (2026-11-17), which print the tool entries of the first Messages API request.
