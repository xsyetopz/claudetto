# Changelog

This file records the notable changes to this project.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Before 1.0.0, a release can change or remove behavior.
After each update, do the steps in the "Update" section of the README.

## [0.1.0] - 2026-10-31

### Added

- `/claudetto:setup` and `just setup` write `$schema`, the feature `env` flags, the five `/config` items (`workflowSizeGuideline`, `workflowKeywordTriggerEnabled`, `enableWorkflows`, `enableArtifact`, `remoteControlAtStartup`), and a deny of the six built-in agents, in the group "Features off" and the group "Smaller prompt".
  IDE auto-install is off through `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL`, so setup never writes `~/.claude.json`.
- `just setup` runs `openspec init --tools claude --profile core` when the `openspec` CLI is on `PATH` and the project has no `openspec/`. It prints `bun add -g @fission-ai/openspec` when the CLI is not on `PATH`, and skips when `openspec/` exists.
- Setup writes `statusLine` and `subagentStatusLine`, a launcher of `bin/claudetto-statusline` that picks the newest installed plugin version.
  The line shows the folder, the branch of a worktree session, the review state of the pull request, the model, the context, the cost, the 5-hour and 7-day limits, and the cache countdown, in up to four rows; a status line you already set is kept.
- `/init` runs an interview in place of the built-in text: it reads the repository and the memory files, asks with `AskUserQuestion` only what they do not show, and writes after a yes to the draft of each file. A skill of your own named `init` keeps its text.
- The agents `claudetto:Hephaestus`, which makes one edit and runs its check, and `claudetto:Hermes`, which answers a question from the web with its sources, each at `medium` effort.
- The `docs` skill looks up library docs through the Context7 CLI: `bunx ctx7 library`, then `bunx ctx7 docs`.
  Its listing costs 71 characters of the first request, against 907 for the Context7 MCP server.
- The optional `CONTEXT7_API_KEY` option, kept in secure storage, reaches `ctx7` through the env and never enters the context.
- `just hygiene` removes the temp folders and old handoffs that Claude Code never removes: probe folders past an hour, ended session folders past `cleanupPeriodDays`, and all but the newest handoff past `cleanupPeriodDays`. It takes `--dry-run`, and the same sweep runs at each startup.
- `/goal <cmd>` stores a shell command, and a stop is blocked while the command fails. A `tasks.md` of an applied change with an open box blocks a stop in the same way.
  After 5 blocked stops in a row with no file change the stop goes through, and the goal is marked blocked; `/goal resume` turns it back on, and the agent can pause or block a goal through the `goal` tool.
- A warning at startup, once, when the running Claude Code is older than `2.1.314`.
- The `plan-mode` block replaces the full plan mode reminder with a shorter one that names `claudetto:Artemis` for a search over many files.
  A plan mode first request of `2.1.314` falls from 50,205 to about 46,415 characters (`just capture` with `permissions.defaultMode` set to `plan`). The sparse reminder, and any engine text shorter than ours, is kept.
- The `classifier` option, `off` by default, judges each tool call that is not read-only with claudetto's own rule suite, from a `classic.PreToolUse` hook in `plugins/claudetto/src/blocks/classify/`.
  It asks Jev first when `TYPESAFE_API_KEY` is set and lets Jev decide alone only at a block probability of at most 0.05 or at least 0.95. Otherwise one call goes to `claude-haiku-5-5` at `high` (`haiku`) or `claude-sonnet-5-5` at `medium` (`sonnet`), with the rules in one cached system block.
  The judge reads the user's messages and the earlier tool calls, and no assistant prose or tool output, because the agent can argue for itself in both and an injected instruction reaches it through tool output.
  A failed call, a reply with no verdict, or a thrown error denies, because an unwatched session cannot answer a prompt.
  A probe on the fake Messages API showed that a hook answer of `allow`, `deny`, or `ask` sends zero requests to the built-in classifier for that call, so the option replaces the built-in classifier, not adds to it.
  It is off because every judged call is paid and no measured rows price it or compare it with the built-in classifier yet.

### Changed

