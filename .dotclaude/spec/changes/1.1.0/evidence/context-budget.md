# Context Budget of the First Turn (P160)

## Method

- Claude Code `2.1.299`, on 2026-10-14.
- One fresh `just sandbox --dir /tmp/claude/p160sb -p 'Reply with "Ok."'` session, with an empty project and no settings snippet.
  The model replied `Ok.`.
  Transcript: `/tmp/claude/p160sb/config/projects/-private-tmp-claude-p160sb-project/ba517d5b-809e-44cf-8790-f651af681db0.jsonl`.
- The sizes are in characters of the text that Claude Code sent, from the `prompt_snapshot` row and the attachment rows of the transcript.
- The override points come from the bundle `~/.local/share/claude/versions/2.1.299`, read only, and from the docs pages `env-vars.md` and `settings.md` of `code.claude.com`, saved on 2026-10-14.
  Each offset is a byte offset in the bundle file.
- The sizes of the dotclaude texts come from the files of `76dc06d7`.
  `tests/tools/context-budget.test.ts` measures them again in each run.

## Tokens of the First Request

The first request was 16,632 tokens: 2 input and 16,630 cache write.
The measure of the earlier brief, 22,886 tokens, had a repository `CLAUDE.md`, sandbox instructions, and MCP instructions, and this empty project has none of them.

## Parts of the First Turn

### System Prompt

The system prompt had 17 entries and 9,062 characters.

| Entry | Characters | Source | Override point |
| --- | --- | --- | --- |
| 0 to 6 | 5,562 (1,560, 266, 488, 626, 793, 1,456, 373) | dotclaude, `prompt/texts.ts/*.md` through `prompt/domain/variants.ts` | the dotclaude texts |
| 7 | 34 | Claude Code, the dynamic boundary marker | no override point |
| 8 | 73 | dotclaude, `transforms/communication.ts` | the dotclaude transform |
| 9 | 235 | dotclaude, `transforms/pronouns.ts` | the dotclaude transform |
| 10 | 341 | dotclaude, `transforms/action_caution.ts` | the dotclaude transform |
| 11 | 446 | heading of Claude Code, body of `transforms/session_guidance.ts` | the transform, and `CLAUDE_CODE_REMOVE_PROMPT_STRINGS` for the heading |
| 12 | 1,479 | heading and memory path of Claude Code, body of `transforms/memory.ts` | the transform |
| 13 | 284 | heading of Claude Code, body of `transforms/env_info_simple.ts` | the transform |
| 14 | 136 | heading of Claude Code, body of `transforms/context_management.ts` | the transform |
| 15 | 49 | Claude Code, the total-tokens block | `CLAUDE_CODE_TOTAL_TOKENS_REMINDER` (effect of `off` on this entry not found) |
| 16 | 423 | Claude Code, the `WebSearch` mode note | `CLAUDE_CODE_REMOVE_PROMPT_STRINGS` only, no switch found |

The `WebSearch` note has no switch: `CLAUDE_CODE_DISABLE_WEB_SEARCH`, `WEBSEARCH_DISABLED`, and `DISABLE_WEB_SEARCH` each have 0 hits in the bundle.

### Attachments

| Attachment | Characters | Override point |
| --- | --- | --- |
| `skill_listing` | 7,134 | `SLASH_COMMAND_TOOL_CHAR_BUDGET` (documented), `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` (documented), `CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL` and `CLAUDE_CODE_DISABLE_CLAUDE_CODE_SKILL` (undocumented, 211709093 and 211709236) |
| `agent_listing_delta` | 3,180 | the agent descriptions of dotclaude; no gate traced |
| `remote_session_change` | 581 | no gate traced |
| `session_context` | 555 | no gate traced |
| `environment` | 736 | no gate traced |
| `deferred_tools_delta` | 446 | `ENABLE_TOOL_SEARCH` (documented, MCP tools only) |
| `model` | 165 | no gate traced |
| `total_tokens_reminder` | 86 | `CLAUDE_CODE_TOTAL_TOKENS_REMINDER=off` (undocumented) |
| `date` | 64 | no override point found |

The earlier P160 run gave other attachment sizes (for example `environment` 223), because it counted the JSON of the row and not the text.
This table counts the text.

## Override Points Used

dotclaude sets no new override point in P160.
The reason for each candidate:

