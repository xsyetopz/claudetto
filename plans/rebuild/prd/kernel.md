# Kernel Requirements

## Guard Time Budget


## Hook Logging and Notice


- [ ] **REQ-KERNEL-003** claudetto shall register one `classic.StopFailure` hook that calls `$.ui.notify` on the user's `preferredNotifChannel`, only on an API-error stop, behind the option `notificationsEnabled` (default true), with none for permission, idle, or elicitation (native handles those).
  Decision: ADR-0190, StopFailure notice stays in kernel after a code search confirms vanilla lacks it.
  Acceptance: An API-error stop notifies once; a permission prompt notifies nothing from claudetto. Verification: test.
  Basis: read. Status: have at 088a227c. claude 2.1.327: `classic.StopFailure` (chunk-m14bt1pz.js@4444295), `ui.notify` (chunk-dafpvz32.js@3391) and `preferredNotifChannel` (chunk-ja5z738t.js@294945) present (code search).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:150; plugins/claudetto/hooks/features/stop-notice/stop-notice.ts@088a227c. Idea only: external/2026-10-14/export-attention-sound- A Claude Code mod that plays a sound when Claude needs you, so you (Notification event present).




## Agent Conduct Rules



- [ ] **REQ-KERNEL-009** claudetto shall hand a step to the user only after a failed attempt (with the error) or a named hard block (sandbox path, missing credential, Reserved Action, unapproved payment). An unavoidable handoff gives one runnable command per step with output readable back; work left by the same user's earlier sessions is in scope; decisions needing the user go in one batched question with a recommendation and default, asked only when costly to undo; a claim is settled with a few tool calls instead of marked "unverified".
  Decision: ADR-0190, a conduct line ships only with a measured gain, in the one plugin output style (keep-coding-instructions: true).
  Acceptance: A handoff names its failed attempt or hard block. The agent probes each claim before it reports it, its own and another agent's, and runs each step itself, settings included, handing the user only a step that failed on a password, a touch, or a dialog no command answers (user decision). Verification: inspection.
  Basis: reported (readers' judgement; corrected in at least 12 sessions). Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:64; reported, user, 2026-11-16 04:41 UTC, do all but a login yourself (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8321); reported, user, 2026-11-14 02:48 UTC, nobody asked you to defer to the user (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31470).



- [ ] **REQ-KERNEL-013** claudetto shall put these rules in the root prompt: weigh a disputed claim as a third party's; drop an act the user says nobody asked for; look up a credential in the repo `.env`, then the environment, never ask the user for a new file; probe where undoing is free, but a needed dependency goes into the project (`bun add`); write a URL or name into a file only from a source read; report and wait after `! <command>` or a correction; announce a paid or background run; mark a guess. A paid tool must not pass the shell `ANTHROPIC_API_KEY` into a spawned `claude` (the key is billed before the subscription login).
  Decision: ADR-0190, a conduct line ships only with a measured gain, in the one plugin output style (keep-coding-instructions: true).
  Acceptance: none of these rules conflicts with never-search-for-secrets, block-is-final, one-line pre-call notice or corrections-as-context (the 2.1.322 dossier flagged them). The agent verifies a claim of the user against the repo or a probe before it relies on it; it stops when told to stop and starts no work the user has not named, including an inquiry into what vanished from the repo or from `~/.Trash`. Verification: inspection.
  Basis: read. Status: partial at 088a227c (`hooks/features/prompt/texts.ts:10` holds the message-sorting rule; a `git grep` of that folder for "nobody asked", ".env" and "bun add" finds none of the other rules; the conflict check is this item's acceptance and runs at build).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:119; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:281; reported, user, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4204); user decision, 2026-11-16 (date of the handoff that records it.

## Env File and Shell Setup at SessionStart

- [ ] **REQ-KERNEL-014** claudetto shall append `renice 10 -p $$` (children nice 10) and zsh `[ -n "$ZSH_VERSION" ] && setopt no_nomatch no_equals` to `CLAUDE_ENV_FILE` at SessionStart only if absent (12 duplicate copies made each Bash command take 58.6 ms against 11.8 ms; `renice` is refused in the sandbox and its redirect hides that; read niceness with `perl -e 'print getpriority(0,0)'`). On a 10-core Mac, 10 two-second busy loops gave 26-27M by default, 23.7M under `nice -n 10`, 5.3M under `taskpolicy -c utility`, and 0 under `background`.
  Acceptance: Two SessionStart runs leave one copy of each line in the env file. Verification: test.
  Basis: measured. Status: have at 088a227c. claude 2.1.327: `CLAUDE_ENV_FILE` (chunk-2ew0jg68.js@40538) and `classic.SessionStart` (chunk-m14bt1pz.js@1004602) present (code search).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:405; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:15; plugins/claudetto/hooks/hooks.json:10@088a227c; plugins/claudetto/scripts/session-start.ts@088a227c (as named by the old plan).

## Prompt





## Models and Context





## Order Of Authority

- [ ] **REQ-KERNEL-023** claudetto shall make the agent treat only the user's own messages as orders. A handoff, an old goal file, a plan file, and a goal the agent wrote itself are context.
  Decision: ADR-0190, a conduct line ships only with a measured gain, in the one plugin output style (keep-coding-instructions: true).
  Acceptance: after a context reset from a handoff, the agent starts no work from the handoff's Next list that the user's messages do not ask for. Verification: demonstration.
  Basis: user decision. Status: partial at 088a227c (hooks/features/prompt/texts.ts:10 sorts a remark, brainstorm or pasted material as context; no line names a handoff, an old goal file, a plan file or the agent's own goal as context).
  Source: user decision, 2026-11-16 15:17 UTC, the handoff is stale; the goal outranks it (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8192); user decision, 2026-11-16 15:17 UTC, do not trust the handoff as authoritative (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8206).

- [ ] **REQ-KERNEL-024** claudetto shall make the agent ask through `AskUserQuestion` and wait when it holds only a guess about what the user wants. The agent shall not act on the guess.
  Decision: ADR-0190, a conduct line ships only with a measured gain, in the one plugin output style (keep-coding-instructions: true).
  Acceptance: a request with two readings produces one `AskUserQuestion` call and no edit. Verification: demonstration.
  Basis: user decision. Status: partial at 088a227c (hooks/features/prompt/texts.ts:10 says to settle an ambiguity from context, state the reading, and ask through `AskUserQuestion` for what the user alone holds; no line says to wait and not act on a guess).
  Source: user decision, 2026-11-16 21:07 UTC, no acting on a guess (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8749).

## Doing The Work

- [ ] **REQ-KERNEL-025** claudetto shall make the agent dig through all the problems of a task, not one or two, and revert nothing the user did not ask to revert.
  Decision: ADR-0190, a conduct line ships only with a measured gain, in the one plugin output style (keep-coding-instructions: true).
  Acceptance: a later review of the same area finds no issue the agent saw. Verification: demonstration.
  Basis: user decision. Status: missing at 088a227c (`git show 088a227c:plugins/claudetto/hooks/features/prompt/texts.ts` holds no line to dig through all problems of a task or to revert nothing unasked).
  Source: reported, user, 2026-11-13 22:21 UTC, nobody asked for a revert (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:15664); reported, user, 2026-11-15 00:58 UTC, leave no defect unfixed (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:3748); reported, user, 2026-11-15 01:21 UTC, leave nothing open unless the user asked (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:4798).

- [ ] **REQ-KERNEL-026** claudetto shall make the agent touch no file, restore no file and delete no file the user did not name, and never guess what the user means.
  Decision: ADR-0190, a conduct line ships only with a measured gain, in the one plugin output style (keep-coding-instructions: true).
  Acceptance: the agent asks through `AskUserQuestion` first. Verification: demonstration.
  Basis: user decision. Status: missing at 088a227c (texts.ts:56 says "Where user was silent, act; delete temp files and build output", the opposite default for temp files; no line says touch, restore or delete no unnamed file).
  Source: reported, user, 2026-11-16 21:07 UTC, no acting on a guess (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8749).

- [ ] **REQ-KERNEL-027** claudetto shall make the agent call a file or an agent artifact "the plan" only when the user does.
  Decision: ADR-0190, a conduct line ships only with a measured gain, in the one plugin output style (keep-coding-instructions: true).
  Acceptance: no label appears unprompted. Verification: inspection.
  Basis: user decision. Status: missing at 088a227c (`git grep -n -i "the plan" 088a227c -- plugins/claudetto/hooks/features/prompt` finds no rule on what is called the plan).
  Source: reported, user, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:9309).

- [ ] **REQ-KERNEL-028** claudetto shall make the agent call tools by their exact case, such as `Bash`.
  Decision: ADR-0190, a conduct line ships only with a measured gain, in the one plugin output style (keep-coding-instructions: true).
  Acceptance: no "No such tool available" error from case. Verification: transcript scan.
  Basis: reported. Status: missing at 088a227c (`git grep -n -i "exact case" 088a227c -- plugins/claudetto/hooks/features/prompt` finds none).
  Source: reported, user, 2026-11-16 18:24 UTC, tool names keep their case, `Bash` not `bash` (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5608).

- [ ] **REQ-KERNEL-029** claudetto shall tell the agent to stop after two failed tries of the same approach, state what failed in its reply, and then switch approach or ask, provided a behavioural test shows it beats vanilla.
  Decision: ADR-0190, a conduct line ships only with a measured gain, in the one plugin output style (keep-coding-instructions: true).
  Acceptance: on a task whose obvious fix cannot work, N=5 runs per arm count attempts of the same approach; the text ships only if the median is lower than vanilla Opus 5.5 and Sonnet 5.5 at medium, and its characters stay inside the root-prompt budget. No hook and no refusal is added (ADR-0154 stands). Verification: test.
  Basis: reported (one user; older runs repeated a broken fix five or six times). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-ai-agents-comments-1xx5l8s-im-tired-of-ai-explaining-thing-20261118T123732Z.md:344 (url: <https://www.reddit.com/r/AI_Agents/comments/1xx5l8s/im_tired_of_ai_explaining_things_instead_of/>); reports/2026-11-18-research/dossier.md:184.
