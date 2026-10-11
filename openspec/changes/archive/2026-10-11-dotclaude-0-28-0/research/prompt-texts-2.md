# Texts that the harness gives to Claude (part 2)

This part follows [prompt-texts.md](prompt-texts.md).
The columns and the decisions are in part 1.
The path prefix of each entry is `plugins/<plugin>/`.

## Plugin `dotclaude-browser`

| Where | Surface | When | Bytes | Bound |
| --- | --- | --- | --- | --- |
| `skills/drive-web-browser/SKILL.md:2-3` name and description | Skill listing | Each request | 114 | `T` `SKILL_META_*` (below the low bound of 150) |
| `skills/drive-web-browser/SKILL.md` body | Skill body | When the skill runs | 2,895 | `T` `SKILL_BODY_*` |
| `features/search/search.mjs:123` `pageResult` | Tool result of `WebSearch` | A `WebSearch` call that the browser answers | 135, template, plus the page text | `F` `MAX_OUTPUT_CHARS` (20,000 characters) |
| `features/search/search.mjs:139` `MISSING_BINARY` | Tool result (the `deny` of the `tool.call` hook) | The `backend` option is `cloakbrowser` and the binary is missing | 358 | - |
| `features/search/search.mjs:146` `INVALID_INPUT` | Tool result (deny) | A `WebSearch` call with an empty `query` | 57 | - |

`F` is `features/search/limits.mjs`.
The strings of `failure` and of the `reason` of `pageResult` do not reach the model.
On a failure the hook returns `null`, and the built-in `WebSearch` runs.

## Plugin `dotclaude-codegraph`

| Where | Surface | When | Bytes | Bound |
| --- | --- | --- | --- | --- |
| `features/graph/rules.mjs:24` `SESSION_LINE`, sent by `features/graph/cli.mjs:71` | `additionalContext` of `SessionStart` | Session start, in a project with `.codegraph/codegraph.db` | 258 | - |
| `features/graph/rules.mjs:82` `contextText`, sent by `features/graph/cli.mjs:94` | `additionalContext` of `PreToolUse` (`Grep`, `Glob`) | A search for one symbol that the graph knows | 125, template, plus the callers | `F` `GRAPH_CONTEXT_MAX` (1,200 characters), `F` `CALLERS_LIMIT` |

`F` is `features/graph/limits.mjs`.
The `check` output (`features/graph/rules.mjs:108`) goes to the user.
`hooks/description.txt` and `hooks/hooks.json` hold no text for the model.

## Plugin `dotclaude-docs`

| Where | Surface | When | Bytes | Bound |
| --- | --- | --- | --- | --- |
| `skills/docs/SKILL.md:2-3` name and description | Skill listing | Each request | 103 | `T` `SKILL_META_*` (below the low bound of 150) |
| `skills/docs/SKILL.md` body | Skill body | When the skill runs | 1,543 | `T` `SKILL_BODY_*` (below the low bound of 2 KB) |

The skill names no reference file.

## Plugin `dotclaude-jev`

The tool exists only when `TYPESAFE_API_KEY` is set.

| Where | Surface | When | Bytes | Bound |
| --- | --- | --- | --- | --- |
| `features/jev/tool.mjs:27` `DESCRIPTION` (with `RULES` at line 16) | Tool description of `second_opinion` (`$.tool.register`) | Each request, with the key | 1,119 | `T` `FIRST_REQUEST_*`, `F` `MIN_CONFIDENCE`, `F` `HIGH_CONFIDENCE` |
| `features/jev/tool.mjs:35` `INPUT_SCHEMA` descriptions | Input schema of `second_opinion` | Each request, with the key | 341 (schema as JSON 708) | `F` `MIN_OPTIONS`, `F` `MAX_OPTIONS` |
| `features/jev/tool.mjs:130` `result` prefix | Tool result | A successful call | 29, template, plus the answer | - |
| `features/jev/cli.mjs:132` `format` | Tool result (stdout of the client) | A successful call | Not measured | `F` `YES_NO_UNSURE_BAND`, `F` `MIN_CONFIDENCE` |
| `features/jev/tool.mjs:119` `fallback` | Tool result | The client fails, or the key is gone | 275, template | - |
| `features/jev/tool.mjs:135` `INVALID_INPUT` | Tool result | The input is not valid | 122, template | `F` `MIN_OPTIONS` |
| `features/jev/tool.mjs:138` `NO_KEY` | Tool result | The key left the environment | 305 | - |
| `hooks/register.mjs:81` | Tool result | The client run throws | 59 | - |
| `features/jev/cli.mjs:52`, `:83`, `:91`, `:101`, `:106`, `:120`, `:183`, `:191` | Reason in the `fallback` text (stderr of the client) | The client exits with an error | Not measured | - |
| `features/jev/ask.mjs:64` | Text added to the `question` of `AskUserQuestion`, shown to the user | A facts question with a pick | 33, template | `F` `MIN_CONFIDENCE` |

