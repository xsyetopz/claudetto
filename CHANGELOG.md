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
  `classic.SessionEnd` and `classic.PreCompact` now skip the code-built write when a writing tool in the session's own transcript wrote a path under `.claude/claudetto/handoffs` (`wroteOwn`, `plugins/claudetto/src/handoff.ts:198`).
  The headings of the file are not read, so any write under that folder counts as Claude's own.
  The `context_management` text of the handoff state names the folder and the nine headings of `HANDOFF_SECTIONS` (`plugins/claudetto/src/handoff.ts:255`), which is the only place the model learns them, because neither hook makes a model call.
  The read-back says who wrote the file, so the resume no longer tells the model that code built a file Claude wrote.
- Jev is a tool the model calls, and it no longer answers an `AskUserQuestion` dialog (the user, 2026-10-27: "Jev's restart becomes a separate agent-accessible decision API, rather than overriding user's needed AskUserQuestion and not letting user choose").
  With the option `decide` set to `jev` and a key set, `session.start` registers `mcp__claudetto__decide`, and the model calls it for a decision that is its own.
  An `AskUserQuestion` dialog now always reaches the user, whatever the option.
  The reply holds one line per question, the pick with its confidence or the line that Jev is not sure, in place of the all-or-nothing answer the dialog needed.
  `session.start` declares the tool and `tool.call` serves it (`plugins/claudetto/src/register.ts:197`), with the names in `plugins/claudetto/src/jev/prompts.ts:8` and `:11`.

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
  `RECORD_PAGES` holds `CHANGELOG.md`, `docs/test-diet.md`, and `docs/evidence/stop-hook-eval.md`, which names `just sandbox`, so a page that names a live recipe stays under the check.
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
- The `compaction` option no longer describes `auto` as a pick "from the table", because no table exists.
  `pathOf` gives the code path only for an explicit `code`, so `auto`, an absent option, and an unoffered value all give the built-in path (`plugins/claudetto/src/compaction/compaction.ts:33`), and the description in `plugins/claudetto/.claude-plugin/plugin.json:31` now says `auto` is `built-in` today, with the probe that leaves it there.
- Six claims in this file named code that the restart had already removed, found by checking every path and identifier the `[0.0.0]` section asserts still exists.
  `HEADING_NOTE` and `gate.gh-title` are in no file of the tree, and `Chicago` is in none under `plugins/`, so the deleted heading rewriter has no replacement.
  `tools/thin-claims.ts` is gone and `just validate` does not run it, the nine-heading detection is `wroteOwn` and not a read of the file, `auto` resolves to `built-in` and not to `handover`, and `OPTION_DESCRIPTION` does not exist.
  The slice tree carries no dotted rule names at all, so `jev.ask`, `jev.decide`, and `jev.decide-register` named a registry of the old module tree, and the live names are cited instead.
  Four entries are removed with the code they described: the two on the heading title-caser, the one on the Table A total of `docs/prompt/footprint.md`, which that page no longer carries, and the one on the lab cases of `plugins/claudetto/tests/tool.test.ts`, which lives only under `archive/`.
  No check reads a backticked identifier, so `tools/citations.ts` reported none of these: it resolves a `path:line` span only.

### Removed

- 15 pages under `docs/evidence/` are deleted, which is every page whose producer the restart removed and that reads nothing of the Claude Code binary (the user, 2026-10-30: "old docs means nothing that 0.0.0 restart and recent claude code binary searches have").
  They are the seven `docs/evidence/evals/` pages, both `docs/evidence/handoff-cost/` pages, `docs/evidence/usage-evidence/part-2.md`, `builtin-comparisons.md`, `jev-images.md`, `prompt-size.md`, and `sandbox-run-0.2.0.md`.
  Their producers are the `claude plugin eval` harness, `just eval-stats`, `just eval-variant`, `just classifier-replay`, `just handoff-probe`, `just sandbox`, `tools/compare-builtins.ts`, and the `claudetto-codegraph` add-on, none of which is in the tree.
  The 13 pages that stay either have a live producer under `claudekit/` or `tools/`, or read the installed binary, as `redaction.md` reads `2.1.312` and `probes-2.1.301.md` reads `2.1.301`.
  `RECORD_PAGES` of `tools/recipes.ts` loses eleven entries with them, and `docs/evidence/evidence.md` is rebuilt as an index of what is left, with the six live pages it had never listed.
  15 links into the deleted pages lost their link and kept their text, and the numbers stay in the git history.
