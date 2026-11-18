# You Should Know Risks

## You Should Know

- [ ] **RISK-420** One verdict of the you-should-know side check stops every later call of the turn.
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
  Status: open.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:554-556 (measured).

## Ungrouped

- [ ] **RISK-421** The you-should-know digest reports a denied call as one that ran.
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
  Status: mitigated
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:2433; observed in transcript, 2026-11-16
