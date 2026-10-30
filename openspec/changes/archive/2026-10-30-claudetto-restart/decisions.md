# Decisions for Groups 13 To 21

The first decisions were taken on 2026-10-29, before the tasks were written, and the groups the user added
after that date carry their own dates below. Each one names its evidence, so a task can cite this file
instead of re-deriving it. `survey.md` beside this file holds the counts.

## Scope

The user gated the `0.0.0` release on four pieces of work, which land as groups 13 to 16 of this change
rather than as a change of their own, in this order, because the restructure moves files that the later
groups then edit and a different order rewrites the same citations twice.

13. The architectural restructure: no files-as-directories, and unit tests in `__tests__/` beside their
    sources with integration and end-to-end tests under the top-level `tests/`.
14. `ClaudeKit`, a claudetto-specific probing toolkit. It is the former `dev/` folder, renamed to
    `claudekit/` by task 14.2 rather than extracted, because every tool in it was already one.
15. The comment pass: JSDoc on every public API surface, and a non-doc comment only where a "why"
    warrants it.
16. The agent roster.

Task 12.6 holds the release gate. Task 12.5 may not delete `archive/` until group 16 lands, because
`archive/plugins/claudetto/agents/` holds the only copies of the agent files outside a plugin cache that
`claude plugin update` can replace.

## Test Layout

Lab tests stay in `plugins/*/tests/`. Only `bun test` unit tests move to `__tests__/`.

The two runners are split by folder today: all 19 non-archive files under `plugins/*/tests/` import
`claude-code/testing` and no top-level `tests/` file does.

**That split does not survive the move, and the correction below was measured on 2026-10-29 rather
than reasoned about.** `claude plugin test --help` says it "Runs every *.test.ts and *.test.tsx under
dir", it takes the mod's folder and nothing narrower, and it has no ignore option, so it reaches any
`__tests__/` folder under `plugins/claudetto/src/`. A probe put one `bun:test` file there and
`claude plugin test` collected it and failed it, because a file in that environment may import only
`claude-code` and its own relative paths. Twelve of the 43 unit tests land under a plugin, so the move
as first written would have broken `just lab`.

The resolution is the file suffix, because the suffix is the one thing the two runners disagree about:
`claude plugin test` matches `*.test.ts` and `*.test.tsx` only, while `bun test` also collects
`*.spec.ts`. So a unit test beside its source is named `*.spec.ts`, and `*.test.ts` stays the name of a
file a dedicated runner owns, under `tests/` or under `plugins/*/tests/`. The suffix therefore says
which runner owns the file, which is one flat rule with no exception for the plugin case.

Proved in the tree, not inferred. A `.spec.ts` file under `plugins/claudetto/src/window/__tests__/`
took a bare `bun test` from `840 pass` across 75 files to `841 pass` across 76, while
`claude plugin test plugins/claudetto` stayed at `114 pass` across 15 files, so `bun test` collects it
and the lab runner does not see it. The probe was then deleted and both counts returned.

`survey.md` counts 91 test files: 43 unit, 30 integration, 18 lab. The 43 move and the other 48 stay.

### One Conflict Already Resolved

Read again on 2026-10-29: all three tools below already handle a `__tests__/` folder, so the move needs
no edit to them. `tools/source-text.ts:104-117` defines `UNDER_TESTS` and `shippedSources` skips it with
its reason; `tools/rebuild/silent.ts:48` reads only `shippedSources`, so the same skip covers it; and
`tools/file-lines.ts:24-32` matches `/(^|\/)(?:tests|__tests__)\//`, so a helper there gets the 500-line
limit. The paragraph below is the original statement of the conflict, kept because it names why each of
the three matters.

### The Conflict as First Written

`tools/source-text.ts:107-110` lists `src/` recursively and keeps every `.ts`, so a `__tests__/` folder
under `src/` would be read as shipped source. `tools/rebuild-silent.ts` scans the code of every shipped
source for telemetry nouns and network calls, so a test landing in that set gets scanned as if it
shipped, and `tools/file-lines.ts:25-28` matches `/(^|\/)tests\//`, which `__tests__/` does not match, so
a helper there would be held to the 300-line source limit instead of the 500-line test limit. All three
have to change before any test moves, or the move turns a passing `just validate` into a false result.

## The Agent Roster

### What the Live Tree Has

`plugins/claudetto/agents/` holds `main.md` alone. The six named agents exist only in the git-ignored
`archive/` and in the installed `0.4.0-alpha.2` plugin cache. This change listed
`archive/plugins/claudetto/agents/*.md` as a code source at `proposal.md:43` and never rebuilt them.

The restart's actual answer on subagents is governance rather than a roster:
`plugins/claudetto/src/run-limits/` judges each subagent start in `spawn.ts`, caps starts per window,
counts failures, and reports the background tasks still in flight at stop, through the `agent.spawn` and
`agent.offer` hooks of `register.ts`. That stays, and it governs whatever agents a user defines.

### The Cut