`F` is `features/jev/limits.mjs`.
The `KIND` and `pick_` instructions of `features/jev/ask.mjs` go to the Jev model and not to Claude, so I excluded them.

## Plugin `dotclaude-lab`

| Where | Surface | When | Bytes | Bound |
| --- | --- | --- | --- | --- |
| `skills/eval-compare/SKILL.md:2-3` name and description | Skill listing | Not listed (`disable-model-invocation`) | 191 | `T` `SKILL_META_*` |
| `skills/eval-compare/SKILL.md` body | Skill body | When the user runs the skill | 1,532 | `T` `SKILL_BODY_*` (below the low bound of 2 KB) |
| `features/eval-compare/run.mjs:38-42`, `bin/dotclaude-eval-compare:16-24` | Tool result of `dotclaude-eval-compare` | When the skill runs it | About 300 plus the output of `claude plugin eval` | `B` `BASH_OUTPUT_MAX_CHARS` |

## Plugin `dotclaude-sessions`

| Where | Surface | When | Bytes | Bound |
| --- | --- | --- | --- | --- |
| `skills/start/SKILL.md:2-3` name and description | Skill listing | Each request | 223 | `T` `SKILL_META_*` |
| `skills/start/SKILL.md` body | Skill body | When the skill runs | 1,881 | `T` `SKILL_BODY_*` (below the low bound of 2 KB) |
| `skills/usage/SKILL.md:2-3` name and description | Skill listing | Each request | 243 | `T` `SKILL_META_*` |
| `skills/usage/SKILL.md` body | Skill body | When the skill runs | 1,717 | `T` `SKILL_BODY_*` (below the low bound of 2 KB) |
| `features/start/cli.mjs`, `first.mjs`, `session.mjs`, `sources.mjs` (21,022 bytes of code) | Tool result of `dotclaude-start` | When the skill runs it | Not measured, computed tables | `B` `BASH_OUTPUT_MAX_CHARS` |
| `features/usage/cli.mjs`, `report.mjs`, `summary.mjs`, `runs.mjs`, `turns.mjs`, `parse.mjs` (32,806 bytes of code) | Tool result of `dotclaude-usage` | When the skill runs it | Not measured, computed tables | `B` `BASH_OUTPUT_MAX_CHARS` |

The report text of these two commands is mostly numbers.
A long output is saved to a file, and Claude gets a preview and the path.

## Totals per surface

The totals are static bytes of the working tree.
A "template" entry counts its static parts.
"Per request" means that the text is in each request of a session.

| Surface | Entries | Bytes |
| --- | --- | --- |
| Output style (per request) | 1 | 5,517 |
| System prompt sections in code (per request, one variant) | 4 variants | 187 to 272 |
| `context_management` section (per request, with `DISABLE_COMPACT`) | 1 | 591 |
| Attachments (sandbox 341 or 725, auto mode 188, agent note 78) | 4 | 607 to 991 |
| Tool descriptions of `dotclaude` (`Agent`, `Bash`, `Read`) | 3 | 2,269 |
| Tool description and schema of Jev (with the key) | 2 | 1,460 |
| Agent listing (per request) | 5 | 944 |
| Skill listing (per request: `drive-web-browser`, `docs`, `start`, `usage`) | 4 | 683 |
| Agent bodies (on a run) | 5 | 17,548 |
| Spawn blocks (on a run) | 4 variants | 417 to 661 |
| Skill bodies (on a run: 6 skills) | 6 | 11,358 |
| Hook context (`additionalContext`, session note) | 6 templates | 2,183 (plus 1,200 of graph data) |
| Deny reasons (`dotclaude` 635, `dotclaude-browser` 415) | 5 and 2 | 1,050 |
| Ask reasons, user (`dotclaude`) | 4 | 1,001 (plus 6,000 of policy data) |
| Tool results of Jev, code only | 5 | 790 |
| Tool result of `WebSearch`, code only | 1 | 135 (plus 20,000 of page data) |
| `Stop` prompt (own request of the hook model) | 1 | 1,918 |

