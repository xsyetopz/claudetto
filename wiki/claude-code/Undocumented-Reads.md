# Undocumented reads

Claude Code documents most data that dotclaude uses.
A few reads use data that Claude Code does not document.
Claude Code can change or remove such data in any release, and it gives no notice.
This page lists each read, its source, what shows when the read breaks, and how to find a break.
The evidence is finding F4 in `research/audit-plugins.md` of the change `dotclaude-0-28-0`.

## What a break looks like

Each read fails closed.
A parser that does not know the shape returns `null`, and the part that needs the data does not show.
Most breaks are silent: the status line has no segment, or the figure is less exact.
Only the drift check is visible, and then only for a change that it knows to look for.
No read here blocks a tool call or changes a file.

## Summary

| Read | Used by | Source | Break |
| --- | --- | --- | --- |
| Credits segment | Status line | `cachedUsageUtilization` in `<config dir>/.claude.json`, key `cedar_ember` | The segment disappears. |
| `/context` scrape | Status line | The Markdown table that `/context` writes into the transcript | The breakdown shows only the free tokens, or a wrong `messages` figure. |
| Drift section ids | Drift check | The section ids of `prompt.compose` in the bundle of Claude Code 2.1.296 | A new id gives a line in the drift note at each session start. |
| Built-in plugin names | Drift check | Internal `cc-plugin-*@builtin` names in the bundle | A renamed plugin gives a false line or no line. |
| Tested version | Drift check | `TESTED_VERSION` in `features/drift/data.ts` | Another version gives a line at each session start. |
| Prompt and tool texts | Surface cuts | Hand copies of Claude Code texts | A changed text makes the cut do nothing. |
| Context margin | Status line | `CONTEXT_BLOCK_MARGIN` of 23,000 tokens, from the 2.1.296 bundle | The free-token figure is off. |

## The credits segment

The status line shows the count of reset credits that the user can spend, and the next expiry.
It also shows the weekly window of Fable from the same file.

- Source: the file `<config dir>/.claude.json`, key `cachedUsageUtilization`.
  The config dir is `CLAUDE_CONFIG_DIR`, or the home folder.
  The credits are in `utilization.cedar_ember`, and the Fable window is in `utilization.limits[]`.
- Code: `plugins/dotclaude/features/statusline/credits.ts`.
  The read opens the file one time for each status line run, and it keeps only these two parts.
- Evidence: the schema of the cache in Claude Code 2.1.296 has no `cedar_ember` key, but it passes unknown keys through.
  The grant fields (`resets_left`, `paused`, `usable_now`, `starts_at`, `ends_at`) are in the grant schema of the bundle.
  The first decoder of the shape was the one of CodexBar 0.69.0.
- Checks that the parser makes: `eligible` is `true`, `grants` is an array, and each counted grant is not paused, is `usable_now`, has `resets_left` above 0, and is inside its dates.
  A cache that is older than 1 hour (`CREDITS_MAX_AGE_MS`) counts as absent.

How it breaks at a Claude Code release:

| Change in Claude Code | Result |
| --- | --- |
| The key `cedar_ember` is renamed or removed | The credits segment does not show. |
| A grant field is renamed or its type changes | The grant does not count, and the segment shows fewer credits or none. |
| The cache moves to another file | The segment does not show. |
| The cache is written less often than every hour | The segment does not show most of the time. |
| `limits[]` changes its `kind` or `scope` shape | The Fable window does not show. |

A test pins the known shape with a fixture, and no test reads a real cache, so `just check` does not find a break in Claude Code.
To check by hand, read `cachedUsageUtilization` in your `.claude.json` and compare the keys with the list above.
The rate limits of the 5-hour and 7-day windows are not in this read.
They come from `rate_limits` in the status JSON, which Claude Code documents.

## The `/context` scrape

The status line shows an exact breakdown of the context (system, memory, and skills) only after the user ran `/context`.

- Source: `/context` writes its Markdown table into the transcript as a `user` record whose text starts with `## Context Usage`.
  Its rows come from the count-tokens API.
- Code: `plugins/dotclaude/features/statusline/context-table.ts`.
  Each status line run reads the last 1,000,000 bytes of the transcript (`TABLE_TAIL_BYTES_MAX`), keeps no state, and takes the newest table.
- The parser reads only the first table, with a regex for a row and a map of category names: `System prompt`, `System tools`, `Custom agents`, `Memory files`, and `Skills`.
  `System tools (deferred)` is not a part, because deferred tools are not in the context.
- A subagent record (`isSidechain`) is skipped.

How it breaks at a Claude Code release:

