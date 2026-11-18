# Subagents

## Subagents and Multi-Agent

## Subagents and Multi-Agent

## Subagents and Multi-Agent

## Subagents and Multi-Agent

## Subagents and Multi-Agent

## Subagents and Multi-Agent

## Subagents and Multi-Agent

## Subagents and Multi-Agent

## Subagents and Multi-Agent

## Subagents and Multi-Agent

## Subagents and Multi-Agent

## Subagents and Multi-Agent

## Subagents and Multi-Agent

## Subagents and Multi-Agent

- [x] **CTX-054** Commenter claim, measured in part on 2.1.327: an unconstrained subagent carries schemas for its tools, and restricting tools (`tools: Read`) shrinks the request. With the fake API, a `general-purpose` subagent request holds tools 16,179 bytes in a 28,097-byte request, and a custom agent with `tools: Read` holds tools 1,925 bytes in a 5,026-byte request, about 23 KB less (cc-inspect cli, 2026-11-18). The commenter's "hundreds of kilobytes" is not reproduced: this probe has no MCP servers or rules, so the figure scales with what a real session loads. The poster's own breakdown was a guess.
  Basis: measured (2.1.327, fake API, no MCP servers) for the direction and the 23 KB gap; reported for "hundreds of kilobytes".
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1x97ix2-a-readonly-custom-subagent-cut-20261022T122153Z.md:74 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x97ix2/a_readonly_custom_subagent_cut_our_tokens_per/>).
  Verified: source already on 2.1.327.

## Subagents and Multi-Agent

## Subagents and Multi-Agent

- [x] **CTX-061** `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0` restores the full system prompt on Opus and Sonnet 5.5 (short about 5.6k chars against 26.8k). The short prompt lacks "don't reference current task", "default to writing no comments", the abstraction rules, the risky-action list, and the injection flag; the full prompt drops "report outcomes faithfully" and advises stashing before discard (unsafe in a shared tree). Measure before adopting. System prompt sizes are measured in two units on two settings and must not be mixed: the stock Claude Code system prompt is 6,174 bytes (probe baseline: 12 tools, fake API, `--setting-sources ""`); the full prompt is about 26.8k characters and the short prompt about 5.6k characters (one report, `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0`).
  Acceptance: Each figure names its unit and setting. Verification: inspection.
  Basis: measured on 2.1.327 (cc-inspect cli, fake API, model claude-opus-5-5, 2026-11-18): the first request's system block is 6,274 bytes by default and with `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1`, and 27,820 bytes with `=0` (tools also grow, 30,470 to 46,533 bytes). The env is listed by cc-inspect `surface`. Status: missing at 088a227c (`git grep SIMPLE_SYSTEM_PROMPT` finds nothing under `plugins/`). measured (6,174 bytes); reported (26.8k and 5.6k characters, n=2). The dossier rejected the 26.8k root-prompt claim because it contradicts the 6,174-byte baseline; the source does not say which setting each figure measures.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:169; openspec/changes/2-1-325-rearchitecture/design.md:129,133@088a227c9^ (related only: a cache-hit probe and `ENABLE_PROMPT_CACHING_1H`; these lines do not state the item's claim).
  Verified: source already on 2.1.327.

## Subagents and Multi-Agent

## Subagents and Multi-Agent

## Subagents and Multi-Agent

## Subagents and Multi-Agent

- [x] **CTX-835** On 2026-11-18 `/usage` in the user's GodHand session on 2.1.327 reported for the last 24 hours: weekly limit 75% used; main loop 98% of input tokens from cache with no misses; subagents on Sonnet 5.5 at $530.69 list price (18.7m output, 2.2b cache read, 49.7m cache write) against $133.31 on Opus 5.5; "general-purpose" subagents at 73% of usage; sessions with requests in 8 or more separate hours at 98% of usage.
  Acceptance: `/usage` shows the per-model lines and the insights `subagent_heavy`/agent and `cron` (chunk-4dyhk64x.js@7794 and @10870 give their titles and the 8-hour rule). Verification: probe.
  Basis: observed (user-supplied `/usage` output, 2026-11-18); read (chunk-4dyhk64x.js@7794, claude 2.1.327). Status: n/a (usage state).
  Source: user decision, 2026-11-18 (user message in ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl, after line 671).
  Verified: source already on 2.1.327.

