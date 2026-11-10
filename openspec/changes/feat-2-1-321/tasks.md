# Tasks

Each slice is one commit, with its failing test first where it changes behavior. Run the narrowest `just` recipe after each slice and `just check` once per group.

## 1. Baseline and Free Probes

- [ ] 1.1 Record the baseline in `design.md`: source lines under `plugins/claudetto/hooks` (no tests, no `rules.generated`), the `jscpd` clone count for the source files under `plugins/*/hooks`, the count of `catch` sites that drop their error, and the result of `just check`.
- [ ] 1.2 Read the plugin reference and marketplace pages through `clawdipedia-docs` for a way to leave paths out of an install. Record the page and the finding in `design.md` under decision 15, and choose the road: an exclude list, or a move to `tests/<plugin>/`.
- [ ] 1.3 Probe in `$TMPDIR` whether a hooks module can import `node:path` and a package from `node_modules`. Record the command and the result in `design.md` under Non-Goals.
- [ ] 1.4 Probe in `$TMPDIR`, with two throwaway plugins, whether a noun one plugin adds through manifest `types` reaches the `$` of a plugin that names it in `dependencies`. Record the result in `design.md` under Non-Goals.
- [ ] 1.5 Read the TypeSafe errors and HTTP API pages again for the status an expired key returns. If the pages do not say, mark the 403 row in decision 4 as unconfirmed and leave it in the table.
- [ ] 1.6 Confirm each dead export and each impossible guard that decision 17 lists by a search for its uses, and strike from the list each one that has a use.

## 2. Structure, with No Behavior Change

- [ ] 2.1 Merge `register-first.ts`, `register-last.ts`, and the pass-through `limits.ts` into `register.ts` in the same order, and delete the three files. Check: `just check` passes with no test's expected value changed.
- [ ] 2.2 Call `mcp__jscpd__get_file_clones` on each file that holds `isRecord`, `ANY_TOOL`, a writer list, `signature`, `USER_COMMAND`, `watchDenials`, or `textOf`. Give each one home and import it elsewhere.
- [ ] 2.3 Remove the `Io`, `Session`, and `Files` interfaces that only forward to `$`, and pass `$` to their callers.
- [ ] 2.4 Delete the dead exports and impossible guards that 1.6 confirmed, each with its tests.
- [ ] 2.5 Delete the `disable` and `override` code in `scripts/vendor-rules.ts` and the empty keys in `rules.patch.json`. Check: the vendoring recipe writes the same `rules.generated` files, byte for byte.
- [ ] 2.6 Split each function past the lint limits (30 lines, complexity 10, nesting 2, 4 parameters) in `limits/price-step.ts`, `delegation.ts`, `slices.ts`, `limits/hold.ts`, `surface.ts`, and `limits/stop.ts`.
- [ ] 2.7 Remove each internal note from source: decision and task IDs, issue numbers, paths into `openspec/`, and history. Keep each comment that gives a reason the code cannot show.
- [ ] 2.8 Take tests, test support (the eight `*.mock.ts` files, `memory-fs.ts`, `fixture-kit.ts`), and fixtures out of the install by the road 1.2 chose, and add the repository test that lists an install's files.
- [ ] 2.9 Run `mcp__jscpd__check_current_directory` and remove each exact clone it reports among the source files under `plugins/*/hooks`.

## 3. Faults

- [ ] 3.1 Add a `.catch` that refuses with the failure text to each `tool.check` registration and each `tool.call` registration that can deny, with a test per guard that a throw refuses the call.
- [ ] 3.2 Replace each `catch` that drops its error in `plugins/claudetto/hooks` with a log line through `$.ui.log` or a rethrow.
- [ ] 3.3 Log each swallowed fault in `plugins/claudetto-you-should-know/hooks` through `$.ui.log`, and keep it away from the person.

## 4. The Decider