Rebuild two agents and fold four into the main loop. The criteria are those of
`https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop`,
read on 2026-10-29, which keeps a subagent for measurable context bloat in one loop, for parallel tasks
with fresh context that is discarded afterwards, or for an agent that struggles to select tools among
conflicting instructions, and which folds specialists that chain on each other's output, touch the same
data, or are called together.

| Agent | Verdict | Reason |
| --- | --- | --- |
| `Artemis` | keep | Bulk search is discardable context, and the work "needs little from the rest of the system" and hands back "a compact result". |
| `Athena` | keep | The article names "black-box verification" as a good candidate, and a reviewer that shares the author's context inherits the author's blind spot. |
| `Apollo` | fold | Its only claim is bloat, which a pipe defeats in the main loop: one `just check` run went from 25KB to 20 lines through `grep`. A subagent's check also cannot satisfy a parent's box hook, which reads the parent session's own tool uses. |
| `Hephaestus` | fold | It touches the same data as the main loop and hands back a lossy summary of edits the main loop must re-read to trust, which is the merge rule exactly. |
| `Zeus` | fold | It plans work for parallel `Hephaestus` agents, so folding `Hephaestus` leaves it no consumer, and a planner handing a plan back is the "telephone game" the article warns about. |
| `Hermes` | fold | `WebFetch` already takes a `prompt` and returns a compact answer, so the nested model loop adds the article's latency objection and nothing else. |

Asked on 2026-10-29. Jev answered "Keep Artemis and Athena only" at 0.62 confidence, which is thin, so
the user may still overrule the cut.

### The Tool Declarations Are Wrong in Three of Six Files

`Grep` and `Glob` are offered only on a surface that has no `Bash`; the program swaps them in as
alternatives to it rather than adding them. The evidence is `plugins/claudetto/src/deny.ts:53-64`, read on
`2.1.312`, which measured that denying `Bash` "puts `Grep` and `Glob` in its place" and took the first
request to 43,593 characters.

Probed on 2026-10-29 rather than inferred: a `Hephaestus` agent asked to report its own tool schema
returned `Read`, `Edit`, `Write`, `Bash`, `Monitor`, with no `Grep`, no `Glob`, and no `ToolSearch`,
although `Hephaestus.md` declares `tools: Read, Edit, Write, Grep, Glob, Bash, Monitor`. So an agent file
naming `Bash` beside `Grep` and `Glob` declares two tools it never receives. That holds for `Apollo`,
`Athena`, and `Hephaestus`.

### Each Kept Agent Gets the Tools Its Task Needs

The rule the user set: an agent is allowed the tools its task needs and no more, and the declaration has
to match what the runtime actually gives it.

- `Artemis` gets `Read, Grep, Glob` and no `Bash`. It keeps the path-gateable no-shell surface, which is
  the reason those two tools exist: the user's own deny rules bind paths, as in `Read(**/.env)` and
  `Read(~/.ssh/**)`, while `Bash` takes command strings and routes around that rule class. Its brief must
  say that it reports paths and lines only, because a task needing a count or a written file has to go
  elsewhere. Asked on 2026-10-29 and Jev answered this option at 0.84 confidence.
- `Athena` gets `Read, Bash`. Reviewing a diff needs `git diff`, so it needs `Bash`, and the probe shows
  that `Bash` costs it `Grep` and `Glob`, so those two names come out of the file rather than staying as
  phantoms. Settled by the probe rather than asked, because the alternative is a reviewer that cannot
  read a diff.

### The Main Loop Must Not Misattribute a Task to an Agent

A real failure of 2026-10-29, not a hypothetical: the main loop sent `Artemis` a task that required
creating a folder, writing a 328-line file, and counting lines with `wc -l`. `Artemis` has none of
`Write`, `Bash`, or `mkdir`, so it returned a partial report with nothing written, and the work had to be
redone on another agent. The cost was one wasted agent run and a delay.

The cause is that the delegation text named each agent by purpose and not by what it cannot do, so a
brief that needed a write looked acceptable. Group 16 therefore has to make misattribution hard rather
than discouraged:

- Each agent's own file states its refusals beside its purpose, so `Artemis` says it writes no file and
  counts nothing, and `Athena` says it changes no file.
- The delegation text maps the shape of a task onto an agent, keyed on what the task produces, because a
  reader picking by topic picks wrong when two agents share a topic.
- A test asserts that the delegation text names exactly the agents that ship and no other, so a folded
  agent cannot be referenced after it is gone.

### Two Faults to Fix Rather Than Carry Over

Both are release blockers per the user on 2026-10-29.

1. The fallback line "`grep` in `Bash` when a native build has no `Grep`" sits in `Athena.md:18`,
   `Hephaestus.md:18`, and `Apollo.md:13`, and each of those three files declares `Grep` and `Glob`
   beside `Bash` at its line 6, so the line and the declaration are one fault and not two: the
   runtime withholds `Grep` and `Glob` from a surface that has `Bash`, which makes the `Grep` the
   line tells the agent to prefer the unreachable tool, not the `Bash` it falls back to. The line
   goes with the declaration.