- `CLAUDE_CODE_TOTAL_TOKENS_REMINDER=off` saves 86 characters, and maybe 49 more.
  The count tells the model how far it is from the end of its budget, and P158 plans `countdown` for that use.
  The effect of `off` on how a session ends is not measured, so it is not a change with no loss.
- `CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL` and `CLAUDE_CODE_DISABLE_CLAUDE_CODE_SKILL` remove a skill that a user can call.
- `SLASH_COMMAND_TOOL_CHAR_BUDGET` under the size of the listing makes each skill name-only, and the model loses the text that tells it when to use a skill.
- `CLAUDE_CODE_REMOVE_PROMPT_STRINGS` can remove the headings of entries 11 to 14 (about 80 characters) and the `WebSearch` note (423 characters).
  The note tells the model how to pick the `mode` of a search, so its removal is a loss.
  The headings are small, and a string match on a text of Claude Code breaks without notice in a later release.
- `CLAUDE_CODE_SIMPLE` and `CLAUDE_CODE_SAFE_MODE` turn off skills.

So `tests/dotclaude/prompt/context-overrides.test.ts` has no value to pin, and P160 does not add it.

## The Compact Buffer

With `DISABLE_COMPACT`, `/context` shows `Compact buffer` as a fixed 3,000 tokens.
It is a reserve that `/context` takes from the free space, and it is not in the request.
No setting changes it.

## Budgets

The sizes of each dotclaude text, from the files of `76dc06d7`:

- Prompt texts (13): `tools.md` 1,440, `doing-tasks.md` 1,347, the others 596 or less.
  Total 5,914.
- Section transforms (14): `memory.ts` 3,643, `doing_tasks.ts` 1,575, `actions.ts` 1,214, `system.ts` 992, the others 953 or less.
  Total 11,857.
- Output style: `Concise.md` 393.
- Fragments (6): 392 or less.
  Total 1,199.
- Agent descriptions (6): 169 to 259.
- Skill descriptions (15): 143 to 247.
- Constant hook texts (4): 644 (`dcc-plugin-you-should-know` `SYSTEM`), 264, 260, 74.

Jev got four sets of budgets (REQ-25): `freeze`, `category-caps`, `tight-caps`, and `caps-plus-totals`.
Jev picked `category-caps`, with confidence 0.64 (0.73 for the pick).

| Kind | Budget in characters | Constant in `tools/limits.ts` |
| --- | --- | --- |
| Prompt text | 1,000 | `PROMPT_TEXT_MAX_CHARS` |
| Section transform | 1,000 | `TRANSFORM_MAX_CHARS` |
| Output style | 400 | `STYLE_MAX_CHARS` |
| Fragment | 400 | `FRAGMENT_MAX_CHARS` |
| Agent description | 250 | `AGENT_DESCRIPTION_BUDGET_CHARS` |
| Skill description | 250 | `SKILL_DESCRIPTION_MAX_CHARS` |
| Hook text | 300 | `HOOK_TEXT_MAX_CHARS` |

## Known Failures

Seven texts are over their budget at the start of 1.1.0.
The test lists each one with `test.failing`, so the test fails when the package cuts the text and the list still names it.

| Text | Size | Budget | Package |
| --- | --- | --- | --- |
| prompt text `TOOLS` | 1,440 | 1,000 | P64 |
| prompt text `DOING_TASKS` | 1,347 | 1,000 | P64 |
| transform `memory.ts` | 3,643 | 1,000 | P64 |
| transform `doing_tasks.ts` | 1,575 | 1,000 | P64 |
| transform `actions.ts` | 1,214 | 1,000 | P64 |
| agent `implementer.md` | 259 | 250 | P80 |
| hook text `SYSTEM` of `dcc-plugin-you-should-know` | 644 | 300 | P155 |

## Not Verified

- The consumers of `CLAUDE_CODE_MAX_EFFORT_REMINDER`, `CLAUDE_CODE_INLINE_TOOLS`, and `CLAUDE_CODE_SUPPRESS_SESSION_ATTRIBUTION`.
- The readers of `CLAUDE_CODE_APPEND_PROMPT_HEAD`, `CLAUDE_CODE_SYSTEM_PROMPT_GB_FEATURE`, `CLAUDE_CODE_SKILL_ATTRIBUTION`, and `CLAUDE_CODE_OVERRIDE_DATE`.
- The gates of `agent_listing_delta`, `environment`, `model`, `session_context`, and `remote_session_change`.
- The texts that hooks build from session data at run time.
  The test measures only the constant hook texts.
