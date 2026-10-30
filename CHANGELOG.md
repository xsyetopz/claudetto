# Changelog

This file records the notable changes to this project.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Before 1.0.0, a release can change or remove behavior.
After each update, do the steps in the "Update" section of the README.

## [0.0.0] - 2026-10-30

### Changed

- **BREAKING**: every manifest declares `0.0.0`, which restarts the numbering (the user, 2026-10-30).
  The tree is a rebuild on `src` slices with the old tree in `archive/`, the project wiki is deleted, and all 21 release tags are deleted, so the old numbering described a tree that no longer ships.
  The six release sections of that numbering are removed from this file with the `## Older Releases` table, whose 30 links pointed at the deleted wiki.
  Their record stays in the git history and under `archive/`.
- **BREAKING**: a `classic.PermissionRequest` whose input has no gated key is passed on with no `allow`, so a person sees the prompt (task 3.2, spec `permission-policy`, "Fail Closed").
  Before, `onPermission` answered `allow` for every such input, which approved each `WebFetch`, each MCP call, and each `Skill` call that reached the prompt, none of which any rule of ours had read.
  The gated keys are `command`, `file_path`, `notebook_path`, `path`, `pattern`, and `glob` (`plugins/claudetto/src/gate/gate.ts:55`), so a `Bash`, `Read`, `Edit`, `Write`, `Glob`, `Grep`, or `Monitor` call still gets the verdict of the gate.
  `tool.check` is unchanged, so allow-by-default still holds for a call that no rule of ours matches.
- A handoff that Claude wrote itself is kept, and the code-built file steps aside (task 2.3a).
  `classic.SessionEnd` and `classic.PreCompact` now skip the code-built write when the session's own transcript holds a write of `.claude/claudetto/handoffs/handoff-<UTC stamp>.md` and that file holds the nine headings of `written.ts`.
  The `context_management` text of the handoff state names the folder and the nine headings, which is the only place the model learns them, because neither hook makes a model call.
  The read-back says who wrote the file, so the resume no longer tells the model that code built a file Claude wrote.
  The always-loaded text grows by 405 bytes (`docs/prompt/footprint.md`, Table A). The stated total afterwards was 18,000 bytes, and task 9.7 then corrected it to 15,643.
- Jev is a tool the model calls, and it no longer answers an `AskUserQuestion` dialog (the user, 2026-10-27: "Jev's restart becomes a separate agent-accessible decision API, rather than overriding user's needed AskUserQuestion and not letting user choose").
  With the option `decide` set to `jev` and a key set, `session.start` registers `mcp__claudetto__decide`, and the model calls it for a decision that is its own.
  An `AskUserQuestion` dialog now always reaches the user, whatever the option.
  The reply holds one line per question, the pick with its confidence or the line that Jev is not sure, in place of the all-or-nothing answer the dialog needed.
  The rule `jev.ask` is replaced by `jev.decide` and `jev.decide-register`.

### Added

- A handoff holds no secret: a key, a token, or a value after a sensitive name is written as `[REDACTED]` (task 2.10).
  `redact` runs over the text of each user message, so the list of the user's values is clean, and over the whole assembled file, so a secret in a tool call or its result goes as well. The code-compacted head takes the same pass, because it stays in the context of each later resume.
  Each pattern is transcribed from the detector table of Claude Code `2.1.312` in `chunk-45pm9m17.js`: 41 key formats, the private key block, the 4 loose formats, and the 2 assignment entries. None is written from memory.
  The values of the credential env vars of the session are not covered, because the hooks runtime refuses a `$.env.get` call whose name is not a literal, so no mod can read the env by a computed name.
- A call that auto mode denied twice is denied at `tool.check`, before the classifier, with the reason of the earlier denial and the rule that would allow it (task 10.4).
  `classic.PermissionDenied` counts each denial per call signature in one `$.state` value, so the main loop and each subagent count the same call together, and the hook answers `retry: true` only while the count is under the bound.
  The event cannot send text to the model, so the text reaches it in the deny: it says to stop and report, and it names `"Bash(<command>)"` or the bare tool name for `permissions.allow`, with no hint to work around the denial.
- `just validate` fails a page that tells a reader to run a recipe the `justfile` does not define, through `tools/recipes.ts`.
  Nothing compared a documented command against the `justfile`, which is how `CONTRIBUTING.md` kept naming `just bump` after that recipe and `tools/bump-version.ts` were removed.
  A name is read from a backticked span only, at the start of a command, because `just` inside a sentence is the English adverb and reading those spans reported 25 recipes that no page asks a reader to run.
  `RECORD_PAGES` holds `CHANGELOG.md`, `docs/test-diet.md`, and the 12 `docs/evidence/` pages that measured a removed harness, so a page that names a live recipe stays under the check.