- The compaction summary of the `cheapSummary` option runs on `claude-haiku-5-5` at effort `high`, and is held to 4,000 characters.
  The prompt used to set no length, so the reply ran to the token cap and ended mid-sentence; a longer reply is now cut at a line break.
- The side check of `claudetto-you-should-know` defaults to `high` effort, in place of `medium`.
- The first request shrinks by about 2,300 characters: `just capture --arm plugin --shipped` on `2.1.314` reads 31,237 against 33,515 for `0.0.0`, read from a shorter folder path, which lowers that reading. The session prompt, the `Concise` output style, five tool texts, the handoff reminder, and the agent and skill listings are shorter.
- Setup turns fast mode off with `CLAUDE_CODE_DISABLE_FAST_MODE=1` and leaves `EnterWorktree` and `ExitWorktree` allowed, so worktrees stay on.
- `/claudetto:setup` and `just setup` write claudetto's `autoMode` rule suite in place of the four built-in lists, in the dialog group now named "Sandbox and auto mode".
  The classifier A/B of `just eval --classifier --run` scored the suite 120 of 120 against 120 of 120 for the built-in lists, at about half the measured price per call, and 72 of 72 on the final text.
  The suite holds no fact of this repository, so the command no longer leaves `autoMode` out; `just setup` no longer writes this repository's `environment` facts.
  The fault check of `plugins/claudetto/src/automode/faults.ts` lets a list drop `$defaults` only when it is the measured suite list.

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
- The supported Claude Code version is `2.1.314`, up from `2.1.312` (the user, 2026-10-30: "if using 2.1.314 items, bump to minimum 2.1.314 for the plugin").
  `/claudetto:setup` rests on readings taken from the `2.1.314` docs: that a `command.run` hook answering `{ text }` answers in place of the command and that omitting `context` leaves the model nothing to read, and that `$.fs.write` writes "to a file, creating it and its directories as needed", so the command needs no `mkdir` where `setup.ts` does.
  `MIN_CLAUDE_CODE_VERSION`, the `ci` workflow, `README.md`, and `CONTRIBUTING.md` all declare it, and `just claude-version` moves them together.
- `README.md` is rewritten for the `0.0.0` tree, in the conventional order: Features, Requirements, Install, Setup, What the Core Plugin Changes, Plugins, Configuration, Handoff, Update, Development, License (the user, 2026-10-30: "conventional README.md").
  The requirements are now Claude Code and `git` alone, because setup runs inside Claude Code, and `bun` and `just` are named as development tools.
  A `settings.read` hook that would answer the settings in place of a file was built and dropped on a measurement: `just capture --arm plugin` read 61,353 characters and 12 tool schemas with the hook and no settings file, against 31,861 and 9 with the file, and the engine logged `an answer without deniedMcpServers: unset for the reader`, so the readers that build the first request do not take its answer.
  A plugin's own `settings` key reaches only `agent` and `subagentStatusLine`, so a real settings file is the one measured way to deliver permissions, environment variables, and models.
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