2. An earlier reading of this file put that fault on `Artemis.md:6` and `:12`, and that was wrong,
   corrected on 2026-10-29 by reading all six archived files at once. `Artemis.md:6` is
   `tools: Read, Grep, Glob` with no `Bash`, and it carries no fallback line, so its declaration is
   the one the runtime does honor. The three faulty files are the three that name `Bash`, which is
   the whole pattern: `Zeus.md:6` and `Artemis.md:6` are clean at `Read, Grep, Glob`, and
   `Hermes.md:6` is clean at `WebSearch, WebFetch, Read`. Task 12.5 carried the same wrong claim and
   is corrected there too.

## What `Grep` and `Glob` Are For

Recorded because the question comes up whenever someone reads the swap and concludes the two tools are
pointless beside `Bash`.

They exist so that a surface with no shell can still navigate a codebase, and their value is
permissioning rather than capability. They take paths and patterns as structured arguments, so a
path-shaped deny rule binds them; `Bash` takes a command string, so the same rule does not reach `cat`.
They are also portable, where shell search is not: in this project's own shell a glob with no match stops
the command with `no matches found`, and macOS has no `timeout`.

For the main loop, which has `Bash`, they are genuinely redundant, and the swap is correct rather than a
defect. The cost is that the main loop pays the shell-portability tax instead.

## `ClaudeKit` Is a Folder of This Repo, Not a Package

A folder named `claudekit/`. The three couplings the task names were read off the tree on 2026-10-29
rather than taken from the survey, because two of the three paths had moved under group 13, and each
one points the same way.

**`probe/` is a library of the other tools, so the five are one codebase and not five packages.**
`claudekit/compaction-price/main.ts` imports four of its modules, `../probe/claude.ts` at `:12`,
`../probe/events.ts` at `:13`, `../probe/ordered.ts` at `:14`, and `../probe/plan.ts` at `:15`, and
`claudekit/summary-cost/main.ts:7` imports `../probe/ordered.ts`. A package would therefore have to publish
the shared core as well, either as a sixth package the other five depend on or as one package with
five entry points. What happens to this coupling: nothing moves. The core stays one folder that the
other tools import, which is what task 14.2 already requires.

**Seven imports across six files reach plugin internals, and one of them resolves a path at run
time.** The seven are `claudekit/compaction-price/price.ts:9` and `claudekit/compaction-price/main.ts:11` on
`plugins/claudetto/src/window/window.ts`, `claudekit/haiku-growth/main.ts:17` on
`plugins/claudetto/src/threshold.ts` and `:21` on `plugins/claudetto/src/tiers/tiers.ts`, and
`claudekit/probe/session.ts:5`, `claudekit/probe/plan.ts:8`, and `claudekit/probe/flags.ts:9` on
`plugins/claudetto/src/threshold.ts`. The run-time one is `claudekit/probe/plan.ts:36`, which builds
`path.join(import.meta.dir, "../../plugins/claudetto")` so that a forked `claude` loads the plugin
under test. This is what rules the package out rather than merely making it harder. A published
package cannot resolve a sibling directory of the repo it was published from, so the plugin's location
would have to arrive as a flag or an env var, and the three modules it reads are internals that the
plugin exports to nobody. Publishing them would turn `HANDOFF_TRIGGER_TOKENS` into a public contract
at the exact moment this change is still asking whether 140,000 is the right value, which is the
question the probe exists to answer. What happens to this coupling: the seven imports collapse into
one seam file under task 14.3, and the run-time path of `plan.ts:36` moves into that seam as the one
place that knows where the plugin lives. That has since happened, so the seven line numbers above are
the reading of 2026-10-29 and not the current file: each of the six files now imports
`claudekit/plugin.ts`, and `plan.ts` takes `PLUGIN_DIR` from it rather than building a path. The folder
was named `dev/` at that reading and task 14.2 renamed it, so the paths are given under the name a
reader can open today.

**`probe/floor.ts:3` imports `EVAL_MIN_RUNS_PER_ARM` from `tools/limits.ts`.** That module is a
repo-level constants file shared with `tools/`, not a plugin internal. A package would have to publish
it or copy it, and copying a floor that decides whether a result may be cited is how a floor drifts
away from the one the evidence pages quote. What happens to this coupling: it stays a direct import.
The seam of task 14.3 covers `plugins/` paths only, which is what that task's own verify asserts, and
this decision records that the package option is the only thing that would have forced `tools/limits.ts`
to move.

No later task of this group contradicts the decision: 14.2 creates `claudekit/` as a folder, 14.3
builds the single seam, 14.4 moves the tests, 14.5 renames the five `justfile` recipes, and 14.6 to
14.8 split the folders inside it. None of them needs a published artifact.

## `compaction-price/` Stays Its Own Tool

Task 14.8 asks whether `claudekit/compaction-price/`, which holds two files, is a tool of its own or a
part of `claudekit/compaction-cost/`, which already holds a `price.ts`. It stays its own tool. The two
`price.ts` modules are a name collision across two tools and not a duplication to merge, and the three
facts below were read off the tree on 2026-10-30.

