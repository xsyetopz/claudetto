# Build goal for release 0.4.0

The user's `/goal` of 2026-11-06, copied character for character as it arrived. Words are cut out of it at the places listed under "Cut points"; nothing here fills them.

<role>
Build claudetto 0.4.0 in this repo (openspec/changes/release-0-4-0/) on three upstream tools that replace claudetto's own safety lists. CLAUDE.md "One Obvious Way" governs: one path per job, clean slate. Make technical choices yourself and record why; ask the user only how output looks to them.
</role>
<goal>
1. Secrets: betterleaks (MIT) is the matcher for the gate and handoff redaction. Delete hooks/handoff/secrets.ts, hooks/gate/env.ts, every other secret regex, and their tests. Pin one version; take stdin mode, output format, exit codes, config from its --help and docs read this session. Required: setup names its install step; a missing binary stops with an error naming that step.
2. Dangerous commands: survey community lists for coding agents (known: pleme-io/guardrail, MIT, ~2,500 YAML rules; agenttrailhq/guardrails, Apache-2.0, 74 rules with fixtures; find moredalone data, fixtures,maintenance; record the comparison table. Pin it; delete hooks/gate/rules.ts's lists and their tests. hooks/gate/shell-words.ts stays as plumbing that feeds the list each command inside `sh -c`, `git -C`, and substitutions.
3. Sandbox (redone 2026-11-06, see "Additions by the user": the built-in sandbox, configured by setup, replaces the wrapper below): Bash runs under /usr/bin/sandbox-exec with a claudetto-generated profile;Claude Code's built-in sandbox and shape of settings.json`sandbox` (current docs). Map each key to SBPL; mark each key SBPL lacks as unsupportin the docs. Probe first: wrap CLAUDE_CODE_SHELL_PREFIX),containment of the wrapped command, Apple's current sandbox-exec status.
4. Finish open 0.4.0 work: tick every task in sections 1 and 4-7 with its output, or name its blocker. 7.6 already ide, env, packages, denials;score shell-words.ts from /tmp/probe-76/gateA.jsonl.
</goal>
<method>
- FAFO: record hypothesis, prediction, command, result beside each claim. Probe in      /tmp/probe-*, a fake Messages ion-persistence, or a worktree.
- Update the change (proposal, design, gate/sandbox/handoff specs, new tasks), deleting what the new tools take over. e release-0-4-0 --strict`.
- Narrowest check per change (one lab file via `claude plugin test`); `just check` once before the report. jscpd checkg, check_current_directoryafter.
- Least code; comments only for reasons beyond what the code shows. Report edge cases.
- Measure shipped model text vbeating baseline d12d33b5: tools on, auto mode, blind grading, a canary per case, model grader.
</method>
<constraints>
- Run ~/.claudetto-holdout/ only via the user's own `! <command>`. Pass CLAUDE_CODE_OAUTH_TOKEN via `--env-file=.env`; keep .env values unread.
- Keep each paid run within 300,000 tokens. The 2,000,000-token total is lifted: the user said "Run the paid evals… So fucking run them." on 2026-11-06. The ledger is about 9.15M after task 12.1.
- Commit only when asked; tell agents the same.
- Keep claudetto-confine, ever sandbox settings on. Stop onlyprocesses you started, or your own task via TaskStop.
- Surface every permission denrom the user's own messages.
- Hand every install or sudo step to the user as `! <command>`.
</constraints>
<done_when>
- betterleaks is the one secret matcher; missing-binary error tested
- chosen command list pinned a recorded
- Bash runs under sandbox-exec from a settings.json-shaped config; unsupported keys documented; containment probe recorded
- every task in sections 1, 4-7 ticked with output or blocker
- strict validation passes; `j
- final message lists each open item, blocker, and the user's exact step
</done_when>

## Additions by the user

- 2026-11-06, item 3 redone after probes showed the own sandbox fails every Bash call (exit 71) beside the built-in one: "perhaps using built-in sandbox is worth keeping, just heavily customizing it." and "less re-inventing the wheel. more use of CC's own built-ins that way". Item 3 is now: setup writes a `sandbox` block into the user's settings that configures the built-in sandbox (the sandbox-exec wrapper, profile, and proxy were deleted).
- 2026-11-06, on the shape of that block: "we want least friction, so having to manually add domains is fucking annoying. we want least annoying and nagging sandbox. "just block the truly destructive stuff and let the rest pass free"".
- 2026-11-06, after a note that SBPL rejects a host other than `*` or `localhost` (so `sandbox.network.allowedDomains` has no pure-SBPL form): "you need a proxy, too."

## Cut points

Each is quoted from the text above. The user supplies the missing words.

1. Goal 2: "find moredalone data, fixtures,maintenance"
2. Goal 3: "profile;Claude Code's built-in sandbox"
3. Goal 3: "unsupportin the docs"
4. Goal 3: "Probe first: wrap CLAUDE_CODE_SHELL_PREFIX),containment"
5. Goal 4: "7.6 already ide, env"
6. Method 1: "a fake Messages ion-persistence"
7. Method 2: "take over. e release-0-4-0 --strict`."
8. Method 3: "jscpd checkg, check_current_directoryafter"
9. Method 5: "model text vbeating baseline"
10. Constraint 2: "start paid runove X\"."
11. Constraint 4: "claudetto-confine, ever sandbox settings on"
12. Constraint 5: "permission denrom the user's own messages"
13. Done 2: "pinned a recorded"
14. Done 5: "strict validation passes; `j"
