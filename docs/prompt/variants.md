# Prompt Variants and What Each One Costs

Each row is one `just capture --arm plain --settings FILE` run on Claude Code `2.1.317`, against the 46,084-character baseline of `docs/surfaces.md`. The file holds one key or one `env` entry, and the working folder path is 34 characters. The unit is characters of the first request, not tokens, and no model was called.

| Variant | Switch | Total | Change | `system` | `tools` | `messages` |
| --- | --- | --- | --- | --- | --- | --- |
| Default | none | 46,084 | 0 | 5,935 | 29,512 (12) | 9,984 |
| Full prompt | `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0` | 83,960 | +37,876 | 27,216 | 45,685 (12) | 10,199 |
| Git instructions off | `includeGitInstructions: false`, or `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` | 44,771 | -1,313 | 5,935 | 28,838 (12) | 9,345 |
| Attribution off | `attribution: false` | 45,445 | -639 | 5,935 | 29,512 (12) | 9,345 |
| Memory off | `autoMemoryEnabled: false` | 43,946 | -2,138 | 3,820 | 29,512 (12) | 9,984 |
| Tools upfront | `ENABLE_TOOL_SEARCH=false` | 83,815 | +37,731 | 5,935 | 67,639 (22) | 9,588 |
| Cron off | `CLAUDE_CODE_DISABLE_CRON=1` | 45,700 | -384 | 5,935 | 29,512 (12) | 9,600 |
| Fork subagent off | `CLAUDE_CODE_FORK_SUBAGENT=0` | 45,688 | -396 | 5,935 | 29,116 (12) | 9,984 |
| Explore and Plan agents off | `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` | 45,173 | -911 | 5,935 | 29,512 (12) | 9,073 |
| Bundled skills off | `disableBundledSkills: true` | 57,113 | +11,029 | 5,935 | 46,467 (12) | 4,058 |
| Sandbox on | `sandbox.enabled: true` | 54,653 | +8,569 | 5,935 | 30,344 (12) | 17,721 |

## What the Rows Show

- Git instructions and attribution overlap. `attribution: false` takes 639 out of `messages`, and `includeGitInstructions: false` takes 1,313: 639 out of `messages` and 674 out of `tools`. Both set together read 44,771, the same as the git switch alone.
- `autoMemoryEnabled: false` takes the memory section out of the third `system` block, 5,799 to 3,684 characters. It is the largest single text saving of the rows.
- `ENABLE_TOOL_SEARCH=false` loads the deferred pool into `tools`, 10 more definitions. The row is a loss.
- `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0` selects the full prompt: `system` grows by 21,281 and `tools` by 16,173.
- `disableBundledSkills` alone is a loss, because `Workflow` inlines the guidance of the skill listing. It is a saving only beside a deny of `Workflow` (`docs/surfaces.md`).
- `CLAUDE_CODE_DISABLE_CRON=1` takes 384 out of `messages`; `CLAUDE_CODE_FORK_SUBAGENT=0` takes 396 out of `tools`.
- Sandbox settings add 7,737 to `messages` and 832 to `tools`.

The settings that setup writes (`docs/surfaces.md`) set the git, attribution, memory, cron, fork, and Explore and Plan switches and `disableBundledSkills`, with the deny of `Workflow`, and `sandbox.enabled`. They do not set `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` or `ENABLE_TOOL_SEARCH`.