| Change in Claude Code | Result |
| --- | --- |
| The header `## Context Usage` changes | No table is found, and the breakdown shows only the free tokens. |
| Every category name changes | The same as above, because no row counts. |
| One category name changes | That part counts as 0 and the `messages` figure grows by the same size. The figure is wrong and nothing reports it. |
| The row format changes, such as the `k` suffix | The same as one changed name. |
| `/context` stops writing to the transcript | No table is found. |

The table is as old as the last `/context`, so the figure ages while the session goes on.
A documented source exists in the hooks module: `$.session.usage({ breakdown: "summary" })`, which the drift check uses.
The status line is a separate process and has no `$`, so it cannot use that call.
The audit gives this as the way to drop the scrape if the status line moves into the module.

## The drift section ids

The drift check reports a section in the system prompt that dotclaude does not know.

- Source: `ENGINE_SECTIONS` in `plugins/dotclaude/features/drift/data.ts`.
  It lists 33 section ids of Claude Code 2.1.296, such as `intro`, `tools`, `context_management`, `heron_brook`, `tengu_silent_harbor`, and `willow_tern`.
  The ids come from the section list in the bundle, because no document lists them.
  The ids after `memory` come only on some conditions, such as a flag, a model, or a deferred tool.
- Code: `unknownSections` in `features/drift/rules.ts` takes the ids from a `prompt.compose` call with the `bare` trait.
  An id with a colon belongs to a plugin, so it does not count.

How it breaks at a Claude Code release:

| Change in Claude Code | Result |
| --- | --- |
| A new section id | The note says that the system prompt has a section with an id that dotclaude does not know. The line comes at each session start until a maintainer adds the id. The model can pass it to you as noise. |
| An id is removed or renamed | No line for the removed id. A renamed id gives a line for the new name. |
| `prompt.compose` changes its result shape | The read fails, the fact gives no line, and the check goes on with the other facts. |

The line is a hint and not an error.
dotclaude keeps an unknown section as Claude Code made it.

A second list, `KNOWN_SECTIONS` in `features/prompt/select.ts`, holds the ids that a prompt variant replaces:
`intro`, `system`, `doing_tasks`, `actions`, `tools`, `tone`, and `lean_body`.
`composeSections` replaces only these ids, and passes any other id on unchanged.

| Change in Claude Code | Result |
| --- | --- |
| A replaced id is renamed | The old text stays next to the variant, and the drift note names the new id |

The same data file holds two more facts of this kind:

- `OFF_PLUGINS` lists 9 internal `cc-plugin-*@builtin` names.
  The check reports each one that your `enabledPlugins` does not set to `false`.
  A renamed plugin gives a line for the old name until the list changes.
- `TESTED_VERSION` is `2.1.296`.
  Any other version gives one line at each session start, and each Claude Code release needs a code change to stop it.
  A test pins the value to the schema file in `schemas/`.

## Other texts that follow Claude Code

These are not reads of stored data, but they depend on text that Claude Code does not document.

| Text | Code | Break |
| --- | --- | --- |
| The `Agent`, `Bash`, and `Read` tool descriptions | `features/surface/data.ts` (`TOOL_TEXT`) | A handler replaces a description only when its own text is shorter. A long new description from Claude Code is cut to the old copy, and a short one stays. |
| The `agent_listing_delta` sentence about parallel agents | `features/surface/rules.ts` | An exact string replacement. A changed sentence makes it do nothing. |
| The `Recent commits:` block of the `session_context` attachment | `features/surface/rules.ts` | A regex. A changed layout makes it do nothing. |
| The 23,000-token block margin | `lib/budget.ts` (`CONTEXT_BLOCK_MARGIN`) | The margin is the 20,000-token output reserve plus 3,000 tokens in the 2.1.296 bundle. A change moves the free-token figure. |
| Model names such as `haiku-5-5` and `opus-5-5` | `lib/model.ts`, `features/context/rules.ts`, `features/statusline/limits.ts` | A new model name takes the default subagent context bound. |

A cut that does nothing is silent by design: it passes the text on with no change.
The effect is only a larger request.
The lab tests in `plugins/dotclaude/tests/surface.test.ts` run the handlers with stubbed engine texts, so they do not see a change in the real text.

## What to do after a Claude Code update

1. Read the drift note in the first answer of a new session.
   The note goes to the model, and it tells the model to report the differences to you and to change no setting.
   It names a Claude Code version that is not the tested version, the built-in plugins that are on, the synced skills, the settings that stop the agent files, and the ids of the sections that dotclaude does not know.
2. If the status line lost the credits segment or the context breakdown, read the matching table above.
3. Report a break that you cannot fix in the issues of the repository, with the Claude Code version.

## Related pages

- [Status line](Status-Line)
- [Core plugin](Core-Plugin)
- [Hooks](Hooks)
- [Troubleshooting](Troubleshooting)
- [Claude mods](Claude-Mods)
