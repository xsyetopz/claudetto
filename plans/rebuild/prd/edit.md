# Edit Requirements

## Perl Batch Edit

- [x] **REQ-EDIT-001** claudetto shall let the agent do many edits in one `Bash(perl -0pi -e ...)` call in place of many `Edit` calls; no batch tool is registered ([ADR-0097](../adr/0097-batched-edit-tool.md)).
  Acceptance: a change to 10 places of one file takes one tool call. Verification: demonstration.
  Basis: user decision. Status: done 2026-11-19: one `perl -0pi -e` call edits many places of a file under the allow rule of REQ-EDIT-002 with no prompt (same probe)
  Source: user answer through AskUserQuestion, 2026-11-16 18:04 UTC, all 14 builtins off, perl allowed with a diff hook, settings rewritten (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5034).
  Verified: PASS: local `perl -0pi -e` on a scratch file changed 10 matches in one call. Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.

- [x] **REQ-EDIT-002** claudetto shall allow `Bash(perl -0pi -e *)` in permissions and run a `PostToolUse` hook on its result that prints `git diff --stat` of the touched files and tells the model to Read each touched file before a Write, because Write refuses a file changed after its Read (chunk-m14bt1pz.js@1756990, claude 2.1.327).
  Acceptance: under `acceptEdits` the perl call runs with `decision: accept, source: config`, the hook shows the diff stat, and a Write after the re-Read succeeds where the same flow without the hook fails with "File has been modified since read". Verification: probe.
  Basis: user decision. Status: done 2026-11-19: `Bash(perl -0pi -e *)` and `Bash(perl -pi -e *)` in the settings fill (`hooks/settings/defaults.ts`), and `hooks/edit/perl.ts` adds the diff stat and the re-Read step as context of the call; a `tool.call` hook gives the same context a `PostToolUse` hook would. Probe, claude 2.1.327, 2026-11-19, cc-inspect cli under `acceptEdits`: the perl call ran with no prompt, the model read " a.txt | 2 +-" with the re-Read step, and Read then Write of the same file succeeded` only)
  Source: user answer through AskUserQuestion, 2026-11-16 18:04 UTC, all 14 builtins off, perl allowed with a diff hook, settings rewritten (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5034); probe, `claude` 2.1.325, 2026-11-16: without the allow rule `perl -0pi` was denied, "requires approval" (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290).
  Verified: PASS (partial): hooks/edit/__tests__/perl.test.ts passes inside `$C plugin test plugins/claudetto` (105 pass), binary 2.1.327, 2026-11-19; perl.ts:23 adds the Read-again note after the diff stat; defaults.ts:50 allows both perl patterns; code search finds 'File has been modified since read' at chunk-m14bt1pz.js@5528167. The Write failure/success comparison could not be shown: cc-inspect calls cannot take the temp project path, so Read fails and Write creates a new file.
  Verified: probe, claude 2.1.327, 2026-11-19: the note was missing for `git grep -l x | xargs perl -pi -e ...` and for `do perl -pi` in a loop, because `PERL_EDIT` matched perl only first or after `;&|({`; `PERL_EDIT` now also matches after `xargs`, `do`, `then`, `else` and `-exec` (`hooks/edit/perl.ts:9`). `claude -p` with the plugin, transcript kept: the model quoted the diff stat and the re-Read step after the `xargs` form. `claude plugin test plugins/claudetto`: 129 pass, 0 fail; the old pattern restored in a copy fails the new test (128 pass, 1 fail).

## Read Prefix Tab

- [x] **REQ-EDIT-003** claudetto shall run an `Edit` whose `old_string` carries one leading tab too many on every line (the tab after the line number in `Read` output) with that tab dropped from `old_string` and `new_string`, when the file lacks the string as written and holds the shortened one once (or the call replaces all), and tell the model why (RISK-419).
  Acceptance: on a tab-indented file the first `Edit` succeeds where vanilla fails with "String to replace not found", and the edited lines keep the file's indentation. Verification: test and probe.
  Basis: measured. Status: done 2026-11-19: `hooks/edit/tabs.ts` with `tabs.test.ts` (4 tests; a mutant that keeps `new_string` fails 3). Probe on claude-sonnet-5-5, claude 2.1.327: first `Edit` failed in 6 of 6 vanilla runs and 0 of 6 with the hook.
  Verified: PASS: edit/__tests__/perl.test.ts passes and asserts the note; the probe leg was not run. Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.
