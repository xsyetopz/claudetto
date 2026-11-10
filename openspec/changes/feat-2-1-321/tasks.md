# Tasks

Each slice is one commit, with its failing test first where it changes behavior. Run the narrowest `just` recipe after each slice and `just check` once per group. A code such as P16 points at a row of the Probe Record in `design.md`.

## 1. Baseline and Free Probes

- [x] 1.1 Record the baseline in `design.md`: source lines under `plugins/claudetto/hooks`, the `jscpd` figures, the count of `catch` sites that drop their error, and the result of `just check`. Done: P1, P2, P4. Three recipes of `just check` fail on HEAD.
- [x] 1.2 Find a way to leave paths out of an install. Done: P5 and P6 refute it. An install copies every file, and the lab loads a test only from inside the plugin folder. Decision 15 moves the Bun-run files.
- [x] 1.3 Probe whether a hooks module can import `node:path`, a package, or a JSON file. Done: P7. The loader refuses all three.
- [x] 1.4 Probe whether a noun one plugin adds reaches another plugin. Done: P8. It does in a live session, but a consumer with a `dependencies` entry does not load alone and the lab cannot test the path, so the Non-Goal stands.
- [x] 1.5 Record the status a refused key returns. Done: P9. No header gives 403, a made-up key gives 401, and an expired key stays a hypothesis.
- [x] 1.6 Confirm each dead export and impossible guard of decision 17 by a search or a type check. Done: P11, P22, P23, P31. Six exports and three guards have a use and stay.
- [x] 1.7 Remove the two clones that `4e4f73ca` added (`limits/verify.test.ts [102-107]` against `[117-122]`, and `handoff.mock.ts [28-35]` against `limits/open-items.mock.ts [6-13]`). Check: `just clones` exits 0.
- [x] 1.8 Repair the 13 INVALID main specs: shorten each of the 17 requirement texts over 500 characters by moving detail into a scenario, write the 2 placeholder Purpose sections, and give the `surface-trim` scenario "Loaded in Full" its THEN step. Change no requirement's meaning. Check: `just validate` exits 0.
- [ ] 1.9 The person's run in a plain shell passed 11 of 11, so the sandbox causes the two failures in `tools/manifest.test.ts` (P37). Take the niceness out of the test "a job count and a memory limit the user set are kept", which is about the three variables. Split the other test in two: one asserts the three variables, and one asserts niceness 10, reads it with `perl -e 'print getpriority(0,0)'` instead of `ps`, and is skipped with a stated reason where a probe `renice` is refused. Check: `just verify` exits 0 inside the sandbox, and all tests of the file run and pass in a plain shell.
- [x] 1.10 Write a failing test in `tools/manifest.test.ts`: after three session starts the env file holds the `renice` line once (today it holds three, and this session's file holds 12, P39). Then make the `SessionStart` command in `plugins/claudetto/hooks/hooks.json` append only when the file does not yet hold that line. Check: `bun test tools/manifest.test.ts` passes, and the test "after two session starts" still passes.

## 2. Structure, with No Behavior Change

- [ ] 2.1 Merge `register-first.ts`, `register-last.ts`, and the pass-through `limits.ts` into `register.ts` in the same order, and delete the three files. Check: `just check` passes with no test's expected value changed.
- [x] 2.2 Call `mcp__jscpd__get_file_clones` on each file in the table of decision 13. Give `isRecord`, `ANY_TOOL`, the writer list, and `signature` one definition each and import it elsewhere, with a test first that `/./u` and `/^/u` match the same tool names. Rename the two `USER_COMMAND` patterns and the two `watchDenials` functions so each name says what it matches or watches. Read both `textOf` functions and merge them only if they do the same work.
- [x] 2.3 Remove the `Io` interface and the two `Session` interfaces that only forward to `$`, and pass `$` to their callers. Keep `Files` of the statusline reader, which wraps `node:fs/promises` and has a second implementation in its test (P41).
- [x] 2.4 Apply the table of decision 17: delete `JevError.status`, `render`, and the copy of `signature` in `limits/admit.ts`; drop `export` from `assertedPhrases`, `offeredCodes`, and `Verdict`; delete the `tool_use_id` guards in `limits/price-step.ts:139-140` and `limits/bound-output.ts:152-153` with the false comment, and the `plan_mode` guard in `surface.ts:203`. Keep every item the table marks "Keep".
- [x] 2.5 Delete the `disable` and `override` code in `scripts/vendor-rules.ts:150-181` and the two empty keys in `rules.patch.json`, and keep `add` with its five rules. Check: the vendoring recipe writes the same `rules.generated` files, byte for byte.
- [x] 2.6 Split each function past the lint limits (30 lines, complexity 10, nesting 2, 4 parameters) in `limits/price-step.ts`, `delegation.ts`, `slices.ts`, `limits/hold.ts`, `surface.ts`, and `limits/stop.ts`.
- [x] 2.7 Remove each internal note from source: decision and task IDs, issue numbers, paths into `openspec/`, and history. Keep each comment that gives a reason the code cannot show.
- [x] 2.8 Move the Bun-run files out of the plugin folders, as decision 15 lists them: the two `*.spec.ts` files, the fixture helpers, and `fixtures/` of `claudetto-openspec` to `tests/claudetto-openspec/`, and `secrets.spec.ts` to `tests/claudetto/`. Move `nodeFs` to `tools/` and point `tools/openspec-validate.ts` and the fixture kit at it. Leave each `*.test.ts`, each `*.mock.ts`, and `memory-fs.ts` in place. Add the repository test that lists each plugin folder's files and fails on a `*.spec.ts` file, a `fixtures` folder, or a `fixture-*.ts` file. Check: `just verify`, `just validate`, and `just lab` pass, and `plugins/claudetto-openspec` holds under 110,000 bytes.
- [x] 2.9 Run `mcp__jscpd__check_current_directory`. Check: `just clones` reports 0 new clones.

## 3. Faults

- [ ] 3.1 Add the repository test that runs `claude plugin validate --strict --json` on each plugin and fails on a `tool.check` or `tool.call` gating hook whose `hasCatch` is false. Then give each such registration its own `.catch` that returns a refusal with `next.error.message`, or the `kind` when there is none, and calls nothing. Rewrite the handler in `gate/watch.ts:150-156` the same way, with `$` as the name of its first parameter. Add a lab test per guard that a throw before `next` refuses the call and the tool does not run.
- [ ] 3.2 Replace each of the 64 `catch` sites that bind no error in `plugins/*/hooks` with a log line through `$.ui.log` or a rethrow. Start with `parseFaults` in `verify.ts`, whose bare `catch` turns a bad answer into a clean reply.
- [ ] 3.3 Log each swallowed fault in `plugins/claudetto-you-should-know/hooks` through `$.ui.log`, and keep it away from the person.
- [ ] 3.4 Write a failing lab test for `watchResults`: a tool result with no `text`, whose `result` object holds a string with `export API_TOKEN=…` after a line break, reaches the model unredacted today. Then scan each string of the result as raw text. Check: the test passes, and `redactAll` still returns the same shape.

## 4. The Decider

- [ ] 4.1 Call `mcp__jscpd__check_duplication` with the planned module, then create `plugins/claudetto/hooks/decider/` and move the Jev client into it with its 5,000 ms race. Tests use a fake `fetch` and a fake `$.model.complete`, and make no network call.
- [ ] 4.2 Write `settle`: bundle the questions, post once with model `jev-1.14.0`, and turn each answer into a bounded answer by its set's thresholds. Catch a throw from `$.http.fetch`, log it, and fall back. Test each scenario of "Jev Answers First When a Key Is Set" and "One Module Owns Every Typed Question".
- [ ] 4.3 Write the fallback: one `$.model.complete` call to `claude-haiku-5-5` at `high`, a fixed block with `cache: true`, state in named tags, a JSON answer by question name, and the evidence check. Test each row of the table in decision 4 and each scenario of "A Fallback Yes Carries Evidence", with `isAnswered: false` for the reasons `api-error`, `aborted`, and `refusal`.
- [ ] 4.4 Redact the state before a request to Jev: pass each string field through `redact` as raw text, joined by line breaks in one scanner process, and build the request from the redacted strings. Write the failing test first: a field that holds `export API_TOKEN=…` after a line break leaves the request redacted. Take the fallback when the scan fails. Add the size bound of decision 4 as one named constant.
- [ ] 4.5 Add escalation for a question set that asks for it, with the two scenarios of "An Unsettled Noul Escalates Where the Site Asks".
- [ ] 4.6 Read the key with `$.env.get("TYPESAFE_API_KEY")` in the Decider and the `decide` tool. Delete the `typesafeApiKey` option, its `userConfig` entry, and its tests. In `.env.example` and `README.md`, say that the variable is read from the launching shell or the settings `env` block and not from a project `.env` file. Add the repository test that reads the validator's environment note and fails when a second module reads the variable.

## 5. Recorded Checks, Paid, Each After the Person Approves

- [ ] 5.1 Build the case files for the claim check, the ledger, and the branch gate from the spec scenarios and the lab tests' inputs, each with the expected answer written by hand. Split each set into tuning cases and held-out cases. Ask the person before reading past sessions for more cases.
- [ ] 5.2 Ask the person for permission, a budget, and a go-ahead on the data the cases hold, and say that `TYPESAFE_API_KEY` will be used. Then run the claim-check cases through today's Haiku and Sonnet prompts and through the Decider, keep each exact request payload, and record in `docs/`: both scores, the cost, the weekly share, `usage.cache_read_input_tokens` of each fallback request after the first, the largest output usage against `maxTokens` plus 2,048, and the size in characters and tokens of the largest state Jev accepts. Set the size bound of decision 4 from the last figure.
- [ ] 5.3 From the 5.2 run, record the share of Nouls that land in the unsettled band and the fallback's score on them, and set the claim-check thresholds from the tuning cases only.
- [ ] 5.4 Run the ledger cases the same way, with sentences that lean on the sentence before them and a pasted log among them, and set the cap on sentences per message from the result.
- [ ] 5.5 Run the branch-gate cases the same way against today's `askedToDelete`.
- [ ] 5.6 For each site whose Decider score on the held-out cases is below today's, revise this change with the `update` skill: remove the site's delta and its tasks in group 6, and record the scores in `design.md`.

## 6. Sites, Each Only After Its Check in Group 5 Passes

- [ ] 6.1 Branch gate: replace `gate/asked.ts` with the Noul and its table, and delete the three patterns and their tests.
- [ ] 6.2 Claim check: write the question set and the fault table of decision 9, with a test per table row that makes no model call.
- [ ] 6.3 Claim check: replace `VERIFY_GRADE`, the Haiku call, the Sonnet call, and the quote parser with one `settle` call, and delete them with their tests.
- [ ] 6.4 Ledger: write the sentence split with `Intl.Segmenter`, the cap that 5.4 set, the question set, and the table of decision 10, with the first call of a process covering every earlier message.
- [ ] 6.5 Ledger: replace the extraction prompt, its parser, and the quote check with the `settle` call, and delete them with their tests.
- [ ] 6.6 `decide` tool: point it at the moved client, keep its three tries and its hand-back text, and add the scenario "The Removed Option".

## 7. Agent-Seen Text

- [ ] 7.1 Read through `clawdipedia-docs` the sections not yet read: "Mark pasted text in user messages" in the Opus 5.5 guide, "Review instructions written for earlier models" in the Fable 5.2 guide, and the rest of the general best practices. List in `design.md` each rule they add.
- [ ] 7.2 Add the repository test that reads every description (each plugin, skill, command, agent, output style, `userConfig` option, registered tool, and rewritten built-in tool text) and fails on one over 200 characters. Then shorten the 18 that P26 lists. For each rule that leaves a description, record where it went: a parameter description, the root prompt, or dropped with its reason.
- [ ] 7.3 Add the repository test that fails on a `$.model.complete` call without `effort` or a full model ID, then set both on the setup advice call and the `claudetto-you-should-know` default, with `maxTokens` from recorded usage.
- [ ] 7.4 Review each root prompt, subagent body, skill body, output style, and hook text against the guide of each model that receives it, rewrite each bare prohibition as an action with its reason, and record the pages read in `design.md`.
- [ ] 7.5 Run `just prompt-bytes` before 7.2 and after 7.4 and record both totals; the added prompt bytes must not grow.
- [ ] 7.6 Ask the person for permission and a budget, then run `claude plugin eval --ablation` on the stored cases before 7.2 and after 7.4, and record both results, the cost, and the weekly share. A text whose cut lowers the result gets its rule back in the root prompt.

## 8. Finish

- [ ] 8.1 Update `README.md` (what a key sends, where it is read, and that a sandboxed command keeps niceness 0 because the sandbox refuses `renice`), `.env.example`, and `CHANGELOG.md` (the breaking changes, and the three numbers of 1.1 before and after, each with its command).
- [ ] 8.2 Run `just check` and `just verify`, and fix each failure at its cause.
- [ ] 8.3 Call the tool with `{action:"validate", change:"feat-2-1-321"}` and fix every issue.
- [ ] 8.4 Write a failing lab test in `plugins/claudetto-openspec/hooks`: a change whose MODIFIED requirement grows from under 500 characters in the main spec to 501 validates with no warning today (P36). Then make the change check warn in that case and only in that case, as the `lean-openspec` delta requires. Check: both scenarios of the delta pass, the ported upstream cases still pass, and this change still validates.