**No module imports both, and the two share no export name.**
`claudekit/compaction-price/price.ts` exports the interface `Price`, `priceOf`, and `priceLine`, and it
is read by `claudekit/compaction-price/main.ts` and by `tests/claudekit/compaction-price/price.test.ts`,
which is all. `claudekit/compaction-cost/price.ts` exports `OPUS`, `money`, the interface `Mix`,
`mixOf`, `mean`, and `meanPrompt`, and it is read by five modules inside `compaction-cost/` and by
nothing outside it. So there is no shared code to extract and nothing that would have to pick between
the two. What a merge would produce is one folder holding two unrelated `price.ts` under new names, not
one `price.ts` serving both.

**The two tools measure different things from different inputs, and only one of them can spend money.**
`just compaction-price` prices one compaction in window points and dollars from the recorder's own
rows, and makes paid calls when `--run` is among its arguments. `just compaction-cost` replays this
login's own transcripts against other thresholds, free and with no model call at all. Merging them
would put a paid entry point and a free one behind one folder, where today the `justfile` help line of
each says which it is.

**They are coupled to different things, and a merge would spread the heavier coupling.**
`claudekit/compaction-price/main.ts` imports four probe modules, `../probe/fixture/ordered.ts`,
`../probe/plan/plan.ts`, `../probe/transport/claude.ts`, and `../probe/transport/events.ts`, and takes
`rowsOf` from the seam at `../plugin.ts`, because it starts `claude` and reads its event stream.
`claudekit/compaction-cost/` imports no probe module and no plugin module at all: it reads transcripts
off disk. So `compaction-price` is a client of the probe and `compaction-cost` is not, and folding the
first into the second would pull the probe transport into a tool that never starts a session.

One observation this decision records rather than acts on, so that it is a choice and not an oversight.
`claudekit/compaction-cost/price.ts` exports `money`, `mean`, `meanPrompt`, and the `OPUS` price row, so
it is a money-and-means helper rather than a pricer, and `money.ts` would name it better. That rename is
outside task 14.7, whose verify clause is about two files of one tool sharing a base name, and outside
this decision, which is about the boundary between two tools. It stays open for a later change, and the
collision it would also remove is the cosmetic one across the two tools, not a fault in either.

## The Comment Rule

The user set the rule on 2026-10-29: a public API surface carries JSDoc, and a non-doc comment
survives only where a "why" warrants it. Written out, it has three parts, and `tools/jsdoc.ts` holds
the first two because 263 gaps cannot be closed by review alone.

**Every exported declaration of a shipped source carries a JSDoc block directly above it.** An export
is the surface another module calls, so a reader meets it without the file around it, and a name alone
does not say what a caller may pass or what it gets back. A shipped source is one of the checked globs
of `tools/file-lines.ts` less every test file, so a planted fixture and a spec are out of scope. A
re-export declares nothing of its own and is out of scope too. "Directly above" is literal: a block
separated from its declaration by a blank line documents neither one clearly, and a `//` comment is
not a block.

**A JSDoc block whose every content word is already a word of the name below it is a defect.** It
costs a line and a read and adds no fact, as `/** The window row. */` above `WindowRow` does. The test
is a set comparison against the identifier, split on camel case, and never a judgement of the writing.
A backticked span counts as no word, because a code item a block names is almost always the
declaration's own name or one of its parameters, and both are on the line below.

**A non-doc comment stays only where it gives a reason the code cannot show.** This part is not
checked by a command and is not going to be, because the question it asks is whether a sentence is a
reason, and a word list cannot answer that. The evidence for leaving it to review is in this repo:
`tools/no-narration.ts` carries a seven-entry allowlist because its word patterns fire on dated
readings that are evidence rather than narration, so it cannot tell its target from its opposite.
Group 17 decides that tool's own fate.

That same evidence sets how hard the second part may push. It refuses a block only when **every**
content word of it appears in the name, so one word the name does not hold is enough to pass. The
cost of a false refusal is a session rewording a true comment, which is the failure mode the
allowlist records, and a check that teaches rewording in place of fixing is worse than no check. On
the tree of 2026-10-30 that threshold finds 5 restating blocks against 258 missing ones, which is the
proportion a conservative rule should give.

## The Three Prose Checks of `tools/`

Decided 2026-10-30, for group 17. Each claim below names the command that produced it, because the user's
objection is that these checks are word lists rather than readings of behavior, and that objection is
itself a claim about behavior.

### `no-narration`: Keep Two Patterns, Delete the Third and the Allowlist

The tool holds three patterns at `tools/no-narration.ts:18-33` and a seven-entry `ALLOWED` list at
`:39-69`, and it runs at `justfile:16` inside `lint`.

The deciding reading ran the three patterns over every path of `CHECKED_GLOBS` with `ALLOWED` disabled, so
each exemption could be attributed to the pattern that forces it. Patterns 1 and 2 fire **zero** times:
the task-or-group-number pattern and the session pattern match no line of the tree. Pattern 3 fires
**three** times, all in one file, at `plugins/claudetto/src/deny.ts:68`, `:70`, and `:79`, where the word
`archived` names the archived deny list that the module's own rows are about.

