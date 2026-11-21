# Stock 2.1.330 Prompt Texts

Captured request texts from clawdipedia.cc (`/prompts/defaults/*`, `/prompts/output-styles/*`), each a `-p hi` request of Claude Code 2.1.330 against a stub API, fetched 2026-11-21. They are the baseline for REQ-TOOLS-030 (system prompt) and REQ-TOOLS-031 (output style).

| Text | `system[2]` chars | `messages[1]` chars | Style text alone |
| --- | --- | --- | --- |
| `default-lean.md` (Opus 5.5, no style) | 7,010 | 9,181 | none |
| `full-prompt.md` (`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0`) | 28,283 | 9,388 | none |
| `style-proactive.md` | 7,048 | 10,649 | ~1,468 (10,649 − 9,181) |
| `style-concise.md` | 7,048 | 10,683 | ~1,502 (10,683 − 9,181) |

The output style travels in `messages[1]` (a `system`-role entry), not in `system[2]`; a style adds 38 chars to `system[2]` on the short prompt. claudetto's `output-styles/claudetto.md` is 7,062 bytes, about 4.8 times the stock Proactive style text.
