# Review of the Prompt Slice (P90)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
The scope is `src/plugins/dotclaude/slices/prompt/`, its lab tests, and `tests/dotclaude/prompt/`.
`bun test tests/dotclaude/prompt` gives 130 pass and 0 fail.
`claude plugin test plugins/dotclaude` gives 130 pass and 0 fail, and that includes `section.test.ts` and `variants.test.ts`.
The probes are in `$TMPDIR/p90/` and import `plugins/dotclaude/slices/prompt/`.

## Confirmed Findings

### F1 (I02, Contract): `prompt.compose` Ignores the `DISABLE_COMPACT` Gate

`adapters/mod.ts:22-25` applies `transformText` to every section, and `context_management` is one of them.
The gate is only in `onSection` at `adapters/mod.ts:45-48`.
The rule at `wiki/dotclaude/Prompt-Surface.md:50-51` says that the transform applies only with `DISABLE_COMPACT`.

```text
$ bun $TMPDIR/p90/compose.ts   # DISABLE_COMPACT unset
compose, DISABLE_COMPACT unset: "Compaction is off. Work continues in this context window, ..."
```

- Input: `prompt.compose`, with the engine section `context_management` and no `DISABLE_COMPACT`.
- Expected: the engine text stays.
- Actual: the text says "Compaction is off".
- Test file: `src/plugins/dotclaude/slices/prompt/lab/variants.test.ts`.

### F2 (I01): A Spawn With No `model` Gets the Block of the Parent Model

`adapters/mod.ts:35` uses `parentModel` when `e.model` is undefined.
`.claude-plugin/types/claude-code/index.d.ts:294-295` says that in that case the model of the agent decides first, and the parent decides only after it.
`investigator` sets `model: claude-haiku-5-5`.

```text
$ bun $TMPDIR/p90/spawn.ts
investigator, no model param, has step line: false has verify line: false
```

- Input: `agent.spawn` with `subagentType: "investigator"`, no `model`, and `parentModel: "claude-opus-5-5"`.
- Expected: the Haiku block, which has `STEP_LINE` and `VERIFY_LINE`.
- Actual: the Opus block.
- Test file: `src/plugins/dotclaude/slices/prompt/lab/variants.test.ts`.

### F3 (I10): Each Variant Drops the `intro` Rules

`domain/apply.ts:21-29` puts `intro` in `KNOWN_SECTIONS`, and `domain/variants.ts:28-36` has no section that takes its place.
So the authorized-security policy and the URL rule go for all four models.
`transforms/intro.ts` keeps both rules, but that transform never reaches a shipped model.

```text
opus has security policy: false has URL rule: false
(sonnet, haiku, fable: the same)
```

- Input: `composeSections([{ id: "intro", ... }], k)` for each key `k`.
- Expected: the output holds `transformText("intro", text)`.
- Actual: no section of the output comes from `intro`.
- Test file: `tests/dotclaude/prompt/variants.test.ts`.
- Confidence that this is a defect: medium.
  The run found no design text that says that the drop is intended.

### F4 (Smell, a Bound Outside `limits.ts`): Unpinned Copies of Kernel Bounds

`slice.ts:55` and `slice.ts:62` copy `CONTEXT_WINDOW` from `src/kernel/budget.ts:14` as `"300000"`.
`slice.ts:85` copies `BASH_OUTPUT_MAX_CHARS` from `budget.ts:39` as `4000`.

```text
$ grep -rn -e CLAUDE_CODE_AUTO_COMPACT_WINDOW -e CLAUDE_CODE_MAX_CONTEXT_TOKENS \
    -e bashOutputMaxChars tests tools
exit 1
```

- Input: `slice.settings`.
- Expected: each copy equals `String(CONTEXT_WINDOW)` or `BASH_OUTPUT_MAX_CHARS`.
- Actual: the values are equal today, so this test passes now.
  It fails only when the bound changes in one place.
- Test file: `tests/dotclaude/prompt/bounds.test.ts`.

## Unconfirmed Findings

- `slice.ts:175-178`: the `rm` ask globs.
  These are known, and P143 fixes them.
- `slice.ts:145-146`: if `*` spans spaces, then `Bash(rm -rf /*)` and `Bash(rm -rf ~/*)` deny every `rm -rf` of an absolute path or a home path.
  No command in the workspace shows how Claude Code matches the rule.
  This goes to the P143 audit.
- `slice.ts:174`: `Bash(git restore *)` also asks on `git restore --staged`, which loses no work (I10, an ask with no need).
- `slice.ts:170-171`: these rules miss `git clean -xdf`, but the guard at `guard/domain/matchers/git.ts:146` catches it.
- `transforms/system.ts:28-31` keeps the line "The system compresses earlier messages", although `DISABLE_COMPACT=1`.
  It applies only to a model with no variant.
- The transforms of the seven `KNOWN_SECTIONS` are dead code for the four models that `enforceAvailableModels` allows.
  A user setting can make them reachable.
- `adapters/mod.ts:17`: the `variants` map is never cleared.
- `denied-names.test.ts:47-50` leaves out the texts in `texts.ts/`.
  Those texts are clean today.

## Checked With No Finding

- I03, I04, I05, I06, I11, I12, I13, I14, I16, and I17.
- I15: `lab/section.test.ts:18` checks for words that must not appear (a nit).
- These smells: a silent `catch`, a tool error read as a negative, and a copy of kernel code other than F4.
- `extract.test.ts` skips in CI, and its header says so.
- The run did not check I08, which covers the env var names, or I18.

The guard stopped `cat` of `external/cc-extract/2.1.296/section/context_management.txt` and `head -60 tools/lab.ts` with "This command only prints a file", and the run used `Read`, the tool that the guard named.
The lab run hit a sandbox deny for `api.anthropic.com`, but the tests still ran.
