# Undocumented Reads

Claude Code documents most data that dotclaude uses.
A few reads use data that Claude Code does not document.
Claude Code can change or remove such data in any release, and it gives no notice.
Read this page if a status line segment or a setup line is missing after an update.

This page lists each read that the code of 1.0.0 makes.
For each read, it gives the code path, the fact in the Claude Code `2.1.296` binary, and what breaks when a later version changes the data.

## How the Binary Facts Were Found

The binary facts come from the bundle of `2.1.296`, which the extract in the git-ignored `external/cc-2.1.296/` folder holds.
The method searches that extract for each name and counts the hits.
A hit shows that the name is in the bundle.
It does not show how the name is used, so a name with hits can still be unused.

## What a Break Looks Like

Each read fails closed.
A parser that does not know the shape returns `null`, or `undefined`, and the part that needs the data does not show.
Most breaks are silent: a line of the drift note is missing, or a figure is less exact.
Only the drift check is visible, and then only for a change that it knows how to detect.
No read here blocks a tool call or changes a file.
The drift check changes no setting.

## Summary

| Read | Code | Break |
| --- | --- | --- |
| Drift section ids | `slices/setup/domain/facts.ts` and `domain/drift.ts` | A new id gives a line in the drift note at each session start. |
| Built-in plugin names | `slices/setup/domain/facts.ts` | A renamed plugin gives a line for the old name, or no line. |
| Tested version | `slices/setup/domain/facts.ts` | Another version gives a line at each session start. |
| Tool descriptions | `slices/surface/` | A longer description from Claude Code is replaced by the dotclaude text. |
| Model ids | `src/kernel/model.ts` | A new id shape gives a raw label in the status line. |
| Synced skills in the usage payload | `slices/setup/domain/drift.ts` | A renamed field gives no synced-skill line. |
| Override variables | `slices/setup/adapters/mod.ts` | A renamed variable gives no line about the agent files. |
| Mythos catalog file | `slices/setup/adapters/files.ts` | A new file name or shape gives `false`. |
| Account file `.claude.json` | `slices/setup/adapters/settings-cmd.ts` | A renamed key gives no organization id. |
| `auth status` output and rate limit tier | `slices/setup/adapters/account.ts` | Missing output leaves the account tier unknown. |
| Transcript records | `dotclaude-sessions` | A renamed record type or field counts as zero. |
| Plugin file `installed_plugins.json` | `slices/setup/adapters/settings-cmd.ts` | A renamed file hides the docs add-on line. |
| Sandbox token file | `dotclaude-lab` sandbox login | A renamed file starts the sandbox with no login. |

## Reads That the Code No Longer Makes

These reads were in earlier versions.
The code of 1.0.0 does not read them, so no break can reach them.

- The credits segment, which read the cache key of the account file.
- The `/context` scrape, which read the table that `/context` writes into the transcript.
- The exact-text cut of the sentence about parallel agents.
- The `Recent commits:` block of the `session_context` attachment.
- The context block margin, `CONTEXT_BLOCK_MARGIN` in `src/kernel/budget.ts`.
  The constant is defined, but no code reads it.

## Drift Section IDs

The drift check reports a section of the system prompt that dotclaude does not know.

- Code: `ENGINE_SECTIONS` in `src/plugins/dotclaude/slices/setup/domain/facts.ts` lists the known ids.
  `unknownSections` in `domain/drift.ts` compares the ids of the `prompt.compose` call with that list.
  The `setup` adapter in `adapters/mod.ts` makes the call with the `bare` trait.
  An id with a colon belongs to a plugin, so it does not count.
- Binary: five of the six ids that this run checked appear in the bundle.
  Those are `tengu_silent_harbor`, `willow_tern`, `bg-session`, `autonomy_append`, and `endconv_deferred_hint`.
  The sixth id, `heron_brook`, is found only inside longer names such as `tengu_heron_brook`.
  So it is not proven to be a section id.
  The search matches a substring, so a hit does not prove that the id is a section id.
  This run did not check the other ids of the list.
- Break: a new id gives a line in the drift note at each session start, until a maintainer adds the id.
  An id that is removed or renamed gives no line for the old name.
  If `prompt.compose` gives no sections, `unknownSections` gives an empty list, so no line appears.
  The line is a hint and not an error.
  dotclaude keeps an unknown section as Claude Code made it.