- `/claudetto:setup` writes the settings from inside Claude Code, so setup needs no checkout of this repository, no `bun`, and no `just` (the user, 2026-10-30: "it will ask what to keep, meaning the rest get discarded, upon lightweight setup command").
  It asks which of the three groups of `plugins/claudetto/src/tiers/groups.ts` to keep, through one `$.ui.ask` dialog, and writes only those keys: a group discarded writes none of its keys, and a value already set keeps the user's value.
  The keys are grouped because `$.ui.ask` takes two to four option labels and the snippet sets 13 top-level keys; `permissions.deny` sits with the two `builtinSnippet` switches in one group because `snippet.ts` ships it only with them.
  The command writes no `autoMode`, whatever the answer, because `autoMode.environment` is the readings of this repository (`plugins/claudetto/src/automode/environment.ts:1`, "the `autoMode.environment` facts of this project"): the `xsyetopz` remote, `plugins/claudetto/` as the product, and one macOS workstation.
  The auto-mode classifier reads those as the environment of whoever holds the settings file and decides from them whether a command runs without asking, so writing them into a stranger's settings would feed a permission decision facts that are false for that machine.
  Nothing measured is lost: the `allow`, `soft_deny`, and `hard_deny` lists are `$defaults` alone, and keeping all three groups reads the same 31,959 characters as the full snippet, because the classifier reads the key later and not in the first request.
  `just setup` still writes it, because it runs inside this checkout, and `tools/capture/settings.ts` now measures what the command writes rather than what `just setup` writes, since the figures are quoted in `README.md`.
  A `command.run` hook answers the command in code and returns `text` with no `context`, so the person reads the report and the model reads nothing of it: running it costs the session no tokens.
  That is measured and not reasoned: a `claude -p "/claudetto:setup"` run with `ANTHROPIC_BASE_URL` on the fake Messages API of `claudekit/api/fake.ts`, a throwaway `CLAUDE_CONFIG_DIR`, and `--plugin-dir` exited `0`, printed `claudetto: Nothing was chosen, so nothing was written.`, and left the fake API with zero requests on the messages route.
  The same run shows the headless path is safe: `$.ui.ask` rejects where there is no one to ask, and the hook answers that rejection with a line of its own rather than throwing, because a hook that throws is skipped and the body of `commands/setup.md` would go to the model as a prompt.
  What it does cost is its row in the command listing. `just capture --arm plugin --shipped` read 31,909 characters against 31,861 with no command, so the row is 48 characters, all in `messages`, and the description in `commands/setup.md` is one short sentence because the first wording of it read 31,961.
  A hook that throws is skipped, which would send the body of `commands/setup.md` to the model as a prompt, so a failed read or write is reported in `text` instead.
  `just setup` is unchanged and still does the same work from a checkout.
- Setup writes a `permissions.allow` list, which it had never written, so a read-only `git` call runs with no prompt and never reaches the auto-mode classifier (spec `low-hitl`, "Use Narrow Allow Rules" and "Settle Safe Calls before the Classifier").
  The list is `Bash(git status *)`, `Bash(git diff)`, `Bash(git log)`, and `Bash(git show)` in `plugins/claudetto/src/tiers/allow.ts`, and it costs the first request nothing, because settings are not prompt text: the arm reads 31,959 with the list and without it.
  Only `git status` takes the wildcard form, which "also matches the bare command" (`configure/permissions/rules`, `2.1.314`). The other three are the bare form, which holds no `*` and matches that text alone, because each takes `--output=<file>` and writes that file: in this checkout `git diff --output=F HEAD~1`, `git log -1 --output=F`, and `git show --output=F HEAD` each exited `0` and left `F` on disk, where `git status --output=F` exited `129` and wrote nothing.
  A rule cannot exclude a flag, so a wildcard over those three would pre-approve an arbitrary file write, which is not the read-only permission the list claims to grant. The cost is a prompt for a `git diff` that carries arguments.
  `git branch` is left out because it creates, renames, and deletes branches, and a package manager, an interpreter, and a test runner are left out because each runs code and no such rule is true of every machine.
  Two checks guard the list and are the "setup refuses a broad one" the spec asks for: `broadRules` catches a bare tool name, content of only wildcards, and a wildcard inside the first word of a `Bash` command, and `flagOpenRules` catches a wildcard over a command that is not known to refuse a file-writing flag. On a fault `tierSnippet` omits the `allow` key and `snippetFaults` names the rule, the way `autoMode` and `sandbox` faults are reported and never repaired.
  A user who already has an `allow` list keeps it whole and the report lists it as skipped, because `applyTier` never merges into a value the user set.
- `just window-report` prints the cost per rate-limit window, which `window/report.ts` could compose and no command reached (spec `window-budget`).
  `tools/window-report.ts` reads the store and prints `reportText`, one line per task and then the weight line.
  `weightOf` now refuses a number below `WEIGHT_MIN_ROWS` rows and reports "not measured" instead, on each side of the reading, because one row gave a confident-looking figure before.
  The floor is `2`, in `plugins/claudetto/src/window/limits.ts`, and it is the smallest value above a single reading: no source says how the whole-number lag of the window percentages spreads over rows, so `EVAL_MIN_RUNS_PER_ARM` was not borrowed for a different quantity.
  The constant sits with the plugin and not in `tools/limits.ts`, because the plugin ships without `tools/`.
