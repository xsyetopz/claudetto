# permissions

## Permissions And Prompts

- [ ] **CTX-587** "Allow always" approves one exact command string, so each new "cd <repo> && git x" re-prompts. A PreToolUse hook denies that form and one git-in.sh <repo> wrapper makes a single approval cover all.
  Basis: reported.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbxoza-my-claude-code-setup-it-runs-l-20261022T005342Z.md:272 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbxoza/my_claude_code_setup_it_runs_like_a_small/>).

## Permissions And Prompts

- [ ] **CTX-588** Reported, version differs from the 2.1.326 target: version 2.1.307 emits a telemetry event for every call a rule, hook, or sandbox stopped, and /permissions lists recently denied commands. Review an unattended run starting with what was denied or blocked. Unverified in 2.1.326. The 2.1.326 release notes add that PreToolUse hooks in managed settings now leave an OpenTelemetry `tool_decision` event and a `permission_denials` entry when they refuse a direct tool call.
  Basis: reported, unverified; the 2.1.326 note cited.
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
  Basis: reported, unmeasured. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xn6tu3-i-gave-claude-700-ransomware-enc-20261109T152841Z.md:65,93,97 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xn6tu3/i_gave_claude_700_ransomware_encrypted_files_it/>).

- [ ] **CTX-593** A role-play game that kept a suicide-in-a-dream storyline made Claude spend about 30k tokens per prompt on repeated safety rechecks.
  Basis: reported, one user. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xqwdbp-is-there-any-way-to-stop-claude-20261109T153047Z.md:65 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xqwdbp/>).

## Permissions And Prompts

- [ ] **CTX-594** Even with 100+ allow rules in settings, a user still got prompts for first-time logins (gh, vercel, cloudflared, connectors), for edits to .git and .claude when a session starts in Auto, and for computer-use once per app; the remedy is manual mode for that one command, or handing over a token.
  Basis: reported, one user quoting Claude's own answer. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xqwdbp-is-there-any-way-to-stop-claude-20261109T153047Z.md:143,175-181 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xqwdbp/>).

- [ ] **CTX-595** Remedy for ignored permission rules: wipe the settings file and restart from allow-all plus a short deny list, since a long default-block file made the agent struggle.
  Basis: inferred, one commenter. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xqwdbp-is-there-any-way-to-stop-claude-20261109T153047Z.md:153 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xqwdbp/>).