- `just eval` runs the rule cases of the main agent body against their fixtures, through `tools/evals/cli.ts`.
  Plan mode is the default and costs nothing, and `--run` makes the paid calls, so the recipe matches the other paid tools.
- `just validate` fails when the four manifests that declare the version of this project disagree, through `tools/manifests.ts`.
  Nothing compared them: `tests/repo/manifests.test.ts` tests the `userConfig` options and the source paths, and `claude plugin validate` checks the shape of each file and not the value inside it, so the prose of `CONTRIBUTING.md` was the only rule and it named three of the four.
  `package.json` is the reference, the marketplace version is read from under `metadata`, and a manifest with no string `version` is a fault on its own.

### Fixed

- The Layout and Changelog sections of `CONTRIBUTING.md` described a tree that the slices replaced.
  They named the kernel in `kernel/`, one folder per module in `modules/`, the hooks module `hooks/register.ts`, and `tests/claudetto/<module>/`, and they told a contributor to change a version with `just bump`, whose recipe and `tools/bump-version.ts` are both gone.
  The four manifests that carry the version are named instead, and the merge into `main` is the release (commit `c74e4dc6`).
- About 20 pages under `docs/keep/` cited the pre-slice tree without the `archive/` prefix that their own other lines use, such as the `TOOL_BASH` source in `docs/keep/tools/Bash.txt`, which now reads `archive/plugins/claudetto/modules/session/prompt/prompts.ts:70`.
  78 distinct paths are prefixed, each one checked to be absent from the tree and present under `archive/` at the cited line.
  `tools/citations.ts` reads a backticked span only, and these sat in bare parentheses, so no check reported them.
- `docs/evidence/evals/evals.md` opens with the note that its harness is removed, because `just eval` exists again and the commands on the page take `--judge-model`, which `tools/evals/cli.ts` answers with exit 2.
- The `[Unreleased]` entry on the gated keys cited `modules/gate/domain/gate.ts:40`, and `GATED_KEYS` is at `plugins/claudetto/src/gate/gate.ts:55`.
  `tools/citations.ts` skips a path whose first segment is not an entry of the repo root, so a repo path written without its prefix was never resolved.
- A `head` or `tail` of two files, and any reader of a glob, are no longer denied as the wrong tool (task 13.2).
  The rule already exempted a `cat` of more than one file, because that "does what `Read` cannot", and `Read` likewise takes one literal path, so the exemption now covers the three programs and an operand the gate cannot resolve to one path.
  Over the 49 real denials of 2026-10-27 the denying parts fall from 62 to 53, and 6 of the 49 commands stop being denied (`docs/early-stops.md`).
- The soft turn bound of `claudetto:Hermes` is 40 in place of 30, which stopped a third of its runs before their work was done (task 13.2).
  The old number came from a single run of 8 calls. The 18 `Hermes` runs of 2026-10-27 pile up at 30, 31, 32, 33, 33, 33, and three of them say in their report that the bound is why sources stayed unread.
  40 is a quarter above the largest count, the method the other three bounds use, and that 33 is itself a capped count, so 40 is a floor.
- `Artemis.md` no longer tells the agent to fall back to `grep` in `Bash`, which its type does not have (task 13.3).
  One run reported "Bash is not available in this session" as a block, although nothing blocked it.
- The always-loaded total of `docs/prompt/footprint.md` counted 2,357 bytes that no request carried, and it is now 15,643 (task 9.7).
  `TOOL_WRITE` was 261 characters against a stock `Write` text of 240, and `tool.describe` keeps ours only while it is shorter, so the engine always kept its own text. The export, its entry in `TOOL_TEXTS`, and `Write` in the `DESCRIBED` list are gone.
  `TOOL_SEND_MESSAGE` moved to Table C, because the engine leaves `SendMessage` off the base prompt by default, so its 2,096 bytes load only through `ToolSearch`.
  `tests/repo/justification.test.ts` now fails for a Table A row whose export does not exist or whose stated size is not the measured one, which is the check that was missing.
- The lab cases of `plugins/claudetto/tests/tool.test.ts` compared each tool text against a stub of 4,000 characters, which every text beats, so they passed for a text the engine would never take.
  The case "Shorter Than Stock" holds the real `Description` length of each tool from the `cc-docs` route `prompts/tools`.
- The `compaction` option no longer describes `auto` as a pick "from the table", because no table exists.
  The code treats every value other than `built-in` and `code` as the handover path, so `auto` is `handover` today, and the description now says that.
  The same text stands in `plugins/claudetto/.claude-plugin/plugin.json` and in `OPTION_DESCRIPTION`.