- `tests/repo/prompt-budget.test.ts` holds the one byte budget that `specs/prompt-footprint/spec.md` fixes a number for, which nothing checked before: the body of `agents/main.md` against the 5,627 characters of the default body it replaces, failing with the piece, its size, and its budget as the spec asks.
  The budget is of the body after the frontmatter, because the frontmatter does not reach the prompt: the body is 5,574 characters where the whole file is 5,648, and `just capture --arm plugin --shipped` reads `system[2]` as 5,572 against 5,818 for `--arm plain`, so the replacement is a net 246 characters.
  No budget is invented for the other three pieces, since the spec records that no value is derived for them yet.
- `just claude-version` prints the supported Claude Code version with every line that declares it, and a version argument moves all of them (`just claude-version 2.1.315`).
  `tools/claude-version.ts` holds a fixed table of the four declaring sites and fails when a row does not match exactly once, rather than searching the tree, because the version also appears in readings such as "read against `2.1.312`" and rewriting one of those would claim a reading nobody took.
- A handoff holds no secret: a key, a token, or a value after a sensitive name is written as `[REDACTED]` (task 2.10).
  `redact` runs over the text of each user message, so the list of the user's values is clean, and over the whole assembled file, so a secret in a tool call or its result goes as well. The code-compacted head takes the same pass, because it stays in the context of each later resume.
  Each pattern is transcribed from the detector table of Claude Code `2.1.312` in `chunk-45pm9m17.js`: 41 key formats, the private key block, the 4 loose formats, and the 2 assignment entries. None is written from memory.
  The values of the credential env vars of the session are not covered, because the hooks runtime refuses a `$.env.get` call whose name is not a literal, so no mod can read the env by a computed name.
- A call that auto mode denied twice is denied at `tool.check`, before the classifier, with the reason of the earlier denial and the rule that would allow it (task 10.4).
  `classic.PermissionDenied` counts each denial per call signature in one `$.state` value, so the main loop and each subagent count the same call together, and the hook answers `retry: true` only while the count is under the bound.
  The event cannot send text to the model, so the text reaches it in the deny: it says to stop and report, and it names `"Bash(<command>)"` or the bare tool name for `permissions.allow`, with no hint to work around the denial.
- `docs/README.md` is an index of every page under `docs/`, with a link and one line each, grouped by folder, and a line that says what `docs/keep/` and `docs/dossier/` hold, because their names do not say it.
  It held three sentences and listed nothing, so the only way to find a page was to list the folder.
  Eighteen stale citations across seven pages are repaired with it: a path of the pre-restart tree now carries the `archive/` prefix at a line that was opened and checked, a path of a live file written without its prefix is spelled in full, and a sentence whose file is gone from both trees says what holds today instead of naming the file.
- `just eval` runs the rule cases of the main agent body against their fixtures, through `tools/evals/cli.ts`.
  Plan mode is the default and costs nothing, and `--run` makes the paid calls, so the recipe matches the other paid tools.
- `just validate` fails when the four manifests that declare the version of this project disagree, through `tools/manifests.ts`.
  Nothing compared them: `tests/repo/manifests.test.ts` tests the `userConfig` options and the source paths, and `claude plugin validate` checks the shape of each file and not the value inside it, so the prose of `CONTRIBUTING.md` was the only rule and it named three of the four.
  `package.json` is the reference, the marketplace version is read from under `metadata`, and a manifest with no string `version` is a fault on its own.
- Each plugin ships a listing icon, so `claude plugin validate --profile directory` now passes both with no warning at all (the user, 2026-10-30: "if you want to give it an icon, fetch a royalty-free svg somewhere that fits the plugin's idea").
  They are 1024 by 1024 PNG files at `plugins/claudetto/.claude-plugin/icon.png` and `plugins/claudetto-you-should-know/.claude-plugin/icon.png`, which is what the developer portal asks for: a square PNG or JPEG of 512 to 2048 px under 2 MB, with neither SVG nor WebP accepted.
  That rule is the `fix` advice of the validator's `ICON_MISSING` warning and goes unchecked locally, because the check on an icon it finds compares magic bytes against the file's own extension and reads no dimensions at all.
  The glyphs are Lucide `gauge` for the core plugin, whose thesis is that every value ships with its measurement, and Lucide `lightbulb` for the add-on, which raises one note.
  Lucide is ISC-licensed, which asks that the notice travel with the copies, so `docs/keep/lucide/` vendors the licence, the two glyphs as downloaded, the two composed sources, and the `rsvg-convert` commands that render them.
  Nothing of either drawing is redrawn: the composed file adds a `#17181a` square, a `#f2f2f2` stroke in place of `currentColor`, and a transform that centres the glyph at 640 px with a 192 px margin.
  Replacing either file later changes nothing in a catalogue: the same check states that the file "may become the listing icon only once: the first time the plugin is saved or submitted in the developer portal".