## Built-In Plugin Names

- Code: `OFF_PLUGINS` in `src/plugins/dotclaude/slices/setup/domain/facts.ts` lists nine internal names of the form `cc-plugin-*@builtin`.
  `pluginsOn` in `domain/drift.ts` reports each name that the settings do not set to `false`.
  The `prompt` slice writes the same names into the settings snippet, in `slices/prompt/slice.ts`.
- Binary: four of the nine names that this run checked appear in the bundle.
  Those are `cc-plugin-agents-md`, `cc-plugin-responsive-mode`, `cc-plugin-tips`, and `cc-plugin-you-should-know`.
- Break: a renamed plugin gives a line for the old name until the list changes.

## Tested Version

- Code: `TESTED_VERSION` in `src/plugins/dotclaude/slices/setup/domain/facts.ts` is `2.1.296`.
  `driftLines` in `domain/drift.ts` gives one line when the running version differs.
  A test in `tests/tools/claude-code-release.test.ts` pins the value to the version that the CI workflow installs.
- Binary: the extract is the `2.1.296` bundle.
  This run did not search the bundle for the version string itself.
- Break: another version gives one line at each session start.
  Each Claude Code release needs a code change to stop that line.

## Tool Descriptions

- Code: `slices/surface/transforms/Agent.ts`, `Bash.ts`, and `Read.ts` give the dotclaude text of each tool.
  The rule is in `slices/surface/domain/tools.ts`.
  The dotclaude text replaces the engine text only when the dotclaude text is shorter.
  The texts are in `slices/surface/texts.ts/`.
- Binary: this run did not check the tool descriptions in the bundle.
- Break: a longer description from Claude Code is replaced by the dotclaude text.
  So new guidance in it does not reach the model.
  A shorter description from Claude Code stays.
  The lab test in `slices/surface/lab/surface.test.ts` uses stubbed engine texts.
  So it cannot see a change in the real text.

## Model IDs

- Code: `parseModel` in `src/kernel/model.ts` reads the family, major version, and minor version from an id.
  The status line uses it in `slices/statusline/segments.ts` and `slices/statusline/adapters/subagents.ts`.
- Binary: the id `claude-haiku-5-5` appears 11 times in the bundle.
- Break: an id of another shape is not parsed.
  The subagent label then keeps the id as it is.

## Synced Skills in the Usage Payload

- Code: the `setup` adapter calls `$.session.usage({ breakdown: "summary" })` in `adapters/mod.ts`.
  `driftLines` reads the skill entries from `context.breakdown.skills.skillFrontmatter`.
  It counts the entries whose `source` is `SYNCED_SOURCE`, which is `syncedSkills` in `facts.ts`.
- Binary: `skillFrontmatter` appears 10 times in the bundle, and `syncedSkills` appears 25 times.
- Break: a renamed field or source gives no synced-skill line.

## Override Variables

