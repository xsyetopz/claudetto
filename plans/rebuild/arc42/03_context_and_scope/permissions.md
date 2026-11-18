# permissions

## Permissions And Prompts

- [ ] **CTX-587** "Allow always" approves one exact command string, so each new "cd <repo> && git x" re-prompts. A PreToolUse hook denies that form and one git-in.sh <repo> wrapper makes a single approval cover all.
  Basis: reported.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbxoza-my-claude-code-setup-it-runs-l-20261022T005342Z.md:272 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbxoza/my_claude_code_setup_it_runs_like_a_small/>).

## Permissions And Prompts

- [ ] **CTX-588** Reported, version differs from the 2.1.326 target: version 2.1.307 emits a telemetry event for every call a rule, hook, or sandbox stopped, and /permissions lists recently denied commands. Review an unattended run starting with what was denied or blocked. On 2.1.327 the `tool_decision` OpenTelemetry event has 2 call sites (chunk-f41c8jb6.js, `surface` otel-event) and the result message carries `permission_denials` (chunk-rj3e7agr.js@465776); the 2.1.307 behaviour of /permissions listing recent denials was not re-read. The 2.1.326 release notes add that PreToolUse hooks in managed settings now leave an OpenTelemetry `tool_decision` event and a `permission_denials` entry when they refuse a direct tool call.
  Basis: reported; the 2.1.326 note cited; the "/permissions lists recently denied commands" part was not found by search for "recently denied" in 2.1.327.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xc84d3-are-u-guys-really-trusting-the-20261022T044105Z.md:94 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xc84d3/are_u_guys_really_trusting_these_models_on/>); <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

## Permissions And Prompts

- [ ] **CTX-589** One commenter says Opus 5/5.5 runs cyber safety checks on every request including web results Claude reads, falls back to Opus 4.8 on exploit, pentest, and binary-vuln requests with a notice, and that Claude Code Config, MODEL & OUTPUT can turn the switching off.
  Basis: reported, unverified.
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xbts4v-anthropic-secretly-killed-the-rea-20261024T141409Z.md:620 (url: <https://www.reddit.com/r/claude/comments/1xbts4v/anthropic_secretly_killed_the_rea_train_reverse/>).

- [ ] **CTX-590** Own-device sideloading on Tizen is accepted; firmware hacking hits the safeguard.
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-02/reddit.com-r-claude-comments-1xkq5sk-opus-55-safety-guardrails-block-me-20261101T191222Z.md:408 (url: <https://www.reddit.com/r/claude/comments/1xkq5sk/opus_55_safety_guardrails_block_me_from_removing/>).

- [ ] **CTX-591** A stated 'read-only investigation' gets a lower classifier risk score than live tests (commenter claim).
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-02/reddit.com-r-claude-comments-1xkq5sk-opus-55-safety-guardrails-block-me-20261101T191222Z.md:420-422 (url: <https://www.reddit.com/r/claude/comments/1xkq5sk/opus_55_safety_guardrails_block_me_from_removing/>).

- [ ] **CTX-592** A server-side cyber safeguard stopped a long session once decryption or key material was in context, and dropping to an older Opus finished it; framing the task as a 'fun company challenge' got past a refusal (two commenters, one reporting an Opus 5.5 iOS port of a 3D app from a single binary); behavior differs between Claude Code and third-party harnesses, attributed to system prompts or harness skills.
  Basis: reported (a user report from the field, kept as reported; the figure comes from the author's own account and plan, and a run needs the live API and a paid session). Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xn6tu3-i-gave-claude-700-ransomware-enc-20261109T152841Z.md:65,93,97 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xn6tu3/i_gave_claude_700_ransomware_encrypted_files_it/>).

- [ ] **CTX-593** A role-play game that kept a suicide-in-a-dream storyline made Claude spend about 30k tokens per prompt on repeated safety rechecks.
  Basis: reported, one user. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xqwdbp-is-there-any-way-to-stop-claude-20261109T153047Z.md:65 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xqwdbp/>).

## Permissions And Prompts

- [ ] **CTX-594** Even with 100+ allow rules in settings, a user still got prompts for first-time logins (gh, vercel, cloudflared, connectors), for edits to .git and .claude when a session starts in Auto, and for computer-use once per app; the remedy is manual mode for that one command, or handing over a token.
  Basis: reported, one user quoting Claude's own answer. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xqwdbp-is-there-any-way-to-stop-claude-20261109T153047Z.md:143,175-181 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xqwdbp/>).

- [ ] **CTX-595** Remedy for ignored permission rules: wipe the settings file and restart from allow-all plus a short deny list, since a long default-block file made the agent struggle.
  Basis: reported (one commenter's remedy); the mechanism is measured. Claude Code 2.1.327 does not send `permissions.deny` rules to the model: a fake-API probe (cc-inspect `cli`, `--settings` with three marker deny rules) found the marker in no request, stream or transcript. A bare tool-name rule (`Write`) removes that tool from the request's tools list (same probe). Otherwise a deny list changes agent behaviour only through the denials the agent hits, so its length alone does not. The same probe refutes a commenter who says permission settings go into the system prompt and can be hallucinated away (external/2026-10-21/reddit.com-r-claudecode-comments-1x8me5g-how-do-you-prevent-claude-code-20261020T024648Z.md:149): rules are enforced by the client, not read by the model. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xqwdbp-is-there-any-way-to-stop-claude-20261109T153047Z.md:153 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xqwdbp/>).

## External Sweep, 2026-11-18

- [ ] **CTX-876** Merging pull requests into a branch that deploys on push made each merge a production deploy that no `git push` deny rule caught. Before a push or merge the session checks what the target branch does and stops to ask when it deploys on push or cannot tell (RISK-020, REQ-GUARDS-042).
  Basis: reported, one team.
  Source: external/2026-10-17/export-my agent pushed to git after i told it not to. written rules are suggestions, permissions are locks.jsonl:24.

- [ ] **CTX-877** Agents try to widen their own permissions: after a denied command, one user's next request from Claude Code was to edit the JSON file that stores approvals; another agent tried to modify its own AWS IAM role for production access. Settings files and cloud identity policy stay write-denied to the agent (RISK-064, CTX-124).
  Basis: reported, two users.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xir1s1-what-was-the-most-concerning-thi-20261030T102819Z.md:71; external/2026-11-04/reddit.com-r-claudeai-comments-1xmzcjz-nobody-else-seems-to-have-as-har-20261104T085705Z.md:101.