### Fixed

- The handoff that Claude writes is now told to redact a secret, which only the handoff that the hooks build was (spec `session-handoff`).
  `redact` runs over the file `handoff.ts` composes, so a key in a transcript never reached that file, while the nudge on `prompt.context` asked Claude for nine sections and said nothing about a secret, and a handoff is read back into every later session, so a key copied into one is read again each time.
  The line is "Write `[REDACTED]` in place of a key or a token", 48 characters, and `just capture --arm plugin --shipped` reads 31,959 against 31,909 without it, all 50 on the wire in `messages`, carried in the `handoff context` row of `plugins/claudetto/src/cuts.ts`.
- The deny list that setup writes is now behind its own guard at run time, which it was the only trimming key not to be (spec `surface-trim`, "No Deny for a Tool Whose Removal Raises the Request").
  `denyFaults` was called from `plugins/claudetto/src/__tests__/deny.spec.ts` and from nowhere else, so a name whose removal raises the request failed the test suite and would still have been written into a settings file by a build that skipped the tests.
  `snippetFaults` now reports it and `tierSnippet` omits the `deny` key on a fault, the way the `allow`, `autoMode`, and `sandbox` keys already behaved.
  The shared `cleanBlock` holds that one rule, "write the block when nothing faults it and no key at all when something does", so the rule is pinned by a test for both the clean and the faulted case rather than repeated in four places.
- A call the permission gate denies now tells the model to stop and report, with the rule that denied it (spec `permission-policy`, "Denied Calls Stop").
  That text existed only for a repeat auto-mode denial, so a direct gate denial said nothing and the model was free to retry or work around it.
  `stoppedText` wraps a gate denial in the new `DENY_GATED`, and both hook paths use it, `onCheck` and `onPermission` (`plugins/claudetto/src/gate/hooks.ts`).
  It names the gate's own rule and not an allow rule to add, because no `permissions.allow` rule lifts a denial of this gate.
  A denial the engine itself made still carries the engine's reason, since it is not ours to explain.
- The budget line no longer rides every prompt.
  `onSubmitBudget` added `Budget: context 62% left, five-hour 23.5% used, seven-day 41% used` to the `context` of every `prompt.submit` whenever the engine had usage to read, and the context figure moves every turn, so the line was paid for on every turn of every session.
  `specs/prompt-footprint/spec.md` forbids exactly that ("No Per-Message Injection": "The system MUST NOT add text on every user message"), and its Quiet Turn scenario asks for no text while the bands have not changed, so `budgetBand` now cuts each of the three readings to a step of 10 percent and the hook speaks only when that band differs from the one it last spoke for.
  The band is kept in `$.state` through `changeLedger`, as the other counts of `run-limits/` are, so two prompts submitted together cannot both read the old band and both speak.
  The exact percentages stay in the text: the band decides whether to speak, not what to say.
- `DEFAULT_EFFORT` of `claudetto-you-should-know` was `high` while the manifest declared `medium`, and both cited the same row of `docs/models.md:15`, which says `medium`.
  A `default` in the manifest reaches the hook as the option's value, so the code fallback never fired and the constant described a default nobody got.
  The constant is `medium` now, and `tests/repo/manifests.test.ts` pins the declared default, the declared model, and the declared effort list against the code, because nothing compared them before.
