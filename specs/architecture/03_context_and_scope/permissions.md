# Permissions

## Permissions and Prompts

- [x] **CTX-588** On 2.1.327 every call a rule, hook, or sandbox stopped can be reviewed through the `tool_decision` OpenTelemetry event (2 call sites, chunk-f41c8jb6.js, `surface` otel-event) and the `permission_denials` entry on the result message (chunk-rj3e7agr.js@465776). PreToolUse hooks in managed settings leave both when they refuse a direct tool call (2.1.326 release note). The 2.1.307 claim that /permissions lists recently denied commands is dropped: "recently denied" does not occur in 2.1.327. Review an unattended run starting with what was denied or blocked.
  Basis: release note plus binary string search on 2.1.327.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xc84d3-are-u-guys-really-trusting-the-20261022T044105Z.md:94 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xc84d3/are_u_guys_really_trusting_these_models_on/>); <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).
  Verified: cc-inspect surface otel-event and binary string search, claude 2.1.327, 2026-11-19: tool_decision has 2 call sites, permission_denials is present, "recently denied" is absent; fact rewritten.

## Permissions and Prompts CTX-595

- [x] **CTX-595** Remedy for ignored permission rules: wipe the settings file and restart from allow-all plus a short deny list, since a long default-block file made the agent struggle.
  Basis: reported (one commenter's remedy); the mechanism is measured. Claude Code 2.1.327 does not send `permissions.deny` rules to the model: a fake-API probe (cc-inspect `cli`, `--settings` with three marker deny rules) found the marker in no request, stream or transcript. A bare tool-name rule (`Write`) removes that tool from the request's tools list (same probe). Otherwise a deny list changes agent behaviour only through the denials the agent hits, so its length alone does not. The same probe refutes a commenter who says permission settings go into the system prompt and can be hallucinated away (external/2026-10-21/reddit.com-r-claudecode-comments-1x8me5g-how-do-you-prevent-claude-code-20261020T024648Z.md:149): rules are enforced by the client, not read by the model. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xqwdbp-is-there-any-way-to-stop-claude-20261109T153047Z.md:153 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xqwdbp/>).
  Verified: source already on 2.1.327.
  Verified: PASS: cc-inspect cli with --settings carrying deny rules `Bash(zzmarkerq9 *)`, `Read(./zzmarkerr8/**)` and `WebFetch`, binary 2.1.327, 2026-11-19: the marker string is in no request or transcript; the bare WebFetch rule keeps it out of the request tools.

## External Sweep, 2026-11-18
