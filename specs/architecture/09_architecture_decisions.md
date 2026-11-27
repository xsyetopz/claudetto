# Architecture Decisions

Index of [`adr/`](../decisions/); each record is one MADR 4.0.0 decision.

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [ADR-0001](../decisions/0001-agent-override-files.md) | Agent Override Files In The User Agents Folder | superseded by ADR-0099 | 2026-11-04 |
| [ADR-0002](../decisions/0002-auto-mode-stays-on.md) | Auto Mode Stays On | accepted | 2026-11-04 |
| [ADR-0003](../decisions/0003-background-tasks-stay-enabled.md) | Background Tasks Stay Enabled | accepted | 2026-11-04 |
| [ADR-0004](../decisions/0004-disable-agent-view.md) | Disable Agent View | accepted | 2026-11-04 |
| [ADR-0005](../decisions/0005-model-family-5-5-only.md) | Only The -5-5 Model Family | accepted | 2026-11-04 |
| [ADR-0006](../decisions/0006-monitor-trim-by-describe.md) | Cut Monitor Through tool.describe | superseded by ADR-0031 | 2026-11-04 |
| [ADR-0007](../decisions/0007-title-case-chicago-style.md) | Titles Use Title Case In Chicago Style | accepted | 2026-11-04 |
| [ADR-0008](../decisions/0008-agents-md-imports-claude-md.md) | AGENTS.md Stays An Import Of CLAUDE.md | accepted | 2026-11-05 |
| [ADR-0009](../decisions/0009-mod-first-route-priority.md) | Mod First, Then Classic Hook, Skill, Settings | accepted | 2026-11-05 |
| [ADR-0010](../decisions/0010-monitor-replace-and-deny.md) | Replace Monitor With A claudetto Tool And Deny The Built-in | superseded by ADR-0031 | 2026-11-05 |
| [ADR-0011](../decisions/0011-monitor-wrapper.md) | Monitor Wrapper Over The Stock Tool | superseded by ADR-0031 | 2026-11-05 |
| [ADR-0012](../decisions/0012-skill-names-clear-and-unambiguous.md) | Rule K Covers Skill Names Only | accepted | 2026-11-05 |
| [ADR-0013](../decisions/0013-split-by-checkability.md) | Split by Checkability | accepted | 2026-11-08 |
| [ADR-0014](../decisions/0014-delegation-evidence-threshold-3-runs.md) | Delegation Evidence Threshold of 3 Runs | accepted | 2026-11-09 |
| [ADR-0015](../decisions/0015-grader-faults-kept-in-change-1.md) | Grader Faults Kept in the First Change | superseded by ADR-0016 | 2026-11-09 |
| [ADR-0016](../decisions/0016-grader-faults-removed.md) | Grader Faults the Person Removed | accepted | 2026-11-09 |
| [ADR-0017](../decisions/0017-jev-never-allows.md) | Jev May Deny or Ask but Never Allow | accepted | 2026-11-09 |
| [ADR-0018](../decisions/0018-lean-openspec-parity.md) | OpenSpec With Core Parity In A Lighter Form | superseded by ADR-0192 | 2026-11-09 |
| [ADR-0019](../decisions/0019-paid-work-weekly-cap.md) | Ask Before A Paid Call And Cap Paid Work At 25 Percent Of The Seven-Day Limit | superseded by ADR-0105 | 2026-11-16 |
| [ADR-0020](../decisions/0020-release-2-1-321-branch.md) | Next Release Targets 2.1.321 On A New feat Branch | accepted | 2026-11-09 |
| [ADR-0021](../decisions/0021-root-prompt-size-cap.md) | Root Prompt Size Cap | superseded by ADR-0082 | 2026-11-09 |
| [ADR-0022](../decisions/0022-sandbox-deny-list-as-first-written.md) | Sandbox Deny List as First Written | superseded by ADR-0159 | 2026-11-09 |
| [ADR-0023](../decisions/0023-skill-listing-description-cap.md) | Cap Skill Listing Descriptions at 200 Characters | accepted | 2026-11-09 |
| [ADR-0024](../decisions/0024-stop-claim-check-grader.md) | Stop Claim-Check Grader | superseded by ADR-0104 | 2026-11-09 |
| [ADR-0025](../decisions/0025-deny-with-exact-form-over-input-rewrite.md) | Deny With the Exact Form, Do Not Rewrite Tool Input | accepted | 2026-11-10 |
| [ADR-0026](../decisions/0026-no-aliases-no-reversions.md) | No Aliases, No Reversions | accepted | 2026-11-10 |
| [ADR-0027](../decisions/0027-no-gap-between-installed-plugin-and-source.md) | No Gap Accepted Between the Installed Plugin and the Source | accepted | 2026-11-10 |
| [ADR-0028](../decisions/0028-read-pointed-at-files-in-full.md) | Read Pointed-At Files in Full | superseded by ADR-0029 | 2026-11-10 |
| [ADR-0029](../decisions/0029-read-pointed-at-files-in-slices.md) | Read Pointed-At Files in Slices | accepted | 2026-11-10 |
| [ADR-0030](../decisions/0030-agent-commits-its-own-work.md) | The Agent Commits Its Own Work When The User Allows It | accepted | 2026-11-12 |
| [ADR-0031](../decisions/0031-builtin-monitor-over-wrapper.md) | Use the Built-In Monitor Under a Trimmed Text | accepted | 2026-11-12 |
| [ADR-0032](../decisions/0032-release-held-until-user-go.md) | Merge, Tag, And Release Wait For The User | accepted | 2026-11-12 |
| [ADR-0033](../decisions/0033-bulk-passes-to-cheap-workers.md) | Bulk Passes Go To Cheap Workers | accepted | 2026-11-13 |
| [ADR-0034](../decisions/0034-compaction-path-without-user-config.md) | Compaction Path Has No userConfig | accepted | 2026-11-13 |
| [ADR-0035](../decisions/0035-hook-fault-policy-d321.md) | Fault Policy for Gating Hooks | superseded by ADR-0168 | 2026-11-13 |
| [ADR-0036](../decisions/0036-lint-unsafe-fix-rule.md) | Linter Unsafe-Fix Rule | superseded by ADR-0153 | 2026-11-13 |
| [ADR-0037](../decisions/0037-no-default-agent-isolation.md) | No Default Isolation in the Agent Frontmatter | accepted | 2026-11-13 |
| [ADR-0038](../decisions/0038-no-grep-schema-replacement.md) | No Grep Replacement With a Short Schema | accepted | 2026-11-13 |
| [ADR-0039](../decisions/0039-paid-eval-cap-approved.md) | Paid Eval Cap Approved on the Agent's Proposal | superseded by ADR-0045 | 2026-11-13 |
| [ADR-0040](../decisions/0040-permission-policy-removed.md) | Permission-Policy Requirements Removed | accepted | 2026-11-13 |
| [ADR-0041](../decisions/0041-stall-timeout-replaces-time-cap.md) | Replace the Time-Cap Hook With the Stall Timeout | accepted | 2026-11-13 |
| [ADR-0042](../decisions/0042-agent-does-the-work-itself.md) | The Agent Does All Work Itself | accepted | 2026-11-14 |
| [ADR-0043](../decisions/0043-ask-through-askuserquestion.md) | Ask Questions Through AskUserQuestion | accepted | 2026-11-14 |
| [ADR-0044](../decisions/0044-correction-handling-conflict.md) | Correction Handling | accepted | 2026-11-14 (date of the handoff that records it; day of decision not recorded) |
| [ADR-0045](../decisions/0045-paid-runs-approved.md) | Paid Runs Approved Without A Budget Figure | accepted | 2026-11-14 |
| [ADR-0046](../decisions/0046-rebuild-clean-slate.md) | Rebuild From a Clean Slate | accepted | 2026-11-14 |
| [ADR-0047](../decisions/0047-reply-holds-only-work.md) | A Reply Holds Only Work | accepted | 2026-11-14 |
| [ADR-0048](../decisions/0048-single-model-call-for-setup-questions.md) | One Model Call for Setup Questions | accepted | 2026-11-14 |
| [ADR-0049](../decisions/0049-version-bump-by-script.md) | A Script Bumps The Version By SemVer | accepted | 2026-11-14 |
| [ADR-0050](../decisions/0050-version-engine-plus-counter.md) | Fault Fixes Ship As A +patch Release | accepted | 2026-11-14 |
| [ADR-0051](../decisions/0051-you-should-know-recreates-builtin.md) | You-Should-Know Recreates the Builtin | accepted | 2026-11-14 |
| [ADR-0052](../decisions/0052-advisor-tool-disabled.md) | The Advisor Tool Stays Disabled | accepted | 2026-11-16 |
| [ADR-0053](../decisions/0053-agent-decides-in-scope-choices.md) | Agent Decides In-Scope Choices | accepted | 2026-11-16 |
| [ADR-0054](../decisions/0054-ask-rules-for-destructive-commands.md) | Ask Rules for Destructive Commands | accepted | 2026-11-16 |
| [ADR-0055](../decisions/0055-athena-model-sonnet.md) | Athena Is Not on Fable | accepted | 2026-11-16 |
| [ADR-0056](../decisions/0056-benchmark-yardstick-goal.md) | Judge Claudetto By A Headless Stock-Against-Dev Benchmark | superseded by ADR-0087 | 2026-11-16 |
| [ADR-0057](../decisions/0057-builtin-disable-in-user-settings.md) | Disable all 14 Claude Code Builtins by Rewriting User Settings | accepted | 2026-11-16 |
| [ADR-0058](../decisions/0058-clear-stays-vanilla.md) | Keep the User's /clear Vanilla | superseded by ADR-0068 | 2026-11-16 |
| [ADR-0059](../decisions/0059-concise-style-length-lower-bound.md) | Keep the Output Style Short, With a Lower Bound | accepted | 2026-11-16 |
| [ADR-0060](../decisions/0060-constraint-ledger-by-sentence-selection.md) | Constraint Ledger by Sentence Selection | superseded by ADR-0075 | 2026-11-16 |
| [ADR-0061](../decisions/0061-decider-retry-policy.md) | Decider Retry Policy | accepted | 2026-11-16 |
| [ADR-0062](../decisions/0062-delete-plugin-eval-suite.md) | Delete the Behaviour Eval Suite | superseded by ADR-0193 | 2026-11-16 (date of the handoff that records it; day of decision not recorded) |
| [ADR-0063](../decisions/0063-dogfood-after-each-commit.md) | Dogfood After Each Commit | accepted | 2026-11-16 |
| [ADR-0064](../decisions/0064-dogfood-from-vanilla.md) | Dogfood From A Vanilla Install Until Nothing Is Left To Align | accepted | 2026-11-16 |
| [ADR-0065](../decisions/0065-facts-verified-against-claude-2-1-326.md) | Verify Facts Against claude 2.1.326 | accepted | 2026-11-16 |
| [ADR-0066](../decisions/0066-faults-as-medical-errors.md) | Agent Faults Are Recorded As Medical Errors | accepted | 2026-11-16 |
| [ADR-0067](../decisions/0067-goal-user-is-watching.md) | The User Is Watching; the Goal Is Rewritten Without Sleep Conditions | accepted | 2026-11-16 |
| [ADR-0068](../decisions/0068-handover-clear-hook.md) | Handover Through a command.run Clear Hook | accepted | 2026-11-16 |
| [ADR-0069](../decisions/0069-handover-knobs-mirror-compaction.md) | Handover Knobs Mirror Claude Code's Compaction Knobs | accepted | 2026-11-16 |
| [ADR-0070](../decisions/0070-handover-trigger-idle-or-size.md) | Hand Over On An Idle Gap Or Context Size, Never On Age | superseded by ADR-0178 | 2026-11-16 |
| [ADR-0071](../decisions/0071-handover-writer-fork-low-effort.md) | Write The Handover With A Low-Effort Fork | accepted | 2026-11-14 |
| [ADR-0072](../decisions/0072-holdout-script-picks-blind.md) | A Script Picks The Holdout Tasks Blind | superseded by ADR-0087 | 2026-11-16 |
| [ADR-0073](../decisions/0073-keep-ideas-not-files.md) | Keep Ideas, Not Files, From The Old Build | accepted | 2026-11-16 |
| [ADR-0074](../decisions/0074-no-acting-on-guess.md) | Never Guess And Never Act On A Guess | accepted | 2026-11-16 |
| [ADR-0075](../decisions/0075-no-constraint-ledger.md) | No Constraint Ledger | accepted | 2026-11-16 |
| [ADR-0076](../decisions/0076-no-file-families.md) | No File Families Posing As Directories | accepted | 2026-11-16 |
| [ADR-0077](../decisions/0077-no-verbatim-user-quotes.md) | No Verbatim User Quotes | accepted | 2026-11-16 |
| [ADR-0078](../decisions/0078-one-file-per-concern.md) | One File Per Concern | accepted | 2026-11-16 |
| [ADR-0079](../decisions/0079-one-hook-kind-per-purpose.md) | Use Each Hook Kind For Its Purpose, Found By Probe | accepted | 2026-11-16 |
| [ADR-0080](../decisions/0080-one-prompt-type-stop-hook.md) | One Prompt-Type Stop Hook | superseded by ADR-0104 | 2026-11-16 |
| [ADR-0081](../decisions/0081-overnight-decide-and-continue.md) | Nobody Answers Overnight, So Decide and Continue | superseded by ADR-0067 | 2026-11-16 |
| [ADR-0082](../decisions/0082-per-model-system-prompt.md) | One System Prompt per Model | accepted | 2026-11-16 |
| [ADR-0083](../decisions/0083-plan-gaps-all-after-check.md) | Take All Audit Gap Lines After A Check | accepted | 2026-11-16 (date of the handoff that records it; day of decision not recorded) |
| [ADR-0084](../decisions/0084-plan-goal-prompt-limit.md) | Ship A Goal Prompt Of At Most 4,000 Characters | accepted | 2026-11-16 |
| [ADR-0085](../decisions/0085-plan-layout-arc42-hybrid.md) | Lay The Plan Out As arc42 With PRD, ADR And Risk Register | accepted | 2026-11-16 |
| [ADR-0086](../decisions/0086-plan-old-file-deleted-after-count.md) | Delete The Old Curation File After A Count | accepted | 2026-11-16 |
| [ADR-0087](../decisions/0087-product-first-no-benchmarks.md) | Product First, No Benchmarks, No Planner, No Component Swaps | accepted | 2026-11-16 |
| [ADR-0088](../decisions/0088-publish-needs-user-confirmation.md) | Release And Marketplace Publish Need The User's Confirmation | accepted | 2026-11-16 (date of the handoff that records it; day of decision not recorded) |
| [ADR-0089](../decisions/0089-rebuild-branch-reinstantiation.md) | The Rebuild Goes On An Orphan Branch That Holds Only The Plan | accepted | 2026-11-16 |
| [ADR-0090](../decisions/0090-rebuild-by-component-swap-behind-benchmark.md) | Rebuild By Component Swap Behind A Benchmark | superseded by ADR-0046 | 2026-11-16 |
| [ADR-0091](../decisions/0091-restore-deleted-rules.md) | Restore the Deleted Rules | accepted | 2026-11-16 |
| [ADR-0092](../decisions/0092-run-limits-removed.md) | Run Limits Removed | accepted | 2026-11-16 |
| [ADR-0093](../decisions/0093-subagent-model-without-force.md) | Subagent Model Precedence and Pinning | accepted | 2026-11-16 |
| [ADR-0094](../decisions/0094-trim-mutation-rule-then-run-round-6.md) | Trim The Mutation Rule Then Run Round 6 | accepted | 2026-11-16 |
| [ADR-0095](../decisions/0095-user-orders-outrank-queued-steps.md) | The User's Orders Outrank Queued Steps | accepted | 2026-11-16 |
| [ADR-0096](../decisions/0096-verify-user-claims.md) | Check A User Claim Before Relying On It | accepted | 2026-11-16 |
| [ADR-0097](../decisions/0097-batched-edit-tool.md) | Batched Edit Tool | accepted | 2026-11-17 |
| [ADR-0098](../decisions/0098-block-only-unrecoverable-destructive-commands.md) | Block Only Unrecoverable Destructive Commands | accepted | 2026-11-17 |
| [ADR-0099](../decisions/0099-builtin-agents-replaced-by-greek-agents.md) | Built-in Agents Replaced By Greek Agents | accepted | 2026-11-17 |
| [ADR-0100](../decisions/0100-compaction-model-on-expired-cache.md) | Compaction Model On Expired Cache | accepted | 2026-11-17 |
| [ADR-0101](../decisions/0101-edit-versus-write-line.md) | Add The Edit Versus Write Line To The Root Prompt | rejected | 2026-11-17 |
| [ADR-0102](../decisions/0102-instruction-placement.md) | Where Instructions Live: CLAUDE.md, Skill, Command, Subagent, Hook | accepted | 2026-11-17 |
| [ADR-0103](../decisions/0103-model-routing-by-prompt.md) | Model Routing By Prompt | accepted | 2026-11-17 |
| [ADR-0104](../decisions/0104-no-regex-stop-check.md) | No Regex Stop Check | accepted | 2026-11-17 |
| [ADR-0105](../decisions/0105-no-weekly-limit-fixed-goal.md) | No Weekly Limit; a Fixed Goal With a Fixed Outcome | accepted | 2026-11-17 |
| [ADR-0106](../decisions/0106-notice-order-and-call-announcement.md) | Notice Order And Call Announcement | accepted | 2026-11-17 |
| [ADR-0107](../decisions/0107-open-items-form-by-output-style.md) | What I Need From You Bullet Form | accepted | 2026-11-17 |
| [ADR-0108](../decisions/0108-opener-check-judge.md) | Opener Check With or Without a Judge Call | accepted | 2026-11-17 |
| [ADR-0109](../decisions/0109-rebuilt-feature-default-off.md) | Rebuilt Feature Default Off | accepted | 2026-11-17 |
| [ADR-0110](../decisions/0110-subagent-cache-ttl-setting.md) | One Setting Sets the Subagent Cache TTL | accepted | 2026-11-17 |
| [ADR-0111](../decisions/0111-sycophancy-mitigation-options.md) | Sycophancy Mitigation Options | accepted | 2026-11-17 |
| [ADR-0112](../decisions/0112-web-read-route.md) | Web Read Returns A Path And An Outline | accepted | 2026-11-17 |
| [ADR-0113](../decisions/0113-you-should-know-gate.md) | The userConfig switch replaces the builtin gate | accepted | 2026-11-17 |
| [ADR-0114](../decisions/0114-you-should-know-repo-only-behaviours.md) | The repo-only behaviours of You should know | accepted | 2026-11-17 |
| [ADR-0115](../decisions/0115-you-should-know-telemetry.md) | Telemetry of You should know | accepted | 2026-11-17 |
| [ADR-0116](../decisions/0116-advisor-rebuild-superseded.md) | Rebuild the Advisor Tool and Command | superseded by ADR-0052 | recorded in openspec/specs/decide/spec.md:153 (day of decision not recorded) |
| [ADR-0117](../decisions/0117-agent-frontmatter-fields.md) | Agent Frontmatter Fields | accepted | recorded in openspec/changes/archive/2026-11-16-2-1-323/tasks.md:1 (day of decision not recorded) |
| [ADR-0118](../decisions/0118-agent-frontmatter-no-effort.md) | Agent Frontmatter Without Effort | superseded by ADR-0117 | recorded in openspec/specs/subagent-prompts/spec.md:19 (day of decision not recorded) |
| [ADR-0119](../decisions/0119-agent-roster-first-draft.md) | First-Draft Agent Roster | superseded by ADR-0117 | no source line located (day of decision not recorded) |
| [ADR-0120](../decisions/0120-agent-search-model-sonnet.md) | Search And Plan Agents Run Sonnet 5.5 | superseded by ADR-0117 | recorded in openspec/specs/agent-conduct/spec.md:338 (day of decision not recorded) |
| [ADR-0121](../decisions/0121-agrees-anchored-opener-test.md) | Agrees anchored opener test | superseded by ADR-0104 | recorded in openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:116 (day of decision not recorded) |
| [ADR-0122](../decisions/0122-ask-user-question-wrapper-tool.md) | Ask user question wrapper tool | superseded by ADR-0127 | recorded in openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:392 (day of decision not recorded) |
| [ADR-0123](../decisions/0123-auto-mode-classifier-route.md) | Auto Mode Classifier Route | accepted | recorded in openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:147 (day of decision not recorded) |
| [ADR-0124](../decisions/0124-auto-mode-lists-replace-defaults.md) | Automode user scope and list replace | accepted | recorded in openspec/specs/low-hitl/spec.md:240 (day of decision not recorded) |
| [ADR-0125](../decisions/0125-bash-gate-replaced-by-permission-rules.md) | Settings gates replace bash gate | accepted | recorded in openspec/changes/archive/2026-11-16-2-1-323/design.md:105 (day of decision not recorded) |
| [ADR-0126](../decisions/0126-builtin-agent-offer-mapping-superseded.md) | Built-In Agent Offer and Mapping | superseded by ADR-0025 | recorded in openspec/specs/surface-trim/spec.md:147 (day of decision not recorded) |
| [ADR-0127](../decisions/0127-builtin-ask-user-question-with-one-sentence-description.md) | Builtin ask user question with one sentence description | accepted | recorded in openspec/specs/low-hitl/spec.md:294 (day of decision not recorded) |
| [ADR-0128](../decisions/0128-bun-check-in-place-of-biome.md) | Bun check in place of biome | accepted | recorded in openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:10 (day of decision not recorded) |
| [ADR-0129](../decisions/0129-change-2-removals-chosen-by-person.md) | Change-2 Removals Chosen by the Person | accepted | recorded in openspec/changes/archive/2026-11-10-release-2-1-319-1/tasks.md:18 (day of decision not recorded) |
| [ADR-0130](../decisions/0130-cleanup-tool-mole.md) | Cleanup Tool Mole | accepted | recorded in openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:382 (day of decision not recorded) |
| [ADR-0131](../decisions/0131-compaction-window-default.md) | Compaction Keeps Its Default Window | accepted | recorded in openspec/changes/archive/2026-11-16-2-1-323/design.md:137 (day of decision not recorded) |
| [ADR-0132](../decisions/0132-concise-first-sentence-rule-unchanged.md) | The Concise First-Sentence Rule Stays As Shipped | accepted | recorded in openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3401 (day of decision not recorded) |
| [ADR-0133](../decisions/0133-constraint-ledger.md) | Constraint Ledger | superseded by ADR-0075 | recorded in openspec/specs/constraint-ledger/spec.md:8 (day of decision not recorded) |
| [ADR-0134](../decisions/0134-constraint-ledger-superseded.md) | Keep a Constraint Ledger | superseded by ADR-0075 | recorded in openspec/specs/constraint-ledger/spec.md (day of decision not recorded) |
| [ADR-0135](../decisions/0135-created-by-marker-file.md) | Created by marker file | superseded by ADR-0166 | recorded in openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/session-hygiene/spec.md:61 (day of decision not recorded) |
| [ADR-0136](../decisions/0136-cure-cache-breakpoint-burst.md) | Cure for the Cache Breakpoint Burst | accepted | recorded in openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:712 (day of decision not recorded) |
| [ADR-0137](../decisions/0137-decider-with-haiku-and-sonnet-fallback.md) | Decider With Haiku And Sonnet Fallback | accepted | recorded in openspec/changes/archive/2026-11-09-release-2-1-319/design.md:281 (day of decision not recorded) |
| [ADR-0138](../decisions/0138-disabled-tool-gets-deny-rule.md) | A Disabled Tool Gets a Deny Rule | accepted | recorded in openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1702 (day of decision not recorded) |
| [ADR-0139](../decisions/0139-docker-and-pass-at-k-rejected.md) | Docker And pass@k Not Adopted For Grading | accepted | recorded in openspec/changes/2-1-325-rearchitecture/design.md:410,412 (day of decision not recorded) |
| [ADR-0140](../decisions/0140-effort-defaults-routing.md) | Effort Defaults and Model Routing | accepted | no source line located (day of decision not recorded) |
| [ADR-0141](../decisions/0141-expanded-shell-group-fold-superseded.md) | Expand the Shell-Group Fold | superseded by ADR-0170 | recorded in openspec/specs/surface-trim/spec.md:222 (day of decision not recorded) |
| [ADR-0142](../decisions/0142-handoff-file-compaction.md) | Handoff File Compaction | superseded by ADR-0143 | recorded in openspec/specs/compaction-path/spec.md:10 (day of decision not recorded) |
| [ADR-0143](../decisions/0143-handover-replaces-auto-compaction.md) | Handover Replaces Core Auto Compaction | accepted | 2026-11-16 |
| [ADR-0144](../decisions/0144-hook-for-jev-rejected.md) | Jev Check Stays out of a Hook | accepted | recorded in openspec/changes/archive/2026-11-09-release-2-1-319/design.md:154 (day of decision not recorded) |
| [ADR-0145](../decisions/0145-interface-text-reuse.md) | Interface Text Reuse | accepted | recorded in openspec/specs/builtin-rebuild/spec.md:29 (day of decision not recorded) |
| [ADR-0146](../decisions/0146-model-allocation.md) | Model Allocation | accepted | recorded in openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:73 (day of decision not recorded) |
| [ADR-0147](../decisions/0147-model-complete-over-model-fork.md) | $.model.complete Over $.model.fork | accepted | recorded in plugins/claudetto/hooks/features/compaction/handoff.ts:48@088a227c (day of decision not recorded) |
| [ADR-0148](../decisions/0148-no-invented-files.md) | No Plugin-Invented Schemas Or Files | accepted | recorded in user decision, 2026-11-11 and 2026-11-12 (day of decision not recorded) |
| [ADR-0149](../decisions/0149-old-handoff-requirements.md) | Old Handoff Requirements Removed | superseded by ADR-0143 | recorded in openspec/specs/compaction-path/spec.md:61 (day of decision not recorded) |
| [ADR-0150](../decisions/0150-overlapping-rewrites-and-nags.md) | Overlapping Rewrites and Nags Go | accepted | recorded in openspec/changes/2-1-325-rearchitecture/design.md:85 (day of decision not recorded) |
| [ADR-0151](../decisions/0151-rejected-candidates.md) | Candidates Rejected In The 2.1.325 Design | accepted | recorded in openspec/changes/2-1-325-rearchitecture/design.md:281 (day of decision not recorded) |
| [ADR-0152](../decisions/0152-rejected-sources.md) | Source Verdicts Of The Rearchitecture | accepted | recorded in openspec/changes/2-1-325-rearchitecture/design.md:423-432 (day of decision not recorded) |
| [ADR-0153](../decisions/0153-remove-lint-unsafe-fix-rule.md) | Remove The Linter Unsafe-Fix Rule | accepted | no source line located (day of decision not recorded) |
| [ADR-0154](../decisions/0154-repeated-failure-refusal-removed.md) | Refuse Repeated Failures | accepted | recorded in openspec/specs/run-limits/spec.md:19 (day of decision not recorded) |
| [ADR-0155](../decisions/0155-root-prompt-agent-type.md) | Root Prompt as an Agent Type | superseded by ADR-0156 | no source line located (day of decision not recorded) |
| [ADR-0156](../decisions/0156-root-prompt-via-compose.md) | Root Prompt Only Through prompt.compose | accepted | recorded in plugins/claudetto/agents/Heracles.md@088a227c (day of decision not recorded) |
| [ADR-0157](../decisions/0157-route-by-cost-of-wrong-answer.md) | Route Model By Cost Of A Wrong Answer | accepted | recorded in external/please-use-me-often/agent-failure-dossier/judged/spec.jsonl:3 (day of decision not recorded) |
| [ADR-0158](../decisions/0158-rule-files-camelcase-and-count.md) | Rule Files Stay Few And Use camelCase Names | accepted | recorded in user decision, 2026-11-13 (day of decision not recorded) |
| [ADR-0159](../decisions/0159-sandbox-block-through-setup.md) | Sandbox Block Final Choices | accepted | recorded in openspec/specs/sandbox/spec.md:164 (day of decision not recorded) |
| [ADR-0160](../decisions/0160-session-age-handoff.md) | Handoff at Session Age | superseded by ADR-0070 | recorded in openspec/changes/2-1-325-rearchitecture/design.md:64 (day of decision not recorded) |
| [ADR-0161](../decisions/0161-setup-autocompact-env-removed.md) | Setup No Longer Writes Auto-Compact Overrides | superseded by ADR-0131 | recorded in openspec/changes/archive/2026-11-16-2-1-323/design.md:131 (day of decision not recorded) |
| [ADR-0162](../decisions/0162-silent-turn-reminder-off-only.md) | Silent-Turn Reminder Off with the Switch Alone | accepted | recorded in chunk-m14bt1pz.js:3985537 (day of decision not recorded) |
| [ADR-0163](../decisions/0163-stale-statements.md) | Stale And Conflicting Statements Retired | superseded by the specs named in Source (no ADR holds the new wording) | recorded in openspec/specs/permission-policy/spec.md:50 (day of decision not recorded) |
| [ADR-0164](../decisions/0164-test-tampering-check-rejected.md) | Test-Tampering Check Not Built | accepted | recorded in openspec/changes/archive/2026-11-09-release-2-1-319/design.md:350 (day of decision not recorded) |
| [ADR-0165](../decisions/0165-time-cap-hook.md) | Cap Agent Run Time With a Hook | superseded by ADR-0041 | recorded in openspec/changes/archive/2026-11-13-feat-2-1-321/specs/run-limits/spec.md:166 (day of decision not recorded) |
| [ADR-0166](../decisions/0166-tmpdir-writes-pass-no-marker.md) | Tmpdir writes pass no marker | accepted | recorded in openspec/specs/permission-policy/spec.md:262 (day of decision not recorded) |
| [ADR-0167](../decisions/0167-tool-check-fault-asks.md) | Tool check fault asks | superseded by ADR-0168 | recorded in openspec/changes/archive/2026-11-16-2-1-323/design.md:123 (day of decision not recorded) |
| [ADR-0168](../decisions/0168-tool-check-fault-leaves-engine-verdict.md) | Tool check fault leaves verdict beneath | accepted | recorded in openspec/changes/archive/2026-11-16-2-1-323/design.md:123 (day of decision not recorded) |
| [ADR-0169](../decisions/0169-tool-deferral.md) | Tool Trimming by Deferral | accepted | recorded in plugins/claudetto/hooks/features/surface/surface.ts@088a227c (day of decision not recorded) |
| [ADR-0170](../decisions/0170-tool-results-stay-folded.md) | Tool Results Stay Folded | accepted | recorded in openspec/specs/surface-trim/spec.md:222 (day of decision not recorded) |
| [ADR-0171](../decisions/0171-unseen-grade-by-sonnet.md) | The Unseen Grade Goes to Sonnet | accepted | recorded in openspec/changes/archive/2026-11-09-release-2-1-319/design.md:445 (day of decision not recorded) |
| [ADR-0172](../decisions/0172-version-floor-required-minimum.md) | Version Floor by requiredMinimumVersion | accepted | recorded in chunk-ja5z738t.js:285180 and :281644 (day of decision not recorded) |
| [ADR-0173](../decisions/0173-worktree-build-folder-sharing.md) | Worktree Build-Folder Sharing | accepted | recorded in openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:384 (day of decision not recorded) |
| [ADR-0174](../decisions/0174-you-should-know-observer.md) | You-Should-Know Observer on Model Call Only | accepted | recorded in openspec/changes/2-1-325-rearchitecture/items.json:122 (day of decision not recorded) |
| [ADR-0175](../decisions/0175-zsh-options-through-env-file.md) | Zsh Options Through the Env File | accepted | recorded in openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:560 (day of decision not recorded) |
| [ADR-0176](../decisions/0176-target-claude-code-2-1-327.md) | Target Claude Code 2.1.327 | accepted | 2026-11-18 |
| [ADR-0177](../decisions/0177-pragmatism-gate.md) | A Component Ships Only When It Beats Vanilla | accepted | 2026-11-18 |
| [ADR-0178](../decisions/0178-renewal-at-task-boundaries.md) | Renew the Session at Task Boundaries, Never on a Clock | accepted | 2026-11-18 |
| [ADR-0179](../decisions/0179-mcp-output-cap-10000.md) | MCP Output Capped at 10,000 Tokens | accepted | 2026-11-18 |
| [ADR-0180](../decisions/0180-behavioural-and-mutation-tests.md) | Behavioural Tests on Traces and Mutation of Plugin Rules | accepted | 2026-11-18 |
| [ADR-0181](../decisions/0181-evidence-before-reversing-work.md) | Evidence Before Reversing Finished Work | accepted | 2026-11-18 |
| [ADR-0182](../decisions/0182-plain-english-reply-rule.md) | The Reply Rule Names Plain English | accepted | 2026-11-18 |
| [ADR-0183](../decisions/0183-logic-checked-by-execution.md) | Logic Is Checked by Running It, Not by Review | accepted | 2026-11-18 |
| [ADR-0184](../decisions/0184-headless-renewal-by-driver.md) | Headless Renewal Is Sent by the Driver | accepted | 2026-11-18 |
| [ADR-0185](../decisions/0185-system-wide-disk-hygiene.md) | System-Wide Disk Hygiene | accepted | 2026-11-18 |
| [ADR-0186](../decisions/0186-slice-commits-as-boundaries.md) | Slice Commits Are the Context Boundaries | accepted | 2026-11-18 |
| [ADR-0187](../decisions/0187-local-incident-lab.md) | A Local Incident Lab Reproduces Agent Failures | accepted | 2026-11-18 |
| [ADR-0188](../decisions/0188-minimal-sandbox-free-pass.md) | Minimal Sandbox: Non-Destructive Commands Run Without a Prompt | accepted | 2026-11-18 |
| [ADR-0189](../decisions/0189-block-scope-over-vanilla.md) | Build Ten Blocks Over Vanilla 2.1.327; OpenSpec Stays Out | accepted | 2026-11-18 |
| [ADR-0190](../decisions/0190-triage-decisions-by-agent.md) | Triage Choices Settled by the Rebuild Agent | accepted | 2026-11-18 |
| [ADR-0191](../decisions/0191-commit-trailer-credits-an-account.md) | The Commit Trailer Credits Claude's Account | accepted | 2026-11-19 |
| [ADR-0192](../decisions/0192-claudetto-spec-replaces-openspec.md) | `claudetto-spec` Replaces `claudetto-openspec` | accepted | 2026-11-21 |
| [ADR-0193](../decisions/0193-plugin-evals-with-integrity-rules.md) | Plugin Evals Through `claude plugin eval`, Under Integrity Rules | accepted | 2026-11-21 |
| [ADR-0194](../decisions/0194-standards-basis.md) | Two Standards Bases: The Claude Code Harness and Open Industry Standards | accepted | 2026-11-21 |
| [ADR-0195](../decisions/0195-target-claude-code-2-1-329.md) | Target Claude Code 2.1.329 | accepted | 2026-11-21 |
| [ADR-0196](../decisions/0196-solo-run-merges-each-slice-to-main.md) | A Solo Run Merges Each Slice to Main | accepted | 2026-11-23 |
| [ADR-0201](../decisions/0201-status-line-is-a-command-with-rows.md) | The Status Line Is a Command That Draws Rows | accepted | 2026-11-25 |
