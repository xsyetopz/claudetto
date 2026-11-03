# Prompt Footprint

A figure here is a reading of `just capture` on Claude Code `2.1.317`. It runs `claude -p` against a local fake Messages API and counts the characters of the first request. No model is called and no provider is reached. The unit is characters, not tokens. `docs/surfaces.md` holds the method and the request-size tables for settings.

The totals: `just capture --arm plugin --shipped` reads 25,028 and `just capture --arm plain` reads 46,084. With `--interactive` they read 32,742 and 53,916. The working folder path is 34 characters under `-p` and 42 with `--interactive`.

## Main Prompt

`plugins/claudetto/agents/main.md` is 5,292 characters on disk by `wc -m`. In the shipped arm the third `system` block is the body without its front matter, 5,216 characters, and `system` reads 5,352 in all. The default body it replaces is 5,799 characters in the `plain` arm (`docs/default-body-gap.md` lists its items).

The ten sections of `main.md`, in characters of text between the tags (`awk`):

| Section | Characters |
| --- | --- |
| `<understanding_the_request>` | 702 |
| `<actions_and_consent>` | 662 |
| `<fixing_defects>` | 651 |
| `<finding_out>` | 645 |
| `<claims_and_evidence>` | 541 |
| `<harness_messages>` | 531 |
| `<project_context>` | 496 |
| `<security_work>` | 329 |
| `<finishing>` | 167 |
| `<role>` | 135 |

A rule in `main.md` is in every request of every session, so it earns its place by changing what the model does in every kind of session. A rule for one kind of work goes to an agent body, a skill, or a rule file (`docs/instruction-surfaces.md`).

## Output Style

`plugins/claudetto/output-styles/Concise.md` is 1,896 characters by `wc -m`. In the shipped arm it adds 1,906 to the request: the total reads 23,122 with `outputStyle` removed from the shipped settings, and 25,028 with it. The style body goes in the first system message of `messages`, under a header, so it is not part of `system`.

Its five sections, in characters of text between the tags (`awk`):

| Section | Characters |
| --- | --- |
| `<sentence_style>` | 581 |
| `<reporting_results>` | 454 |
| `<first_sentence>` | 265 |
| `<requests_to_the_user>` | 168 |
| `<acting>` | 97 |

The built-in styles in the `plain` arm read 47,651 for `Concise` and 47,607 for `Proactive` (`docs/prompt/overrides.md`).

## The Always-Loaded Pieces

The shipped arm sends 6 tools, 7,245 characters in all. Five carry a description that claudetto rewrites (`plugins/claudetto/src/blocks/tool-describe/texts.ts`). The columns are the description in the `plain` arm, the description in the shipped arm, and the size of the tool as JSON in the shipped arm:

| Tool | `plain` description | Shipped description | Shipped as JSON |
| --- | --- | --- | --- |
| `Bash` | 1,934 | 882 | 3,489 |
| `Read` | 790 | 286 | 1,409 |
| `Edit` | 360 | 243 | 845 |
| `ToolSearch` | 953 | 234 | 697 |
| `Write` | 240 | 196 | 594 |
| `DeferredToolPlaceholder` | not rewritten | 83 | 204 |

`TOOL_TEXTS` also holds texts for `Agent` (519), `AskUserQuestion` (779), `ListAgents` (256), `SendMessage` (2,954), and `Skill` (246), which apply to the tools of a session where those are present. They are not in the shipped first request.

## The Messages of the Shipped Arm

Under `-p` the shipped arm sends a `context_management` reminder of 856 characters as the first message and a system message of 10,450 characters as the second. The second one opens with the sandbox text and holds the environment, the style, the deferred-tool list, and the MCP text. Interactive, the first system message reads 11,018.

Pieces of the interactive shipped `messages`:

| Piece | Characters |
| --- | --- |
| Sandbox block | 6,675 (6,208 under `-p`) |
| Environment | 909 |
| Output style pieces | 33, 280, 104, 596, 472, 190 |
| Deferred-tool list | about 1,104 |
| MCP header | 122 |
| claudetto MCP text | 452 |
| `context_management` message | 854 (856 under `-p`) |

## The Sandbox Block by Setting

The sandbox text is the largest single piece of `messages` in the shipped arm, and its settings change it. Read with `just capture --arm plain --settings FILE`, against 46,084:

| Settings | Total | Change |
| --- | --- | --- |
| `sandbox.enabled: true` | 54,653 | +8,569 |
| `sandbox.enabled: true`, `allowUnsandboxedCommands: false` | 53,150 | -1,503 against the row above |
| the row above, plus five `denyRead` paths | 53,306 | +156 |

Setting `allowUnsandboxedCommands: false` takes 1,503 characters out of the sandbox text, and five `denyRead` paths add 156. Why the text changes by that much was not traced.

## Memory Files

`CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` makes the project and user instruction files add nothing. `just capture --arm plain --claude-md CHARS` writes a project `CLAUDE.md` of that many characters:

| `CLAUDE.md` size | Total | With `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` |
| --- | --- | --- |
| 0 | 46,084 | 46,084 |
| 1,000 | 47,480 | 46,084 |
| 2,000 | 48,497 | 46,084 |

A file costs its own length plus a header of about 400 characters, and the second 1,000 characters add 1,017. A user file of 1,000 characters (`--user-claude-md 1000`) adds 1,394, and both together read 48,616. The variable is not a default of the shipped settings, because it switches off the files that the user wrote for the project.

## Cache Stability

A prompt edit is a pure function of its inputs: no time, no counter, and no usage number in a shared section. `bun claudekit/prefix/main.ts claudetto` drives a session against the fake Messages API with the plugin, the shipped settings, and the `Concise` style. On `2.1.317` it read 4 main requests, with `tools=9` and `system=3` in each, and `{"kept":true}` for each step from one request to the next: every request kept the earlier `tools`, `system`, and `messages` byte for byte. What claudetto adds is appended, so the cache-safe way to add context is a new message at the end.

## Empty Interactive Session by Owner

`just capture --arm plugin --shipped --interactive` reads `system` 5,343 with blocks of 70, 57, and 5,216, `tools` 7,114 for 6 tools (`Bash`, `Edit`, `Read`, `ToolSearch`, `DeferredToolPlaceholder`, `Write`), and `messages` 12,361, in a total of 32,742. The `plain` arm reads `system` 6,185 with blocks of 70, 57, and 6,058, `tools` 33,674 for 13 tools, and `messages` 11,648, in a total of 53,916.

The owner of each piece follows from the removal readings in `docs/surfaces.md`: Claude Code owns the 6 tools and the first two `system` blocks, the shipped settings own the sandbox, deny, skill, and plugin pieces, and claudetto owns `agents/main.md`, `Concise.md`, and the tool descriptions above. A `/context all` reading in token units needs a live session with a model and is not part of this page.