So the allowlist's own evidence localizes to one pattern. Six of its seven entries are dead: `cuts.ts`,
`refused.ts`, `keys.ts`, `tools/tools.ts`, `tools/skill-flags.ts`, and
`plugins/claudetto/tests/handoff.test.ts:311` match no shape at all now, and only the `deny.ts` entry is
load-bearing.

The decision follows that split. Patterns 1 and 2 stay, because a comment that names a task number or
this session can never be evidence: a dated reading cites a date and a command, as `tools/skill-flags.ts:1-4`
does, and neither of those words appears in such a citation, which is why the two patterns have no false
positive anywhere in the tree. Pattern 3 goes, with the whole `ALLOWED` list, because its words name the
subject matter of the code rather than the process that wrote it, and it cannot tell the two apart by
construction. Its target also expires: 12.5 removes `archive/` in the release commit, so after the release
no comment can cite `archive/` at all.

Nothing replaces pattern 3, and that is the finding rather than a gap: a comment about an archived tree is
evidence exactly when the code is about the archived tree, and no check reads that difference from words.

### `thin-claims`: Delete It, Because Its Floor Is Enforced Where the Number Is Made

A correction of the record first. The task text of 17.3 says the tool "also checks that a cited line
exists, which is a reading of the tree and not of wording". It does not. All 89 lines are the wording
half: `NUMBER_WORDS` at `:8-18`, `RUN_COUNT` at `:24-27`, and `thinEvalClaims` at `:37-51`, which flags a
line of `docs/**/*.md` matching `N runs per arm` with `N` below `EVAL_MIN_RUNS_PER_ARM`, which is `10` at
`tools/limits.ts:8`. A grep for a citation resolver over `plugins/claudetto/src` and `tools/*.ts` finds
none. That behavior belongs to the gate hook of the installed claudetto `0.4.0-alpha.2`, which this tree
has not ported, so there is no second half to split off and 17.3's verify clause cannot be met as written.

The floor the tool guards is already enforced in code, twice, where the run count is produced rather than
where a page writes about it:

- `tools/evals/report.ts:39-41`, `isCitable`, requires `row.pass + row.fail >= EVAL_MIN_RUNS_PER_ARM` over
  the graded runs of one arm, errors not counted.
- `claudekit/probe/plan/floor.ts:13-37`, which is `CITABLE_MIN_RUNS`, `floorOf`, `floorLine`, and
  `ranLine`, and which prints the floor a run count meets before any paid call. It is pinned by
  `claudekit/probe/plan/__tests__/floor.spec.ts`.

Both read the number the harness counted. The regex reads English, and a page can state a thin run count
in any wording the pattern does not hold, so the tool is a weaker copy of a bound that already exists. It
goes.

### The Citation Check the Tree Is Missing

Deleting the wording half leaves a real gap that 17.3 was right to call load-bearing, though wrong about
where it lives: nothing in this tree checks that a `path:line` citation in a Markdown page points at a
line that exists. The gap has already cost this change work. Task 14.5 resolved 107 anchored `dev/`
citations across the tree and 31 of them resolved to no file, and every one had passed `just check`.

So 17.3 becomes build rather than split. A new `tools/citations.ts` resolves every `path:line` span of the
Markdown the repo owns and fails when the path is missing or the line is past the end of the file, and it
runs in `just validate`. That is the half 17.3 requires to keep running, and it is a reading of the tree
and not of wording.

Two bounds on what it reads were set from its first reading, which found 571 faults over 586 citations.
Both bounds are about what the rule can decide, not about keeping the count green:

- **Only a path this repo could own.** A citation is resolved when its first segment is an entry of the
  repo root. The split is 261 citations this repo could own against 325 it could not, and the 325 are
  files of other projects: `hooks/module.js`, a `chunk-*.js` of the installed CLI, the dossier sources of
  `docs/dossier/handbook.md`, and the pages of external skill repos. None can resolve from here at any
  line, so reading them would make the check a gate on whether a page quotes another repo. Whether a page
  must name the repo it cites is a separate rule, and this is not it.
- **A page whose citations are a dated reading is out of the walk,** listed in `DATED_PAGES` with the
  line of the page that says so. One page qualifies, `docs/test-diet.md`, whose own third line states that
  every path on it is the path a file had on 2026-10-28 and is read by adding `archive/` in front of it.
  It holds 238 of the 250 remaining faults. The reason sits in the page, where a reader of the page meets
  it, and the list in the tool names the line that carries it, so this is not the kind of allowlist the
  `no-narration` decision above rejects: that one patched a pattern that could not tell its target from
  its opposite, and this one records that a whole artifact is a historical record.

After both bounds the count is 12, and all 12 are real: 11 cite the pre-restart tree, which is the defect
class 14.5 found, and one cites the `README.md` of a third-party clone at a line our own `README.md` does
not have. Those are fixed in the pages rather than exempted.

### `openings`: Move It to the Toolkit

