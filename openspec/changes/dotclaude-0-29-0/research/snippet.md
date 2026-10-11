# Traces of the snippet keys (task 1.7)

Source: `plugins/dotclaude/lib/snippet.mjs`, and the 2.1.296 bundle strings in `external/cc-2.1.296/strings.txt` (59 MB).
Offsets are byte offsets in that file.

Verdicts:

- `traced`: the code that reads the key was found, and its effect is known.
- `open`: the first pass found only a mention, a merge, or nothing, and did not search further.
  Task 8.3 removes no `open` key, because an open key is not shown to have no effect.
- `no trace`: a full search found no reader with an effect.

| Key | Value | Trace | Effect | Verdict |
| --- | --- | --- | --- | --- |
| `autoCompactEnabled` | `false` | 17111339 | Auto compact is off, unless `DISABLE_COMPACT` decides first | `traced` |
| `autoMemoryEnabled` | `false` | 15859260 | Auto memory is off | `traced` |
| `includeGitInstructions` | `false` | 21861767 | The prompt has no git instructions (default `true`) | `traced` |
| `maxEffortLevel` | `max` | 16643948 | Caps the effort level | `traced` |
| `enableWorkflows` | `false` | 16635773 | Workflows are off | `traced` |
| `promptCacheTtl` | `5m` | 23833921 | Sets the main-thread cache TTL, after the env var | `traced` |
| `disableBundledSkills` | `true` | 16222850 | Bundled skills are off | `traced` |
| `promptSuggestionEnabled` | `false` | 29619662 | Prompt suggestions are off, unless the env var decides first | `traced` |
| `bashOutputMaxChars` | `4000` | 20806153 | Caps `Bash` output (default 30000) | `traced` |
| `awaySummaryEnabled` | `false` | 31157875 | The away summary is off | `traced` |
| `spinnerTipsEnabled` | `false` | 38567824 | Spinner tips are off | `traced` |
| `feedbackSurveyRate` | `0` | 48185770 | Survey probability is 0 | `traced` |
| `disableAgentView` | `true` | 20905217 | The agent view is off | `traced` |
| `disableRemoteControl` | `true` | 19531060 | Remote control is off | `traced` |
| `model` | `claude-opus-5-5` | 15673582 | The default model, after `ANTHROPIC_MODEL` | `traced` |
| `availableModels` | list | 14586303, 15687416 | The allowlist of models when `enforceAvailableModels` is `true` | `traced` |
| `enforceAvailableModels` | `true` | 15686765, 15687416 | Enforces the allowlist, and the default model becomes its first entry | `traced` |
| `enableArtifact` | `false` | 20603300 | The Artifact tool is off | `traced` |
| `feedbackDrafts` | `off` | 29371271 | `SendFeedback` drafts are off | `traced` |
| `fastMode` | `false` | 15592309 | Fast mode stays off | `traced` |
| `syncClaudeAiSkills` | `false` | 14508771, 14697776 | Schema and merge only, runtime reader not found | `open` |
| `syncClaudeAiPlugins` | `false` | 14509847, 19438335 | Plugin sync from claude.ai is off (reader body not read) | `traced` |
| `disableClaudeAiConnectors` | `true` | 15038723 | Connectors from claude.ai are off | `traced` |
| `skillOverrides` | object | 21583443 | Sets each skill to `on`, `name-only`, `user-invocable-only`, or `off` in the listing | `traced` |
| `attribution` | object | 21975700 | Sets the pull request text (the commit reader is not read) | `traced` |
| `subagentStatusLine` | object | 14534581, 5969044 | Runs the command for each subagent row (call site not read) | `traced` |
| `statusLine`, `enabledPlugins`, `sandbox`, `permissions` | objects | documented keys | Documented in the Claude Code settings docs, so no bundle trace is needed | `traced` (docs) |
| env `CLAUDE_CODE_ATTRIBUTION_HEADER` | `"0"` | 16586834 | Empties the attribution text | `traced` |
| env `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | `300000` | 22044050 | Sets the window of auto compact | `traced` |
| env `CLAUDE_CODE_AUTO_CONNECT_IDE` | `"false"` | 24764493 | No auto connect to the IDE, if the env object parses the value to a boolean | `traced` |
| env `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` | `"1"` | 19987837 | The advisor tool is off | `traced` |
| env `CLAUDE_CODE_DISABLE_CFC_PROMPT` | `"1"` | 19983237 | Sets an empty prompt for that feature | `traced` |
| env `CLAUDE_CODE_DISABLE_CRON` | `"1"` | 20928310 | Cron is off | `traced` |
| env `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` | `"1"` | 21326314 | The `Explore` and `Plan` agents are off | `traced` |
| env `CLAUDE_CODE_DISABLE_FAST_MODE` | `"1"` | 15589492 | Fast mode is off | `traced` |
| env `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` | `"1"` | 43677132 | No survey | `traced` |
| env `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | `"1"` | 27615452 | No terminal title writes | `traced` |
| env `DISABLE_COMPACT` | `"1"` | 17111339 | Auto compact is off | `traced` |
| env `CLAUDE_CODE_FORK_SUBAGENT` | `"0"` | 23162997, 23163423 | The fork agent is off | `traced` |
| env `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` | `"1"` | 24775378 | No auto install of the IDE extension | `traced` |
| env `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | `"5"` | 23053893 | At most 5 subagents at once (default 20) | `traced` |
| env `CLAUDE_CODE_MAX_CONTEXT_TOKENS` | `"300000"` | 15711964, 15712243 | The context window, read only when `DISABLE_COMPACT` is on | `traced` |
| env `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` | `"1"` | 16672743 | The session uses the simple system prompt | `traced` |
| env `CLAUDE_CODE_SUBAGENT_MODEL` | `claude-sonnet-5-5` | 15696060 | The model of a subagent with no model of its own | `traced` |
| env `CLAUDE_CODE_TODO_REMINDER_MODE` | `"off"` | 24822195 | Overrides the feature flag of the todo reminder (the effect of `off` is not read) | `traced` |
| env `DISABLE_ERROR_REPORTING` | `"1"` | 13085219, 20400668 | No error reports | `traced` |
| env `DISABLE_FEEDBACK_COMMAND` | `"1"` | 16985667 | The feedback command is off | `traced` |

Some readers compare an env value with a boolean, so a string such as `"1"` or `"false"` can fail to match.
How the bundle parses env values is not verified.

Only `syncClaudeAiSkills` stays `open`, and task 8.3 keeps it until a trace decides.

## Cache TTL with no `promptCacheTtl`

- A subscription gets 1 hour for the main thread, the SDK, auto mode, and memory relevance, and 5 minutes for other sources (23933068, 23833694, 16020094).
- An API key gets 5 minutes, unless `ENABLE_PROMPT_CACHING_1H` is set.
- Order: `FORCE_PROMPT_CACHING_5M`, then env `CLAUDE_CODE_PROMPT_CACHE_TTL`, then the setting `promptCacheTtl`, then the agent frontmatter, then `ENABLE_PROMPT_CACHING_1H`.

This agrees with design D8.

## Parse of env values (second pass)

- One truthy helper (12702038) takes `1`, `true`, `yes`, and `on`, and one falsy helper (12702180) takes `0`, `false`, `no`, and `off`.
- `DISABLE_COMPACT` (17111139) and `CLAUDE_CODE_ATTRIBUTION_HEADER` (16586634) use these helpers, so the snippet values work.
- `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` (19987637) and `CLAUDE_CODE_DISABLE_FAST_MODE` (15589292) read a parsed env object, whose parse is not verified.
- `CLAUDE_CODE_AUTO_CONNECT_IDE` (24764354) is compared with the boolean `false`.
  The env object `a` holds parsed values: readers compare booleans (`CLAUDE_CODE_FORK_SUBAGENT===!0`) and numbers (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS??20`, `CLAUDE_CODE_MAX_CONTEXT_TOKENS>0`), so a schema parses each value (inferred, the parse code is not read).

## Output style with `force-for-plugin`

- A plugin style loads with `forceForPlugin` (22888950), and a user or project style with that key is ignored with a warning (22887300).
- The resolver (22901250) returns the first forced plugin style and does not read `outputStyle`.
  With no forced style, it reads `outputStyle`, else `default` (22894241).
- The prompt path uses the resolver (24843080, 24850237), so the session gets the forced style.
- `/output-style` (35472900) prints the `outputStyle` setting or `default` (22901760), not the forced style.
  So with no `outputStyle`, it shows `default` while the forced style is active (inferred).
- The source of the value in the `/config` row (35418170) is not verified, so task 1.5 still needs the live check.