- The heading title-caser keeps a lone capital letter, so a heading such as `The Rate, from A to B` stays as typed.
  It lowercased the `A` as the article, which changed the meaning of the heading it was tidying.
- The heading title-caser keeps a small word in lower case before a trailing numeral, so `Consequence for 5.3 and 5.5` and `The Instruction of 2026-10-27` stay as typed.
  It took the last word *with a letter* as the last word of the title, so a numeral at the end handed the capital to the `and` or the `of` before it.
  The last word is now the last word, whether or not it holds a letter, and the same holds for the first.
  Found on 2026-10-27, when the caser of the installed `0.4.0-alpha.2` rewrote `### Table A, the Pieces` of `docs/prompt/footprint.md` and broke `tests/repo/justification.test.ts`, which reads that heading.

### Removed

- The `work.reply-opening` rule is deleted (the user, 2026-10-27: "so these brittle hooks should not exist at all").
  It read the first sentence of every reply and blocked the stop when a judge called it filler, which cost a Jev call and sometimes a `claude-haiku-5-5` call on every reply.
  A transcript of `claude -p "say OK."` shows the model answered `OK.`, this rule blocked the stop, and the forced rewrite produced "Nothing to run, so here is the word you asked for: OK.", so the rule turned a correct reply into a narrated one.
- The missing-check rule of the `finish` slice is deleted, with `modules/work/finish/domain/verify.ts` (same ruling).
  It demanded a project check after an edit of any file that was not `.md` or `.mdx`, so an edit of a prose `.txt` file demanded `just check`.
  The unproven-tick note and the `work.box` deny keep the part that matters, that a ticked task box needs a passed check in the session.
- The heading rewriter of the `hygiene` slice is deleted, with `modules/session/hygiene/domain/headings.ts`.
  It rewrote the headings of each edited Markdown file to Chicago Title Case and wrote the file back, so a hook changed a file after the agent's own edit and the agent had to read it again.
  `HEADING_NOTE` keeps the convention on the reply side, where it writes nothing, and `gate.gh-title` still cases a `gh pr create` title.
- The repository makes no release tags, and the 21 old `<plugin>--v<version>` tags are deleted, because Claude Code installs and updates a plugin from the default branch and the `version` of its manifest (the user, 2026-10-27).
  The merge into `main` is the release.
  `just release`, `tools/release.ts`, and `tools/preflight.ts` are removed, and `just bump` no longer rewrites a compare link.
- The project wiki is deleted (the user, 2026-10-27).
  `src/wiki/`, `wiki/`, `tools/generate/`, `tools/wiki.ts`, `just generate`, and `just wiki` are removed, and `just check` no longer runs `generate --check`.
  The evidence pages are saved as `docs/evidence/`.
  `tools/thin-claims.ts` stays, with its glob moved from `src/wiki/**/*.md` to `docs/**/*.md`, because it is the check that stops a document citing an eval arm of fewer than `EVAL_MIN_RUNS_PER_ARM` runs and `just validate` still reads it.
- Three places named a version that the restart removes.
  `.github/ISSUE_TEMPLATE/bug_report.yml` asked a reporter for a version "for example `claudetto` 0.28.0", a number from the numbering before the previous restart.
  `docs/surfaces.md` and `plugins/claudetto/src/builtins.ts` named the installed `0.4.0-alpha.2` as what a reading ran against, and the date of the reading is the provenance that stays true, so the version is dropped and the date kept.
- `CONTRIBUTING.md` told a contributor to add an entry under `[Unreleased]`, and `.github/pull_request_template.md` asked for one, while this file has no such section between releases.
  Both now say to open the section above the newest release.
- Eight citations in six pages under `docs/keep/skills/` named a line of this file that holds something else, which the collapse above surfaced.
  The numbers had drifted as entries were added at the top, and `tools/citations.ts` reads whether a cited line exists and not whether it supports the sentence.
  Four of the eight also carried a claim the tree does not support: `commit.txt` and `commit-push-pr.txt` said setup installs a `commit-msg` hook and a `pre-push` hook of git, `init.txt` and `memory-types.txt` said `/claudetto:setup` writes a `CLAUDE.md`, and `claude-in-chrome.txt` said the repo ships its own browser plugin.
  Setup merges a settings snippet and installs no git hook, and the repo ships `claudetto` and `claudetto-you-should-know`.
  Each citation now names a file of this tree or of `archive/`, and the `drop` recommendation of the two commit pages rests on their listed cons, because the hook it named is not there.