`tools/openings/` holds `evidence.ts` and `reply.ts`, with `tools/__tests__/openings.spec.ts` beside them.
No recipe runs it: a grep of `justfile` for `openings` finds nothing. Its own header at
`tools/openings/evidence.ts:1` records that it ships in no hook and that `docs/evidence/reply-openings.md`
reads it at 89% false positives.

That makes it a probe and not a check, and this repo already has a folder for a probe that measures real
sessions and that no gate runs, which is `claudekit/`. `tools/` is the folder of the checks `just check`
runs. So it moves to `claudekit/openings/` with its tests, and it keeps running.

It moves rather than goes because `docs/evidence/reply-openings.md:9` and `:60` name
`bun tools/openings/reply.ts` as the command that retakes the reading, and `:60-63` states that another
corpus can overturn the base rate, so deleting the tool would leave a page whose method no longer exists.
The three citations of the tool path, at `:9`, `:14`, and `:60`, are rewritten to the new path. That is
17.4's first branch: the page's named command still runs after the move.

## The Shape of `docs/`

Decided 2026-10-30, for group 18. Three prefixes carry 44 of the 59 Markdown pages at depth 1 of `docs/`:
28 begin `evidence-`, 12 begin `dossier-`, and 4 begin `prompt-`. Each becomes the folder its prefix
names.

### A Numbered or Lettered Sibling Is a Separate Page

It is never merged into the page it sits beside. The evidence is the opening line of each page, read on
2026-10-30, and it splits into three classes:

- **The wiki class.** Each of these pages opens with a line naming the wiki page it was saved from, and a
  numbered sibling names a different one: `docs/evidence/handoff-cost/handoff-cost.md` cites `Handoff-Cost.md` and
  `docs/evidence/handoff-cost/part-2.md` cites `Handoff-Cost-2.md`, and the same holds for
  `docs/evidence/usage-evidence/usage-evidence.md` and its `-2`. A merge fuses two saved pages into one and leaves each
  provenance line pointing at half of it.
- **The dossier passes.** `docs/dossier/exports/part-2.md` states its scope as the exports that
  `docs/dossier/exports/exports.md` left unread, read on a stated date, and `-3` states the same of the first two
  passes. A merge presents three dated scans as one reading.
- **The lettered dossiers are not parts of one page at all.** `docs/dossier/sep/a.md` scopes
  `external/2026-09-29` through `2026-10-01_p2`, `-b` scopes `2026-10-02` through `2026-10-04`, and `-c`
  scopes the last third of `2026-09-29` through `2026-10-08`. Three scopes with letter names, which is a
  naming defect and not a split page.

That settles the worry 18.1 raises. Because no page content merges, no line inside any page moves, so
every rewrite of 18.2 to 18.4 is a path rewrite and no cited line number changes. The check that proves
it is no longer `bun tools/thin-claims.ts`, which 17.3 deleted, but `bun tools/citations.ts`, which is the
stronger check for this job because it resolves the line rather than the wording.

### What the Cluster Rules Say about the New Folders, and the One Place They Are Wrong

The three rules of `tools/clusters.ts` were run over the planned folders with the prefix dropped from each
member. `docs/prompt/` is clean. `docs/evidence/` reports 9 faults and `docs/dossier/` reports 4, and two
of those 13 are wrong for prose rather than wrong in the tree:

- `sandbox-run-0.2.0.md` and `evals-0.2.0.md` share the tail `-0.2.0`, which `suffixFaults` reports as a
  concern named `0.2.0`. It is a release, and a folder named for it would file the evidence by version
  instead of by subject.
- `usage-evidence-2.md` and `handoff-cost-2.md` share the tail `-2`, reported as a concern named `2`. An
  ordinal is not a concern.

So the extension in 18.5 needs one exclusion the source tree never needed: a head or tail segment of only
digits and dots is not a concern.

The other 11 are right and they set the shape:

- `docs/evidence/evals/` holds `evals.md` plus `0.1.0.md`, `0.2.0.md`, `2.1.304.md`, `audit-lines.md`, and
  `history.md`. That is the nested prefix 18.1 asks about, and the convention already answers it at
  `tools/clusters.ts:1-6`: the member that names the folder keeps the folder's own name, as `gate/gate.ts`
  does.
- `docs/evidence/handoff-cost/` holds `handoff-cost.md` and `part-2.md`, `docs/evidence/usage-evidence/`
  holds `usage-evidence.md` and `part-2.md`, `docs/dossier/exports/` holds `exports.md`, `part-2.md`, and
  `part-3.md`, and `docs/dossier/latest/` holds `latest.md` and `part-2.md`. The member is `part-2.md` and
  not the `2.md` that the rule's message suggests, because each of those pages titles itself a part or a
  pass, and a page named `2.md` tells a reader nothing.

Three more clusters come from the new rule of the next section rather than from the three existing ones,
and they are resolved after the prefix clusters above, because a prefix cluster names the longer and
therefore the better-evidenced concern: `compaction-boundaries` and `compaction-threshold` become
`docs/evidence/compaction/boundaries.md` and `threshold.md`; `sep-a`, `sep-b`, and `sep-c` become
`docs/dossier/sep/a.md`, `b.md`, and `c.md`; and `eval-graders` and `eval-sources` go into the `evals/`
folder as `graders.md` and `sources.md` rather than into a folder of their own. The last of those is the
one judgment in the whole move: the rule as written would make `docs/evidence/eval/` beside
`docs/evidence/evals/`, and `eval` and `evals` are one concern spelled two ways, so a reader meeting both
folders would have to guess which holds what.

