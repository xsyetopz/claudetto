---
status: accepted
date: 2026-11-17
---
# Web Read Returns A Path And An Outline

## Context and Problem Statement

The claudetto `web_fetch` tool returned a whole page into context: about 12.2k tokens for the 2.1.326 release page, flagged by Claude Code as a "Large MCP response". The user asked for the web route with the fewest tokens, naming `@playwright/cli`, agent-browser (vercel-labs) and a lighter variant of verdict-cli, and ruled that this MCP overhead must never happen on claudetto or its MCP servers (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:15487). The user left the choice to the lead.

Measured on 2026-11-17 for one page and one question ("what does it say about MCP"):

| Route | Bytes to the model |
|---|---|
| `web_fetch`, `maxChars: 60000` | the whole page, about 12.2k tokens |
| agent-browser `read` | 51,270 (3.25 s, site navigation kept) |
| `@playwright/cli` `find "MCP"` | 14,142 (31 matches with ancestor nodes) |
| `@playwright/cli` `open` | 452 (snapshot of 90,949 bytes written to a file) |
| curl and stdlib extract to a file, then `grep -n MCP` | 2,946 (21 lines) |

Claude Code 2.1.326 caps an MCP result at 25,000 tokens and writes no text to a file; it writes a large Bash output to a file with a 2 KB preview. agent-browser cannot start inside the Bash sandbox on macOS.

## Considered Options

- The registered tool as now, returning the page up to `maxChars`.
- The registered tool writing the extract to a file and returning path, size, line count and heading outline (at most 2 KB).
- A Bash command line tool doing the same.
- agent-browser `read` as the first route.
- `@playwright/cli` as the read route.
- A lighter verdict-cli variant as the read route.

## Decision Outcome

Chosen option: the registered tool writing the extract to a file and returning at most 2 KB, keeping curl with the stdlib extractor first and the agent-browser fallback of the web fetch requirements. The agent reads the part it needs with Grep or Read. It needs the fewest bytes for the question measured, and the registered tool runs outside the Bash sandbox, where agent-browser fails to start; a Bash tool would need a sandbox exclusion for the fallback and an allow rule.

`@playwright/cli` and the verdict-cli ideas (ARIA refs, `snapshot -i`, snapshot diff, a shown window for a login) serve UI verification and page interaction, not reading; that route is not decided here.

### Consequences

- Good: one read costs at most 2 KB until the agent asks for a part; the 25,000-token MCP cap never applies.
- Bad: a question about a whole page costs one more call (the Grep or Read).
- Neutral: the outline of a page without headings is its first line and line count only.

### Confirmation

A test reads the 2.1.326 release page and checks a return of at most 2 KB and a path on which `grep -n MCP` gives 21 lines. Unmeasured: the same comparison on more pages, and in tokens rather than bytes.

Source: lead session `0342617c`, 2026-11-17 (commands and results in the context items of that date); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:15487; agent-browser 0.39.1, <https://github.com/vercel-labs/agent-browser>; `@playwright/cli` 0.1.24, <https://github.com/microsoft/playwright-cli>; verdict-cli 0.1.1, <https://github.com/tuandm/verdict-cli>; repository URLs from `npm view`, retrieved 2026-11-17.