- Code: the `setup` adapter reads `CLAUDE_CODE_EFFORT_LEVEL` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` with `$.env.get` in `adapters/mod.ts`.
  `OVERRIDE_ENV` in `facts.ts` lists them, and `driftLines` gives a line when you set either one.
- Binary: the two names appear 15 and 14 times in the bundle.
  This run did not check whether the Claude Code documentation names them.
- Break: a renamed variable gives no line about the `model` and `effort` of the agent files.

## Mythos Catalog File

- Code: `mythosInCatalog` in `slices/setup/adapters/files.ts` reads the file, and `mythosOffered` in `slices/setup/domain/settings.ts` checks it.
  The path is `<config dir>/cache/model-catalog/<organizationUuid>-<hash>-<surface>.json`.
  The `setup` adapter in `adapters/settings-cmd.ts` passes the result to the settings plan as `mythos`.
- Binary: `model-catalog` appears 22 times in the bundle, and `isMythosAvailable` appears 2 times.
  The shape of the file is inference from the bundle name.
- Break: another file name or another shape gives `mythos` as `false`.
  The plan then treats the Mythos model as not offered.

## Account File and the Organization ID

- Code: `settings-cmd.ts` reads `.claude.json` in `CLAUDE_CONFIG_DIR`, or in the home folder when the variable is not set.
  It takes the `organizationUuid` of the `oauthAccount` key.
- Binary: `oauthAccount` appears 22 times in the bundle, and `organizationUuid` appears 73 times.
- Break: a renamed key gives no organization id.
  The path of the Mythos file then does not exist, so the check gives `false`.

## Account Tier and the Rate Limit Tier

- Code: `slices/setup/adapters/account.ts` runs `claude auth status --json` and reads `subscriptionType` and `loggedIn` from its output.
  It reads the tier from the environment variable `CLAUDE_CODE_RATE_LIMIT_TIER`.
  It never reads the credentials file.
  `accountOf` in `slices/setup/domain/tiers.ts` builds the account from both.
- Binary: `auth status` appears 18 times, `subscriptionType` 28 times, and `CLAUDE_CODE_RATE_LIMIT_TIER` 7 times.
  The variable is also in the table of names that the bundle maps to its settings.
- Break: missing output, or a renamed field, leaves the subscription type unknown.
  The tier picks of `setup` then have no account data.
  The rate limit tier comes only from the variable, so a renamed variable removes it.

## Transcript Records

The add-on `dotclaude-sessions` reads the transcripts in `<config dir>/projects/<folder>/<session>.jsonl`.
The readers are in `slices/start-cost/domain/` and `slices/usage/domain/`.

- Code: the `start-cost` slice reads the `attachment.type` of each record in `domain/sources.ts`.
  It reads these types: `prompt_snapshot`, `skill_listing`, `agent_listing_delta`, `deferred_tools_delta`, `instructions`, and the output style.
  The `prompt_snapshot` record holds `systemBlocks` and the tool schemas, which `domain/first.ts` reads.
  The `usage` slice reads `message.usage` in `domain/runs.ts`.
  The `start-cost` slice reads it in `domain/transcript.ts`.
  The fields are `input_tokens`, `cache_read_input_tokens`, and `cache_creation_input_tokens`.
- Binary: `prompt_snapshot` appears 19 times, `skill_listing` 11 times, `agent_listing_delta` 9 times, `deferred_tools_delta` 17 times, and `systemBlocks` 4 times.
  `cache_read_input_tokens` appears 70 times.
- Break: a renamed record type gives no item for that source.
  A renamed usage field counts as zero, so the usage report shows less than the request sent.
  The `agent_listing_delta` type is a transcript record.
  It is a different read from the sentence of the `Agent` tool that the core plugin no longer uses.

## Plugin File and the Docs Add-On

- Code: `settings-cmd.ts` reads `<config dir>/plugins/installed_plugins.json` in `hasDocsAddon`.
  When the add-on is present, the setup output adds its lines.
- Binary: `installed_plugins` appears 60 times in the bundle.
- Break: a renamed file hides the lines of the docs add-on in the setup output.

## Sandbox Token File

- Code: `dotclaude-lab` reads the token of the account in `loginToken` in `slices/sandbox/adapters/login.ts`.
  It tries three sources in this order:
  1. The variable `CLAUDE_CODE_OAUTH_TOKEN`.
  2. On macOS, the Keychain entry `Claude Code-credentials`.
  3. The file `.credentials.json` in the `.claude` folder of the home directory.
  The file path comes from the home directory, not from the config dir.
  The sandbox run receives the token.
- Binary: `.credentials.json` appears 11 times in the `2.1.296` strings.
  The count comes from `grep -o` on `external/cc-2.1.296/strings.txt`.
  The Keychain entry name does not appear in those strings.
- Break: a renamed file or a renamed Keychain entry starts the sandbox run with no login.
  This read is in the lab add-on, and it runs only in the lab sandbox command.

## What to Do After a Claude Code Update

1. Read the drift note in the first answer of a new session.
   The note goes to the model.
   It tells the model to report the differences to you and to change no setting.
   It names:
   - a Claude Code version that is not the tested version,
   - the built-in plugins that are on,
   - the synced skills,
   - the settings that stop the agent files,
   - the ids of the sections that dotclaude does not know.
2. If the setup output lost the Mythos line or the docs add-on line, read the matching section above.
3. Report a break that you cannot fix in the issues of the repository, with the Claude Code version.

## Related Pages

- [Status Line](Status-Line)
- [Core Plugin](Architecture)
- [Drift Check](https://github.com/xsyetopz/claudetto/blob/dotclaude--v1.0.0/wiki/dotclaude/Architecture.md#drift-check)
- [Hook Events](Hook-Events)
- [Troubleshooting](Troubleshooting)
- [Request Build](Request-Build)