The single-letter names of `docs/dossier/sep/` are kept rather than replaced by the range each page
covers, because the ranges overlap: `-a` covers `external/2026-09-29` through `2026-10-01_p2` while `-c`
covers the last third of `2026-09-29` through `2026-10-08`. Naming them by range therefore needs a content
decision about which range each page really owns, and that belongs to the user and not to a move.

### The Rule the Source Tree Never Needed

`tools/clusters.ts` holds no rule for the shape `docs/` is almost entirely made of: two or more siblings
sharing their leading `-` segment where no sibling carries that segment alone. That is `evidence-`,
`dossier-`, and `prompt-` themselves. It is the mirror of `suffixFaults`, and 18.5 adds it.

Run over the source roots with the numeric exclusion, the new rule reports three clusters, and every one
is a real instance of the same shape rather than a false positive: `plugins/claudetto/tests/` holds four
`limits-*.test.ts`, `tests/claudetto/` holds two `tier-*.test.ts`, and `tests/repo/` holds three
`rebuild-*.test.ts`. They are fixed by the same move the `docs/` pages get, so the new rule lands green
rather than with exemptions.

### `docs/keep/` Is Exempt, and That Is a Fact and Not a Preference

`tools/keep-pages.ts` reads a page name under `docs/keep/`: `pagesIn` at `:72-77` scans
`docs/keep/<KIND_FOLDERS[kind]>` and `faultLines` at `:93-96` builds the path
`docs/keep/<folder>/<surface>.md` from the surface a tier row names. So the folder names there are kinds
and the page names are surfaces, both of them read by a check, and renaming either breaks a check that
exists. The folders hold no page yet, so the exemption guards the pages the restart will write rather than
pages on disk today.

### The Order of the Moves

1. Move the pages, one prefix at a time, with no content change, so the only thing that can break is a
   path.
2. Rewrite every citation of a moved path, inside `docs/` first and then outside it.
3. Add the rule and its numeric exclusion to `tools/clusters.ts`, add `docs` to its `ROOTS`, exempt
   `docs/keep/` by name with the reason above, and fix the three source clusters the new rule reports.
4. Run `bun tools/citations.ts` after each step, because it is the check that proves a rewrite landed.

## Where a Hand-Assembled Newline Is Wrong, and Where It Is Right

The rule the user asked for is one rule with two exceptions, and the exceptions are most of the tree, so the
count the group was planned against was wrong. The 2026-10-29 grep counted 43 `join("\n")` calls across 32
files and 87 lines holding a double-quoted literal with an escaped `\n`. Measured by `tools/literals.ts` on
2026-10-30 the real figure is **53 sites**, and the gap is the whole point: of the 43 joins, only 11 are over
an array literal written in place, and of the 184 double-quoted literals in the tree that hold the text `\n`,
only 43 are messages.

### The Two Boundaries, Both Measured Rather Than Chosen

**A join is wrong when its receiver literally ends in `]` and no top-level element is a spread.** A variable
or a call never ends in `]`, so the shape of the receiver is the whole test. The 32 joins that stay are over
mapped, filtered, or pushed values whose parts come from a loop, and no literal can hold them.

**A double-quoted literal is a message when a `\n` lies between its first and its last character that is not
a `\n`.** A `\n` at either end, however many, is a terminator or a needle and stays. The split of the 184 is
43 messages, 99 that are the whole literal `"\n"`, and 42 that carry newlines at an end only, such as `"x\n"`
and `"\n---"`, so 141 of 184 stay.

The brief for the check proposed "text on both sides of the `\n`", and that is wider than what landed: it also
catches `"\nbody\n"`, which is a block carrying its own terminators rather than a hidden shape. The narrower
boundary is the one in the code and each side of it is pinned by a test.

### Five Shapes the Check Deliberately Cannot See

The check lexes rather than greps, so a `\n` or a `.join` inside a comment, a template text, or a regex body
is never seen. Beyond that it misses a `\n` in a single-quoted literal, a `\n` in the text of a template
literal, parts pushed into a variable before the join, a `"a\n" + "b"` concatenation, and a regex literal
following `)` or an identifier, of which the tree holds none. Every one of these is a miss rather than a false
positive, which is the right way round: a check that cries wolf gets suppressed, and this repo bans a
suppression comment, so the only way to quiet a false positive would be to delete the check.

One shape it over-reports is a literal array holding a conditional element, which is written in place and yet
is not a fixed list. The conversion tasks judge that by hand where it appears; no site in the tree is one.

### Why `plugins/` Went First and Alone