- [ ] 4.1 Call `mcp__jscpd__check_duplication` with the planned module, then create `plugins/claudetto/hooks/decider/` and move the Jev client into it. Tests use a fake `fetch` and a fake `$.model.complete`, and make no network call.
- [ ] 4.2 Write `settle`: bundle the questions, post once with a 5,000 ms deadline and model `jev-1.14.0`, and turn each answer into a bounded answer by its set's thresholds. Test each scenario of "Jev Answers First When a Key Is Set" and "One Module Owns Every Typed Question".
- [ ] 4.3 Write the fallback: one `$.model.complete` call to `claude-haiku-5-5` at `high`, a cached fixed block, state in named tags, a JSON answer by question name, and the evidence check. Test each row of the table in decision 4 and each scenario of "A Fallback Yes Carries Evidence".
- [ ] 4.4 Redact the state with `redact` from `secrets.ts` before a request to Jev, and take the fallback when the scan fails. Measure the scan's time on a state of 8 tool results and record it in `design.md` under Risks.
- [ ] 4.5 Add escalation for a question set that asks for it, with the two scenarios of "An Unsettled Noul Escalates Where the Site Asks".
- [ ] 4.6 Read the key with `$.env.get("TYPESAFE_API_KEY")` in the Decider and the `decide` tool. Delete the `typesafeApiKey` option, its `userConfig` entry, and its tests, and fix the `TYPESAFE_API_KEY` line in `.env.example`.

## 5. Recorded Checks, Paid, Each After the Person Approves

- [ ] 5.1 Build the case files for the claim check, the ledger, and the branch gate from the spec scenarios and the lab tests' inputs, each with the expected answer written by hand. Split each set into tuning cases and held-out cases. Ask the person before reading past sessions for more cases.
- [ ] 5.2 Ask the person for permission, a budget, and a go-ahead on the data the cases hold, and say that `TYPESAFE_API_KEY` will be used. Then run the claim-check cases through today's Haiku and Sonnet prompts and through the Decider, keep each exact request payload, and record both scores, the cost, and the weekly share in `docs/`.
- [ ] 5.3 From the 5.2 run, record the share of Nouls that land in the unsettled band and the fallback's score on them, and set the claim-check thresholds from the tuning cases only.
- [ ] 5.4 Run the ledger cases the same way, with sentences that lean on the sentence before them and a pasted log among them, and set the cap on sentences per message from the result.
- [ ] 5.5 Run the branch-gate cases the same way against today's `askedToDelete`.
- [ ] 5.6 For each site whose Decider score on the held-out cases is below today's, revise this change with the `update` skill: remove the site's delta and its tasks in group 6, and record the scores in `design.md`.

## 6. Sites, Each Only After Its Check in Group 5 Passes

- [ ] 6.1 Branch gate: replace `gate/asked.ts` with the Noul and its table, and delete the three patterns and their tests.
- [ ] 6.2 Claim check: write the question set and the fault table of decision 9, with a test per table row that makes no model call.
- [ ] 6.3 Claim check: replace `VERIFY_GRADE`, the Haiku call, the Sonnet call, and the quote parser with one `settle` call, and delete them with their tests.
- [ ] 6.4 Ledger: write the sentence split, the question set, and the table of decision 10, with the first call of a process covering every earlier message.
- [ ] 6.5 Ledger: replace the extraction prompt, its parser, and the quote check with the `settle` call, and delete them with their tests.
- [ ] 6.6 `decide` tool: point it at the moved client, keep its three tries and its hand-back text, and add the scenario "The Removed Option".

## 7. Agent-Seen Text

- [ ] 7.1 Read through `clawdipedia-docs` the sections not yet read: "Mark pasted text in user messages" in the Opus 5.5 guide, "Review instructions written for earlier models" in the Fable 5.2 guide, and the rest of the general best practices. List in `design.md` each rule they add.
- [ ] 7.2 Add the repository test that fails on a description over 200 characters, then shorten `hygieneEnabled`, `protectedPaths`, the `claudetto-you-should-know` plugin description, and each registered tool description it names.
- [ ] 7.3 Add the repository test that fails on a `$.model.complete` call without `effort` or a full model ID, then set both on the setup advice call and the `claudetto-you-should-know` default, with `maxTokens` from recorded usage.
- [ ] 7.4 Review each root prompt, subagent body, skill body, output style, and hook text against the guide of each model that receives it, rewrite each bare prohibition as an action with its reason, and record the pages read in `design.md`.
- [ ] 7.5 Run `bun tools/prompt-bytes.ts` before and after 7.4 and record both totals; the added prompt bytes must not grow.

## 8. Finish

- [ ] 8.1 Update `README.md` (what a key sends and where it is read), `.env.example`, and `CHANGELOG.md` (the breaking changes, and the three numbers of 1.1 before and after, each with its command).
- [ ] 8.2 Run `just check` and `just verify`, and fix each failure at its cause.
- [ ] 8.3 Call the tool with `{action:"validate", change:"feat-2-1-321"}` and fix every issue.