Per request, the main session of `dotclaude` with all add-ons and no Jev key has about 10,130 to 10,600 static bytes.
That is the output style, one variant, the three tool descriptions, two attachments (the sandbox text and the auto mode text), the agent listing, and the skill listing.
The bound `START_TOKENS` (`T`) measures the real start in tokens.

The skill listing counts 4 skills.
The `setup` and `eval-compare` skills have `disable-model-invocation`, so they have no entry.
Their metadata is 77 and 191 bytes.
The sum of the metadata of the 6 skills is 951 bytes, below the low bound `SKILL_META_TOTAL_LOW_BYTES` of 5 KB.

## Count of hook output builders

Run these commands in the repository root.
The function `c` counts a literal text in `.mjs` files of `plugins/`, and leaves out `tests`, `evals`, and `node_modules`.

```bash
c() { grep -rcF -e "$1" plugins --include='*.mjs' \
  --exclude-dir=node_modules --exclude-dir=tests --exclude-dir=evals \
  | grep -v ':0$'; }
```

Output of each command:

```text
$ c 'permissionDecisionReason'
plugins/dotclaude/features/adherence/rules.mjs:1
plugins/dotclaude/features/reads/cli.mjs:1
plugins/dotclaude/lib/hook-io.mjs:1
$ c 'hookSpecificOutput'
plugins/dotclaude-codegraph/features/graph/cli.mjs:1
plugins/dotclaude/lib/hook-io.mjs:2
$ c 'additionalContext:'
plugins/dotclaude/features/context/rules.mjs:1
$ c 'preToolUse('
plugins/dotclaude/features/adherence/rules.mjs:1
plugins/dotclaude/features/reads/cli.mjs:1
$ c 'postToolUse('
plugins/dotclaude/features/context/rules.mjs:1
$ c 'decision: "ask"'
plugins/dotclaude/hooks/register.mjs:1
$ c 'systemMessage'
$ c 'process.exit(2)'
$ c 'session.append'
plugins/dotclaude/features/drift/hooks.mjs:1
$ c 'tool.register'
plugins/dotclaude-jev/features/jev/tool.mjs:2
plugins/dotclaude-jev/hooks/register.mjs:1
$ c 'return { deny'
plugins/dotclaude-browser/hooks/register.mjs:2
$ c 'result:'
plugins/dotclaude-jev/hooks/register.mjs:2
plugins/dotclaude-browser/hooks/register.mjs:1
```

The count of `on(` calls in the hooks modules:

```text
$ grep -rcE '^ +on\(' plugins --include=register.mjs | grep -v ':0$'
plugins/dotclaude-jev/hooks/register.mjs:2
plugins/dotclaude-browser/hooks/register.mjs:1
plugins/dotclaude/hooks/register.mjs:11
```

How the counts match the lists:

- `permissionDecisionReason` has 2 call sites and 1 definition (`lib/hook-io.mjs`).
  The 2 sites are `features/reads/cli.mjs` (1 deny, entry `denyReason`) and `features/adherence/rules.mjs` (the `verdict`, which carries the 4 reasons `gitReason` x2, `protectedReason`, `claimReason`, and `spansReason`).
  Both tables list them.
- `additionalContext` has 3 senders: `features/context/rules.mjs` (2 texts), and `features/graph/cli.mjs` (`SessionStart` and `PreToolUse`).
- `systemMessage` and `process.exit(2)` have count 0, so no text goes to the user by `systemMessage` and no hook uses the stderr of exit 2.
- The module `dotclaude` has 11 `on(` calls.
  7 emit a text: `prompt.compose`, `agent.spawn`, `session.start` (the drift note), `prompt.section`, `prompt.attachment`, `tool.describe`, and `tool.check` (the ask reason).
  4 emit none: `agent.offer` and the three `tool.call` rewrites.
- The module `dotclaude-jev` has 2 `on(` calls and both emit: `session.start` registers the tool, and `tool.call` serves the tool and rewrites `AskUserQuestion`.
- The module `dotclaude-browser` has 1 `on(` call (`tool.call` for `WebSearch`), and it emits the result or the 2 denies.
- The classic command hooks of `hooks.json` that print text are `features/reads/cli.mjs`, `features/adherence/cli.mjs` (2 entries), `features/context/cli.mjs`, and `features/graph/cli.mjs` (2 events).
  The `sync` mode prints nothing.

## Not verified

- I did not check that the model sees an `ask` reason.
- I did not check that the listing leaves out a skill with `disable-model-invocation`.
  The Claude Code docs say so, and I read them as the source.
- The "template" sizes come from calls with minimal placeholders.