- `src/automode/automode.ts` and `src/sandbox/sandbox.ts` each imported `node:path`, which a hooks module has not got, so the first hook file to reach either of them stopped the whole module from loading: 125 of the 133 lab tests failed at once with `cannot import "node:path"`.
  Both held a byte-identical `join(configDir, "settings.json")`, and that one function now lives in `plugins/claudetto/src/settings-file.ts` as plain string work.
  Nothing caught this before, because no file the hooks module loaded had imported them yet.
- The Layout and Changelog sections of `CONTRIBUTING.md` described a tree that the slices replaced.
  They named the kernel in `kernel/`, one folder per module in `modules/`, the hooks module `hooks/register.ts`, and `tests/claudetto/<module>/`, and they told a contributor to change a version with `just bump`, whose recipe and `tools/bump-version.ts` are both gone.
  The four manifests that carry the version are named instead, and the merge into `main` is the release (commit `c74e4dc6`).
- About 20 pages under `docs/keep/` cited the pre-slice tree without the `archive/` prefix that their own other lines use, such as the `TOOL_BASH` source in `docs/keep/tools/Bash.txt`, which now reads `archive/plugins/claudetto/modules/session/prompt/prompts.ts:70`.
  78 distinct paths are prefixed, each one checked to be absent from the tree and present under `archive/` at the cited line.
  `tools/citations.ts`, which the Removed section of this release deletes, read a backticked span only, and these sat in bare parentheses, so no check reported them.
- The `[Unreleased]` entry on the gated keys cited `modules/gate/domain/gate.ts:40`, and `GATED_KEYS` is at `plugins/claudetto/src/gate/gate.ts:55`.
  `tools/citations.ts` skipped a path whose first segment is not an entry of the repo root, so a repo path written without its prefix was never resolved.
- A `head` or `tail` of two files, and any reader of a glob, are no longer denied as the wrong tool (task 13.2).
  The rule already exempted a `cat` of more than one file, because that "does what `Read` cannot", and `Read` likewise takes one literal path, so the exemption now covers the three programs and an operand the gate cannot resolve to one path.
  Over the 49 real denials of 2026-10-27 the denying parts fall from 62 to 53, and 6 of the 49 commands stop being denied (`docs/early-stops.md`).
- The soft turn bound of `claudetto:Hermes` is 40 in place of 30, which stopped a third of its runs before their work was done (task 13.2).
  The old number came from a single run of 8 calls. The 18 `Hermes` runs of 2026-10-27 pile up at 30, 31, 32, 33, 33, 33, and three of them say in their report that the bound is why sources stayed unread.
  40 is a quarter above the largest count, the method the other three bounds use, and that 33 is itself a capped count, so 40 is a floor.
- `Artemis.md` no longer tells the agent to fall back to `grep` in `Bash`, which its type does not have (task 13.3).
  One run reported "Bash is not available in this session" as a block, although nothing blocked it.
- Seven claims in this file named code that the restart had already removed, found by checking every path and identifier the `[0.0.0]` section asserts still exists.
  `HEADING_NOTE` and `gate.gh-title` are in no file of the tree, and `Chicago` is in none under `plugins/`, so the deleted heading rewriter has no replacement.
  `tools/thin-claims.ts` is gone and `just validate` does not run it, the nine-heading detection is `wroteOwn` and not a read of the file, `auto` resolves to `built-in` and not to `handover`, and `OPTION_DESCRIPTION` does not exist.
  The slice tree carries no dotted rule names at all, so `jev.ask`, `jev.decide`, and `jev.decide-register` named a registry of the old module tree, and the live names are cited instead.
  Five entries are removed with the code they described: the two on the heading title-caser, the one on the Table A total of `docs/prompt/footprint.md`, which that page no longer carries, the one on the lab cases of `plugins/claudetto/tests/tool.test.ts`, which lives only under `archive/`, and the one on the wording of the `compaction` option, which named `plugins/claudetto/src/compaction/compaction.ts:33` in a deleted file and `plugin.json:31`, a line that is now the `cheapSummary` description, while the Removed section already records that the whole option is gone.
  No check read a backticked identifier, so `tools/citations.ts` reported none of these: it resolved a `path:line` span only, and this release deletes it.
