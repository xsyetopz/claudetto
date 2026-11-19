# You Should Know Risks

## You Should Know

- [x] **RISK-420** One verdict of the you-should-know side check stops every later call of the turn.
  Category: you-should-know, keying.
  Cause: startCheck returns the shown note for every call while row.view is an offer from the same turn, and checkBefore hands later concurrent calls the same result.
  Event: 7 calls stopped in one turn: a deletion note stopped an ls or sed, a Write, and a bun run that deleted nothing; a premise-false note stopped three Edits.
  Consequence: blocked work for calls that break nothing.
  Likelihood: 3 (reproduced once from a log).
  Impact: 3.
  Existing controls: none at baseline (plugins/claudetto-you-should-know exists; a grep for `tool_use_id|toolUseId` in `plugins/claudetto-you-should-know/hooks/` at 088a227c finds none, so no keying by call id exists). The cure: key the offer by the call's tool_use_id (documented identical at every event of the call) and let other calls run their own check.
  Response: mitigate.
  Actions: key the offer by tool_use_id; test two concurrent calls with different verdicts.
  Trigger: two calls of one turn stopped by one note.
  Owner: you-should-know.
  Status: closed. Obsolete: the plugin has no tool.call hook (ADR-0174) and no digest (ADR-0114).
  Verified: grep -rnE "tool\.call|toolUseId|digest" plugins/claudetto-you-should-know/hooks finds no code match, claude 2.1.327, 2026-11-18.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:554-556 (measured).

## Ungrouped

- [x] **RISK-421** The you-should-know digest reports a denied call as one that ran.
  Category: you-should-know
  Cause: The digest logged `called {...}` before the call and never logged its outcome (`register.ts:275` at the time).
  Event: The side-agent note said the sandbox-off `ls` ran and counted files, but permission had denied it.
  Consequence: The user is told a false fact.
  Likelihood: 3
  Impact: 2
  Existing controls: The fix `logOutcome` logs `the call was denied and did not run: <reason>` and `the call failed: <text>`; lab 97 of 99 before, 99 of 99 after (`register.ts:240` at 088a227c).
  Response: mitigate
  Actions: Keep the two tests in `register-check.test.ts`.
  Trigger: A denied or failed call.
  Owner: you-should-know
  Status: closed. Obsolete: the digest and its log are gone (ADR-0114), so a denied call cannot be logged as one that ran.
  Verified: grep -rnE "called \{|logOutcome|digest" plugins/claudetto-you-should-know/hooks finds no code match, claude 2.1.327, 2026-11-18.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:2433; observed in transcript, 2026-11-16

- [x] **RISK-500** A you-should-know card claims something is absent from a file after the session showed only part of it.
  Category: you-should-know
  Cause: The propose prompt asked for complete evidence but did not say that an absence claim needs the whole file, so a partial Read or a grep slice passed as proof of absence.
  Event: A card stated that a file lacked something the file held outside the shown slice.
  Consequence: The user is told a false fact.
  Likelihood: 3
  Impact: 2
  Existing controls: The confidence bullet in `hooks/propose-text.ts` says an absence claim rests on the file's full text appearing in the session; `prompt.test.ts` pins it.
  Response: mitigate
  Actions: Keep the sentence and its test; count false absence cards in the next dogfood run.
  Trigger: A card whose claim is that something is missing.
  Owner: you-should-know
  Status: mitigated 2026-11-19 (issue #46). Live check: two absence cards in dogfood sessions after the fix, and both were true (0 false of 2).
  Verified: dogfood, claude 2.1.327, 2026-11-19, clone at 26cc57577, session 1bd6ee38: the card "The README never mentions the includeGitInstructions option" followed a grep of the whole README for each userConfig key; grep -c includeGitInstructions plugins/claudetto/README.md in that clone -> 0. Sample of one; the count continues in later dogfood runs.
  Verified: dogfood, claude 2.1.327, 2026-11-19, clone at ba45d6dcf, same isolated config: during a register audit the card "Many risk entries have no Likelihood or Status line, and some have two Status lines" fired; a parse of plans/rebuild/risk-register/*.md in that tree -> 102 entries with neither line (each a one-line "Moved Out as OUT-N" entry) and 42 with two or more Status lines. Second sample; 0 false of 2.
  Verified: claude 2.1.327, 2026-11-19, `claude plugin test plugins/claudetto-you-should-know`: 160 pass, 0 fail.
  Source: observed in a dogfood session on 2.1.327, 2026-11-19
