# Tools

## Tools and Output

- [x] **CTX-187** Bash output past the cap goes to a file and Claude gets a 2,000-char preview plus the path. The head-and-tail preview (1,500-char tail) is behind server gate `tengu_quiet_pike`, default false, so no setting turns it on and the model sees no tail (D5: the model reported a wrong last line). One 30000-line output costs 23,768 cache-write tokens against 8,168 at cap 4000, about 15,600 prompt tokens
  Basis: measured, haiku-5-5, one run each.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:902.
  Verified: binary string search, claude 2.1.327, 2026-11-19: tengu_quiet_pike is present.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: tengu_quiet_pike read as Qt("tengu_quiet_pike",!1) (default false) in 2.1.327 binary, with tail constant iye=1500 and "output cut here; the full output was saved to a file"; 2,000-char preview and 23,768-token measurements NOT RE-RUN

## Tools and Output CTX-215 to CTX-837

- [x] **CTX-215** `sleep` chains are blocked in a Bash call; the agent waits with `run_in_background` or an `until` loop with a timeout.
  Acceptance: a `sleep 240; cat file` call is refused; an `until` loop with a timeout runs. Verification: probe.
  Basis: measured on 2.1.327: a foreground Bash call `sleep 240; echo hi` returns `Blocked: sleep 240 followed by: echo hi. To wait for a condition, use Monitor with an until-loop ... use run_in_background: true` with errorCode 10 (cc-inspect cli, 2026-11-18); the check is in chunk-8vhagegy.js@113545 and runs only for a foreground call with no wall cap. The `until` loop half of the acceptance rests on that message text and was not run. Status: unchecked at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (Ruled out: sleep chains for waiting); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3175 (hono dev run took 1,369 s, including a `sleep 240; cat` poll); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889 (handoff, Ruled Out).
  Verified: source already on 2.1.327.
  Verified: re-run on claude 2.1.327, 2026-11-19: 2.1.327 binary text: "Foreground `sleep` is blocked; use Monitor with an until-loop to wait on a condition"; the exact blocked-chain rule not probed

- [x] **CTX-216** Claude Code 2.1.327 lists 97 tools with no MultiEdit (2.1.325 listed 95), and `Edit` takes one `old_string` per call.
  Acceptance: `cc-inspect surface tool` lists the tools of the installed build and none is named MultiEdit. Verification: probe.
  Basis: measured; re-measured on 2.1.327: `surface tool` lists 97 tool names and none is MultiEdit (cc-inspect surface, 2026-11-18). The 95 count was the 2.1.325 figure. Status: unchecked at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:2433 (cc-inspect `surface tool` result in the handoff).
  Verified: source already on 2.1.327.
  Verified: re-run on claude 2.1.327, 2026-11-19: code search `MultiEdit` on 2.1.327 hits only deny-rule text (chunk-ywm74c9c.js@1460) and a legacy tool-name alias list (chunk-ja5z738t.js@190746, @197236); no tool definition named MultiEdit found; cc-inspect `surface tool` listing not re-run

- [x] **CTX-837** On 2.1.327 the Bash tool appends `< /dev/null` to a command unless the command holds a heredoc (`<<word`) or an input redirect; then the command inherits an open stdin. A program that reads stdin for want of a file argument (`wc -l` with an empty variable) blocks until the 120-second timeout moves it to the background.
  Acceptance: `timeout 8 wc -l` returns 0 at once alone, and exits 124 after 8 seconds when the same command also holds a `cat <<'E'` heredoc. Verification: probe.
  Basis: probed (Bash tool, claude 2.1.327, 2026-11-18); read (chunk-m14bt1pz.js@3706491: `$Rt` heredoc test, `Moo` and `Ooo`). Status: n/a (host behaviour).
  Source: chunk-m14bt1pz.js@3706491 (claude 2.1.327, cc-inspect `code search` "< /dev/null", 2026-11-18); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e/subagents/agent-ac34edb36528989f5.jsonl:24-26.
  Verified: source already on 2.1.327.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: "< /dev/null" literal x7 in 2.1.327 binary; heredoc/redirect exception and 120 s timeout not re-run
