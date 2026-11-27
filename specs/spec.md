# Spec

History, checks and sources: [evidence/spec.md](evidence/spec.md).

## SPEC-001 One Living Spec per Capability

claudetto-spec keeps one living Markdown spec per capability at `specs/<capability>.md`: `# <Capability>`, then per requirement a `## <ID> <title>` heading (ID such as `AUTH-3`), one sentence of behaviour, at most three scenarios of `Given`/`When`/`Then` lines, and optional `Open: <question>` lines.

Given a fixture with two capabilities
When `spec_check` parses it
Then it returns every ID, title, scenario count and open question

Given a malformed heading
When `spec_check` parses the file
Then it reports the heading with its file and line

## SPEC-002 Requirement Inflation Flagged

claudetto-spec flags requirement inflation: more than one behaviour sentence or more than three scenarios in one requirement.

Given a requirement with two sentences or four scenarios
When `spec_check` runs
Then it lists the requirement under `inflated`

## SPEC-003 Coverage Computed on Every Call

`spec_check` computes coverage from the files on every call: requirements that no test file cites (`uncovered`) and IDs cited in tests that no spec defines (`orphans`), with nothing stored between calls.

Given a fixture with one uncited requirement and one test citing an undefined ID
When `spec_check` runs
Then it yields exactly those two lists

## SPEC-004 Staged Tests Edited Are Listed

`spec_check` lists test files that changed since they were staged (`git diff --name-only` against the index, restricted to test files), so an implementer that edits a staged failing test is visible.

Given a staged test file that is then edited in the work tree
When `spec_check` runs
Then it lists the file under `changedSinceStaged`
And an untouched staged test is not listed

## SPEC-005 Spec Skill Runs the Loop

The `spec` skill runs the loop clarify, spec, red, green, check for new or changed behaviour: unknowns become `Open:` lines; each new test cites a requirement ID and is run failing before implementation; failing tests are staged before the implementation is written; the turn ends with `spec_check` and the project's test command, and the reply reports their results.

Given the eval cases `feature-*` (two phrasings) run with the plugin
When the traces are graded
Then a Bash `git add` stages the test file before any tool writes the implementation file
And the spec file cites the ID the test cites

Given the same traces
When the last `bun test` summary is read
Then it has at least one pass and 0 fail

## SPEC-006 Skill Silent on No-Behaviour Work

The `spec` skill does not fire on work that adds no behaviour (a typo, a rename, a dependency bump, a question).

Given the eval cases `trivial-*`
When they run with the plugin
Then `tool_used: Skill` shows `max: 0`
And no file under `specs/` is created

## SPEC-007 Contradiction Stops the Skill

When a request contradicts an existing requirement or cannot be met, the skill stops and reports the conflict with the requirement ID instead of editing tests or the spec to fit.

Given the canary case `contradiction`
When it runs
Then it passes only when the reply names the conflicting ID
And no staged test changed

## SPEC-008 Unknowns Asked or Written as Open

In an interactive session the skill asks about an expensive unknown through AskUserQuestion, and under `claude -p` it writes the unknown as an `Open:` line, takes the cheap default when one exists, and reports each assumption in the final reply.

Given the eval case `ambiguous-headless` run as `claude -p`
When it is graded
Then it passes when the spec holds an `Open:` line
And the reply lists the assumption

## SPEC-011 Spec Drift Against HEAD Reported

`spec_check` reports spec drift against HEAD: IDs a spec file defined in HEAD that no spec defines now (`removedIds`) and IDs whose one behaviour sentence changed (`reworded`), with a spec file absent from HEAD and a new ID counting as no drift.

Given HEAD's text is injected
When a spec drops an ID or changes a sentence
Then the dropped ID is listed under `removedIds`
And the changed sentence is listed under `reworded`

Given a new ID, a new spec file, a reflowed sentence or an ID moved to another spec file
When `spec_check` runs
Then it lists nothing

## SPEC-012 Test Tampering Reported

`spec_check` reports, for each test file edited since it was staged, whether it was deleted from the work tree, which skip or only markers (`.skip(`, `.only(`, `xit(`, `xdescribe(`, `test.todo(`, `it.todo(`) the work tree added over the index, and whether its assertion-call count dropped (`tampered`, beside the unchanged `changedSinceStaged`).

Given index and work tree texts are injected
When a file is deleted, a marker is added, or an `expect(` is removed
Then each yields a `tampered` entry

Given a marker the index already had, or an edit that keeps both counts
When `spec_check` runs
Then it yields no `tampered` entry

Given a path with non-ASCII characters
When `spec_check` reports it
Then it appears under its own name
And git runs with `core.quotePath=false`

## SPEC-013 Cited Tests without Assertions Listed

`spec_check` lists each test block that cites a defined requirement ID and calls no assertion (`citedUnasserted`: `id`, `file`, `line`), as a documented heuristic.

Given a test block with a cited ID and no `expect(` or `assert` call
When `spec_check` runs
Then it lists the block with its declaration line
And a block that asserts is not listed

Given a `describe` title citing an ID, or a token such as `UTF-8`
When `spec_check` runs
Then neither is treated as a cited block

## SPEC-014 Fault Injection Tests the Checker

The `spec_check` tests inject faults into a clean fixture: a deleted test, an added skip, a removed assertion, a citation-only test, an orphan ID, an inflated requirement, a removed ID and a reworded requirement, each reported in its own field, with the clean fixture reporting nothing.

Given the clean fixture
When `spec_check` runs
Then it yields empty finding lists and no hard finding

Given each planted fault
When `spec_check` runs
Then it yields its expected entry
And no entry in another field

## SPEC-015 Hard Findings Exported

claudetto-spec exports `hardFindings(report: Report): HardFinding[]`, returning the findings that should block completion: malformed specs, `removedIds`, `reworded`, `tampered` and `orphans`.

Given a report with only advice fields (`inflated`, `uncovered`, `changedSinceStaged`, `citedUnasserted`)
When `hardFindings` runs
Then it yields no hard finding

Given a report with blocking fields
When `hardFindings` runs
Then each blocking field yields one `{kind, subject, message}` per entry

## SPEC-016 Stop Blocked Once on Hard Findings

claudetto-spec blocks the main agent's Stop once when the repo has `specs/` and `hardFindings` is non-empty, with a reason holding one line per finding.

Given a hard finding
When the first Stop fires
Then it is blocked with each finding named
And a reworded requirement's line names the ID and says to restore it unless the user named the change

Given `stop_hook_active: true`, a subagent (`agent_id`), advice-only findings, a repo without `specs/` (no git run), a git failure or a thrown error
When Stop fires
Then the Stop passes

## SPEC-009 Always-On Token Cost Cap

claudetto-spec adds at most 150 always-on tokens: the skill description and the deferred tool name, with no agent, output style or rule text.

Given `claude --plugin-dir <abs path> plugin details claudetto-spec`
When the components the model is shown are summed
Then the sum is at most 150 always-on tokens
And a command with `disable-model-invocation: true` is left out of the sum, though `plugin details` counts it

## SPEC-010 Each Part Beats Vanilla

Each part of claudetto-spec beats vanilla Claude Code 2.1.329 on its eval case's Δ in the held-out run, or moves Out with the measured reason.

Given the held-out run's `aggregate-result.json`
When it is read
Then it shows a positive mean Δ, a pinned model and `claudeVersion` 2.1.329 or later

Given a part whose case shows Δ ≤ 0
When the held-out run is reviewed
Then the part is moved Out
