# Review of the Trim Slice (P99)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dotclaude/slices/trim/` (`slice.ts`, `domain/removed.ts`, `domain/sources.ts`) and `tests/dotclaude/trim/`.
The run checked them against `external/agent-failure-dossier/` I01 to I18 and for code smells.
The fix package is P125.

## Confirmed Findings

### F1. I09, dead code: the `trim` domain has no runtime caller

`REMOVED_PARTS` (`domain/removed.ts:16`), `CONTEXT_SOURCES` (`domain/sources.ts:19`), and `rulesAtStart` (`domain/sources.ts:36`) have no importer outside `slices/trim/`.
Only `tests/dotclaude/trim/` reads them, but `just generate` ships them in `plugins/dotclaude/slices/trim/domain/`.
Commit `9b8b5083` added `rulesAtStart`, and no later commit wired it to a caller.
So no user sees the rule tokens that it counts.

```bash
grep -rln -e REMOVED_PARTS -e CONTEXT_SOURCES -e rulesAtStart -e trim/domain src plugins \
  | grep -v /slices/trim/
echo "exit=$?"
```

```text
exit=1
```

Failing test, in `tests/dotclaude/trim/exports.test.ts` (new):

- Input: each export of `src/plugins/dotclaude/slices/trim/domain/*.ts`.
- Expected: each export has an importer in `src/plugins/` outside `slices/trim/domain/`.
- Actual: `REMOVED_PARTS`, `CONTEXT_SOURCES`, and `rulesAtStart` have 0 importers.

If P125 keeps `REMOVED_PARTS` as a list that only tests read, it moves to `tests/`, so it does not ship.

### F2. I09, copy of kernel code: `rulesAtStart` only wraps `src/kernel/rules.ts`

`rulesAtStart` (`domain/sources.ts:36-41`) returns `startRules` and `startRuleTokens` with no change.
Its test (`tests/dotclaude/trim/sources.test.ts:15-24`) repeats `tests/kernel/rules.test.ts:62-74`.

```bash
# $D/probe.ts compares rulesAtStart(m) with the result of the two kernel functions
bun $D/probe.ts
```

```text
same as kernel: true
```

Failing test, in `tests/dotclaude/trim/sources.test.ts`:

- Input: the imports of `domain/sources.ts`.
- Expected: no function of the slice only re-exports `startRules` or `startRuleTokens`.
- Actual: `rulesAtStart` gives the same value as the kernel pair for the same input.

### F3. I15, test of prose: a `trim` test pins the words of a string

`tests/dotclaude/trim/sources.test.ts:9-13` checks that the text of a `CONTEXT_SOURCES` entry holds `.claude/rules/`.
No code reads that text (F1), so the test checks wording and not behavior.
`tests/dotclaude/trim/removed.test.ts:26-31` has the same smell: it checks `reason.length > 0` on prose that no code reads.

```bash
# Copy domain/sources.ts to $D, and change only "in `.claude/rules/`" to "in the rules folder".
# Point a copy of tests/dotclaude/trim/sources.test.ts at the copy, and run it.
cd $D && bun test ./m.test.ts
```

```text
(fail) the sources of context name the rules with no `paths` [0.18ms]
 1 pass
 1 fail
```

Failing test, in `tests/dotclaude/trim/sources.test.ts`:

- Input: `CONTEXT_SOURCES[1].source` with new words and no change of behavior.
- Expected: no test fails.
- Actual: the test at `sources.test.ts:9` fails.

## Unconfirmed Findings

- U1: `startRules` (`src/kernel/rules.ts:107`), through `rulesAtStart`, counts each `.claude/rules/` file of the breakdown as a rule at the start.
  A rule with `paths` that loads after a `Read` could be in the breakdown, and then the count is too high.
  No command showed the breakdown of a session in progress, so this stays unconfirmed.
  F1 makes the effect zero at this time.

## Dossier Check

- I01 (`01` §I01): no failure. `removed.ts:2` takes the parts from the inventory evidence.
- I02 (`01` §I02): no failure. The switches are settings, not prose.
- I03 (`01` §I03): no failure in this slice. `trim` does not set compaction (`DISABLE_COMPACT` comes from another slice).
- I04 (`02` §I04): not applicable. The slice makes no claims.
- I05 (`02` §I05): no failure. `bun test tests/dotclaude/trim/` gives 8 pass, 0 fail, and has no skip.
- I06 (`02` §I06): not applicable.
- I07 (`03` §I07): not applicable. The slice only sets off-switches.
- I08 (`03` §I08): no failure. All 7 keys are in `schemas/claude-code-settings.json`, and the 4 env names are in `external/cc-2.1.296/strings.txt`.
- I09 (`04` §I09): F1 and F2.
- I10 (`03` §I10): not applicable. No input crosses a trust boundary.
- I11 (`04` §I11): not applicable.
- I12 (`04` §I12): no failure. The slice removes start context, but F1 means that no user sees the rule tokens.
- I13 (`06` §I13): not applicable.
- I14 (`06` §I14): not applicable in this slice. The `setup` slice writes the settings.
- I15 (`06` §I15): F3.
- I16 (`07` §I16): no failure. `removed.ts:6` adds no switch without a measurement.
- I17 (`07` §I17): not applicable. There are no background jobs.
- I18 (`07` §I18): not applicable. The slice does no I/O.

Other smells: the slice has no bound outside `limits.ts`, no silent `catch`, and no tool error read as a negative.