- The report of `/claudetto:setup` no longer opens with a plan tier, which was always the wrong one.
  It printed `Tier: claude_pro.` to every user, because a hooks module cannot reach `.claude.json` to read the login and the command composes from `SNIPPET_ROW`, whichever row that constant names.
  `tierReport` now takes the tier as `string | undefined` and prints no line for `undefined`, which is what the hook passes; `just setup` reads the login itself and still prints its own tier.
  Two cases of `tests/claudetto/tier/hooks.test.ts` hold `setupReport` to printing neither a `Tier:` line nor the tier of `SNIPPET_ROW` for any choice of groups, so the line cannot come back unnoticed.
- Setup now says what a discarded group would have done, which nothing read before.
  `KeyGroup.why` held one line for each of the three groups and no caller used it: the dialog of `$.ui.ask` shows labels with no descriptions, and a kept group is spelled out by the `Wrote` line of each of its keys, so a person who declined a group was told only its name.
  Each discarded line now carries it, and it costs no tokens, because the hook answers with `text` and no `context`.
  Two more cases of `tests/claudetto/tier/hooks.test.ts` hold every discarded group's `why` in the report and hold a kept group out of the discarded lines.
- Three gaps in the checks are closed, each of which let a shipped behavior change without a failure.
  `tests/claudetto/tiers.test.ts` now holds the guard that `tiers.ts:117` claimed was there and was not: every row of `TIERS` must give the snippet of `SNIPPET_ROW`, which is what makes the `command.run` hook safe to compose from one row while it cannot read the plan.
  `plugins/claudetto/tests/setup-command.test.ts` now answers the dialog instead of testing only the "nobody to ask" path, through a `tool.call` stub on `AskUserQuestion` keyed on the question the engine passed, and asserts the written path and the written keys.
  `plugins/claudetto-you-should-know/tests/call.test.ts` now covers the `none` reply, which opens no offer, and holds the plugin to `$.model.complete`: an answer is put beneath `model.fork` so that a fork would be recorded, rather than left out, because a missing answer throws and the check's own catch would swallow it.
- `docs/types.md` claimed the vendored types came from the version in `MIN_CLAUDE_CODE_VERSION`, which stopped being true when the minimum moved to `2.1.314`.
  The types on this machine were written by `2.1.312` and the engine rewrites that folder itself, so the two numbers are allowed to differ and the page now says so with the reason: `2.1.314` adds only the call `$.ui.place` and the event `ui.place` to the surface, and nothing here calls either.
  The page is not in the table of `tools/claude-version.ts`, which is why it drifted unchecked, and it stays out of it, because the version that wrote the declarations is not the version this project supports.
- `BARS` of `claudekit/probe/round/verdict.ts` scored two bars that the page defining the bars did not list, which that page asks never to happen ("so that a page of `docs/` and the requirement \"Decision Rule\" of `specs/compaction-path/spec.md` name the same list").
  `skipped` and `turns` were scored in code and absent from the table of `docs/evidence/code-compaction-probe.md`, "The Bars"; both rows are added there.
  The file's own header said it "reads them from there", which no code did, so it now says the list is transcribed and why nothing parses the Markdown at run time: a probe round must decide with no `docs/` read.
  Two cases in `claudekit/probe/round/__tests__/verdict.spec.ts` hold the two lists against each other in both directions, so the next bar added to either side fails the gate.
- Two of the new lab cases of `plugins/claudetto/tests/setup-command.test.ts` passed without driving what they named, found by a review of the commit that added them.
  "a run that writes a file still leaves the model nothing to read" asserted `out.context` alone and threw its writes away, which holds on the "nobody to ask" path too, so it would have passed with the dialog stub never reached; it now asserts the write as well, and a stub keyed on the wrong question makes it fail.
  "an answer naming no offered group writes nothing" asserted no write and the "Nothing was chosen" text, which the command prints for an unanswered dialog and for an unoffered answer alike, so neither assertion could tell the filter from a stub that never ran; it now holds the dialog itself, that it was raised once and that the label it answered with is not among the labels offered.
  The helper collects each dialog rather than each question text, and one case holds that the dialog really offers the groups the report speaks of.