- The `work.reply-opening` rule is deleted (the user, 2026-10-27: "so these brittle hooks should not exist at all").
  It read the first sentence of every reply and blocked the stop when a judge called it filler, which cost a Jev call and sometimes a `claude-haiku-5-5` call on every reply.
  A transcript of `claude -p "say OK."` shows the model answered `OK.`, this rule blocked the stop, and the forced rewrite produced "Nothing to run, so here is the word you asked for: OK.", so the rule turned a correct reply into a narrated one.
- The missing-check rule of the `finish` slice is deleted, with `modules/work/finish/domain/verify.ts` (same ruling).
  It demanded a project check after an edit of any file that was not `.md` or `.mdx`, so an edit of a prose `.txt` file demanded `just check`.
  Nothing replaces it: the tree carries no unproven-tick note and no `work.box` deny, so no hook now asks for a passed check behind a ticked task box.
- The heading rewriter of the `hygiene` slice is deleted, with `modules/session/hygiene/domain/headings.ts`.
  It rewrote the headings of each edited Markdown file to Chicago Title Case and wrote the file back, so a hook changed a file after the agent's own edit and the agent had to read it again.
  Nothing replaces it, so the tree now carries no heading-case rule: `Chicago` appears in no file under `plugins/`, and `plugins/claudetto/output-styles/Concise.md` states no heading convention.
- The repository makes no release tags, and the 21 old `<plugin>--v<version>` tags are deleted, because Claude Code installs and updates a plugin from the default branch and the `version` of its manifest (the user, 2026-10-27).
  The merge into `main` is the release.
  `just release`, `tools/release.ts`, and `tools/preflight.ts` are removed, and `just bump` no longer rewrites a compare link.
- The project wiki is deleted (the user, 2026-10-27).
  `src/wiki/`, `wiki/`, `tools/generate/`, `tools/wiki.ts`, `just generate`, and `just wiki` are removed, and `just check` no longer runs `generate --check`.
  The evidence pages are saved as `docs/evidence/`.
  `tools/thin-claims.ts` goes with them, so no check now stops a page citing an eval arm of fewer than `EVAL_MIN_RUNS_PER_ARM` runs; the floor survives as the constant in `tools/limits.ts` and as `CITABLE_MIN_RUNS` (`claudekit/probe/plan/floor.ts:13`), which the paid probe prints.
- Three places named a version that the restart removes.
  `.github/ISSUE_TEMPLATE/bug_report.yml` asked a reporter for a version "for example `claudetto` 0.28.0", a number from the numbering before the previous restart.
  `docs/surfaces.md` and `plugins/claudetto/src/builtins.ts` named the installed `0.4.0-alpha.2` as what a reading ran against, and the date of the reading is the provenance that stays true, so the version is dropped and the date kept.
- `CONTRIBUTING.md` told a contributor to add an entry under `[Unreleased]`, and `.github/pull_request_template.md` asked for one, while this file has no such section between releases.
  Both now say to open the section above the newest release.
- Eight citations in six pages under `docs/keep/skills/` named a line of this file that holds something else, which the collapse above surfaced.
  The numbers had drifted as entries were added at the top, and `tools/citations.ts` reads whether a cited line exists and not whether it supports the sentence.
  Four of the eight also carried a claim the tree does not support: `commit.txt` and `commit-push-pr.txt` said setup installs a `commit-msg` hook and a `pre-push` hook of git, `init.txt` and `memory-types.txt` said `/claudetto:setup` writes a `CLAUDE.md`, and `claude-in-chrome.txt` said the repo ships its own browser plugin.
  Setup merges a settings snippet and installs no git hook, and the repo ships `claudetto` and `claudetto-you-should-know`.
  Each citation now names a file of this tree or of `archive/`, and the `drop` recommendation of the two commit pages rests on `docs/surfaces.md:3`, because the hook it named is not there.
  `docs/keep/skills/init.txt:12` is the same fault once more: it cited `README.md:117`, which is the `## Development` heading, for a claim that contradicted its own line 7. The main agent body does take its conventions from `@CLAUDE.md` (`plugins/claudetto/agents/main.md:23`), which is the real con, so the page now says that.
