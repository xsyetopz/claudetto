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

- [x] **RISK-510** A you-should-know card states how a tool behaves from the model's belief, and the belief is false (issue #65).
  Category: you-should-know
  Cause: The propose prompt ties only an absence claim to evidence in the session (RISK-500); a claim about how a tool behaves can rest on what the model remembers.
  Event: Dogfood, claude 2.1.327, 2026-11-20, clone at fea3d5562: after a force-added commit under the gitignored `reports/`, a Heads up card said later edits to that file would be silently ignored; `git status --short` after an edit printed `M` for it.
  Consequence: The user is told a false fact and may act on it.
  Likelihood: 2
  Impact: 2
  Existing controls: The confidence bullet in `hooks/request/propose-text.ts` asks for confidence and says to reply learn: none when evidence is incomplete; the person can dismiss the card.
  Response: accept
  Actions: none; recount false cards in later dogfood rounds.
  Trigger: A second false tool-behaviour card in dogfood.
  Owner: you-should-know
  Status: accepted 2026-11-20; Likelihood 2 × Impact 2 = 4, and the only candidate did not beat the current prompt.
  Verified: 2026-11-20, claude 2.1.327, claude-sonnet-5-5, replay of the propose request on the dogfood session, 6 per arm, $0.913 (reports/2026-11-20-research/ysk-tool-claim): current prompt 1 false card of 6 replies, with a sentence tying tool-behaviour claims to session output 2 false of 6.
  Source: issue #65.

- [x] **RISK-527** A you-should-know offer stays up after later steps of the same turn make it untrue.
  Category: you-should-know
  Cause: After an offer was stored for a turn, every later check of that turn was skipped and nothing revisited the shown line, so a note such as "the test fails because X" stayed above the prompt after the agent fixed X.
  Event: An offer shown at step 3 described a failure the agent repaired in the following steps; the card stayed until two prompts had passed.
  Consequence: The user is told a false fact and may act on it.
  Likelihood: 3
  Impact: 2
  Existing controls: The person can dismiss the card, and it clears after two prompts.
  Response: mitigate
  Actions: Recheck the untouched offer at later check steps and at the main agent's turn end with one fork that answers KEEP or DROP, failing open (REQ-YOU-SHOULD-KNOW-075).
  Trigger: A card whose line a later step of the same turn contradicted.
  Owner: you-should-know
  Status: closed 2026-11-21. `hooks/check/recheck.ts` withdraws the offer on DROP; every fault keeps it.
  Verified: claude 2.1.330, 2026-11-21, `claude plugin test plugins/claudetto-you-should-know`: 170 pass, 0 fail (hooks/**tests**/recheck.test.ts).
  Source: bug report, 2026-11-21.