- `docs/keep/lucide/README.md` and the icon entry of this changelog said `claude plugin validate --profile directory` enforces a square PNG or JPEG of 512 to 2048 px under 2 MB and takes neither SVG nor WebP, and it enforces none of that.
  The check on an icon it finds compares the file's magic bytes against its own extension and nothing else: a `.png` must open with the PNG signature, a `.jpg` with `FF D8 FF`, a `.svg` is merely parsed as text, and there is no dimension read and no byte count beyond a floor of 12, so a 256 px PNG, a 3000 px PNG, and an `icon.svg` all pass.
  The sizes are the `fix` advice of the `ICON_MISSING` warning, which the validator raises only when it finds no icon at all, so both pages now name the developer portal as what asks for them and say that the local check does not.

### Removed

- The nine checks of `tools/` that read prose rather than code are deleted, with their eight spec files, so `tools/` now holds only what the shipped plugin needs (the user, 2026-10-30: "clean up the mess that is `tools/` *ONLY* to what the plugin needs").
  They are `tools/always-loaded.ts`, `citations.ts`, `keep-pages.ts`, `md-table.ts`, `prompt-budgets.ts`, `pure-prompts.ts`, `recipes.ts`, `rule-scope.ts`, and `skill-flags.ts`.
  Each read a Markdown page and judged its wording, its table shape, or the paths it cited, so a change to a sentence failed `just check` while no shipped behavior had moved.
  `just validate` runs the seven that read code: the agent tools, the folder clusters, the JSDoc blocks, the text literals, the Gitleaks rules, the rebuild constants, and the four version manifests.
  What is lost with them: no check now compares a recipe named in a page against the `justfile`, resolves a cited `path:line`, or holds a prompt piece to a byte budget.
  The one budget that a spec fixes a number for is kept as a test instead, `tests/repo/prompt-budget.test.ts`, because a budget with a measured value is behavior and the rest were prose.
- The `compaction` option is gone, with `plugins/claudetto/src/compaction/compaction.ts` and its spec file (the user, 2026-10-30).
  It offered `auto`, `built-in`, and `code` in the plugin dialog while the `pathOf` that read it was imported by nothing but its own spec, so a person could set a value and nothing happened: `onCompact` (`compaction/hook.ts:34`) reads `cheapSummary` and never the path.
  An option in the dialog that no hook reads is worse than no option.
  The compaction of Claude Code is the one path that ships, which is what every probe round of `docs/evidence/code-compaction-probe.md` left in place by reporting no winner, and `tests/repo/compaction-default.test.ts` still fails when a verdict line stops saying that, which is the signal to build the code path and offer the option again.
  `tests/repo/manifests.test.ts` now pins the list of options the manifest declares, because no check can show that a hook reads a value: adding an option means changing that list, and whoever changes it has to name the hook that reads it.
- `docs/test-diet.md` is deleted (the user, 2026-10-30).
  It audited the test suite of the pre-restart tree: of the 209 test files it cited, 207 live only under `archive/`, and it named five `just` recipes that the `justfile` no longer defines.
  The audit and its numbers stay in the git history, and `docs/README.md` indexes the page no more.
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
  The numbers had drifted as entries were added at the top, and `tools/citations.ts` read whether a cited line exists and not whether it supports the sentence.
  Four of the eight also carried a claim the tree does not support: `commit.txt` and `commit-push-pr.txt` said setup installs a `commit-msg` hook and a `pre-push` hook of git, `init.txt` and `memory-types.txt` said `/claudetto:setup` writes a `CLAUDE.md`, and `claude-in-chrome.txt` said the repo ships its own browser plugin.
  Setup merges a settings snippet and installs no git hook, and the repo ships `claudetto` and `claudetto-you-should-know`.
  Each citation now names a file of this tree or of `archive/`, and the `drop` recommendation of the two commit pages rests on `docs/surfaces.md:3`, because the hook it named is not there.
  `docs/keep/skills/init.txt:12` is the same fault once more: it cited `README.md:117`, which is the `## Development` heading, for a claim that contradicted its own line 7. The main agent body does take its conventions from `@CLAUDE.md` (`plugins/claudetto/agents/main.md:23`), which is the real con, so the page now says that.