Only 2 of the 53 sites are in shipped code, `plugins/claudetto/src/handoff.ts:275` and `read-back.ts:31`, and
both are joins. The other 5 under `plugins/` are message fixtures in tests, and a fixture is what proves what
the shipped text is, so the fixtures and the code they pin belong in one step. The hazard that makes this its
own task is that a template literal keeps every space of its own indentation: a converted literal that gains
a leading space is a changed message, and the only honest proof that none did is that every test passes with
no assertion touched. Each template body therefore starts at column 0.

## Making the Agent Aware of Its Own Budget

The user asked for the agent to see its context-window percentage left and its five-hour and seven-day
shares, so it can adjust. Before this group it could see none of them, and the reason is structural rather
than an oversight: the window rows go to the store and to `$.ui.log`, and a UI log is not the agent's
context. One seam in the whole plugin puts text where the agent reads it, the `additionalContext` of `onStop`
in `plugins/claudetto/src/run-limits/hooks.ts`.

### Absence Is a Missing Key, Never a Zero

`WindowRow` carries `points?: number` for the five-hour window and `sevenPoints?: number` for the seven-day
one, and a window the login does not report leaves its key out of the row. A zero would be a lie, because a
seven-day figure that did not move is a real `0` and the two readings must stay distinguishable. The same rule
runs through the group: a reading the login does not supply is dropped from the budget line rather than
printed as zero or as unknown, and a report with no seven-day figure says `not measured` through the
`NOT_MEASURED` constant the tree already had for a saving.

That choice has a cost, and paying it is part of the decision. Making `points` optional broke every consumer
that read it as a number, including one outside the plugin: `claudekit/compaction-price/price.ts` prices a
compaction in both dollars and window points, so a row with no five-hour delta now prices in dollars alone
and carries `Number.NaN` for the points half, which is the convention that site already used for a token
figure it could not read. A printed `NaN` is worse than no figure, because a reader cannot tell an unmeasured
window from an arithmetic fault, so `priceLine` says the window is not measured instead.

### The Budget Line Prices Itself

Text in front of the agent every turn is paid for on every turn, and this tree holds a measured budget
discipline, with `plugins/claudetto/agents/main.md` bounded at 5,680 request JSON characters. So the payload
is **one short line and not a table**: `Budget: context 62% left, five-hour 23.5% used, seven-day 41% used`,
66 characters, with a widest possible case of 69.

The 69 is recorded as `BUDGET_LINE_MAX_CHARS` beside the cuts of `plugins/claudetto/src/cuts.ts` and
deliberately kept out of `SHIPPED_CUTS`, because the line is not in the first request and a row there would
break the `SHIPPED_TOTAL` identity that the cuts test asserts. It is computed from the line's own text rather
than captured, and that is a limit of the tool and not a shortcut: `just capture` ends after one turn while
this line rides `classic.Stop`, so no capture can ever see it. What a capture can see, the first request, was
confirmed to move by 0.

The same seam fixes the line's reach: the agent reads it at the start of the turn after the one that produced
it. That is still a turn in which it can adjust, and there is no per-turn injection to buy a sooner reading
with a per-turn cost.

### The Arithmetic Is Computed, So It Can Be Checked

`AGENTS.md` carries the rule "Give the expected cost and the current weekly share with the question", and
until this group no code supported it: the conversion lived in prose and two earlier tasks each did the
multiplication by hand. `weeklyShare(usd)` now returns a middle and a band, and its constant is **derived in
the code** from the screen reading it came from, `$102.71` less `$13.60` over a meter moving 3 points, rather
than typed in as `29.70`. A typed-in constant cannot be checked against its source; a derived one can, and all
three recorded figures reproduce at the precision each was stated at.

The band is lopsided and the reason belongs with it: dividing the delta by 2 reaches `$44.55` while dividing
by 4 reaches only `$22.28`, and other sessions on the same account can only make the true price lower.

### A Guard against What Is Left, with an Unmeasured Window as a Pass

A run costing 7% of the weekly limit is a different decision at 10% used and at 95% used, so `overWeekly`
prices a round against the remainder and not against the whole limit, at the dearest end of the band, because
a round that might not fit should not be started on the hope that it does.

The case that decides the design is the login with **no** seven-day reading: it passes, and the dollar cap
alone applies. An unmeasured window must not become a stop-the-world for a probe that has to keep working,
and a guard that refuses everything it cannot measure is worse than no guard, because it gets removed.

For the guard to fire at all it needs a live figure, and that is why the group does not end at the guard. The
figure is already persisted, in the reading the plugin writes to its store, so `claudekit/store.ts` reads it
from disk and the probe passes it in. Every store key there comes through `claudekit/plugin.ts` and is never
copied, which is the rule that file's own header states: a copied key would leave every read returning
`undefined` after a rename in the plugin, `undefined` cannot be told from an empty store, and the guard would
switch itself off in silence.

## Still Open

- The restructure's cluster order. `survey.md` counts 14 clusters over 47 files; `tiers/` is the costliest
  at 12 outside importers and the cheapest have one each, so the tasks start with the cheap ones.
- Whether `Hephaestus` returns later for `isolation: worktree` work alone, which is the article's second
  criterion and the one case the fold does not cover.
