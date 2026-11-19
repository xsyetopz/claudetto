# Sandbox

## Sandbox and Seatbelt

## Sandbox and Seatbelt

- [x] **CTX-092** The built-in sandbox routes git's ssh through its own proxy: `env` shows `GIT_SSH_COMMAND=ssh ... -o ProxyCommand=...SRT_SSH_PROXY_COMMAND...`, a CONNECT. Bare ssh and `core.sshCommand` are held for approval. `@anthropic-ai/sandbox-runtime` was read and not used because it starts a second proxy
  Basis: read.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:242; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:249.
  Verified: binary string search, claude 2.1.327, 2026-11-19: SRT_SSH_PROXY_COMMAND and GIT_SSH_COMMAND are present.

- [x] **CTX-095** Inside the sandbox `claude-tty.test.ts` fails with "Failed to open PTY", `os.openpty` raises PermissionError (mutmut), and a plain `git push` fails because the pre-push check runs the tests; each passes with the sandbox off.
  Acceptance: the same command exits 0 with the sandbox off. Verification: probe.
  Basis: observed in transcript, 2026-11-16. PTY refusal re-measured on 2.1.327 (probe cc-inspect cli 2.1.327, 2026-11-18, fake API, `sandbox.enabled` true: `python3 -c 'import pty;pty.openpty()'` exits 1). Status: unchecked, a fact about Claude Code or the machine, with no baseline code to check; the `git push` pre-push failure depends on the user's repository hook and is kept as observed in the transcript.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 ("just check" before those commits, Ruled out); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1092 (mutmut PermissionError from os.openpty); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3175 (plain git push fails in the sandbox).
  Verified: source already on 2.1.327.
  Verified: PASS: python3 -c 'import pty;pty.openpty()' in the sandbox raised OSError (out of pty devices); the same command run with the sandbox off printed ok and exited 0; binary 2.1.327, 2026-11-19. claude-tty.test.ts and the user's pre-push hook are not in this repository and were not run.

- [x] **CTX-096** The `$TMPDIR` outside the sandbox differs from the one inside: `/var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T` outside, `/tmp/claude-501` inside; a sandbox-off command shall use `/private/tmp/claude-501/...`.
  Acceptance: a file written under `/private/tmp/claude-501` is readable from both. Verification: probe.
  Basis: observed in transcript, 2026-11-12; the inside value is re-measured on 2.1.327 (`echo $TMPDIR` in a sandboxed Bash prints `/tmp/claude-501`, cc-inspect cli, 2026-11-18, and in this session's own sandbox); the outside value is kept as observed. A write to `/private/tmp/d1.err` from the sandbox was refused (`operation not permitted`), so the shared-file acceptance holds only for the path the sandbox allows. Status: unchecked at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:11 (standing instructions); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1092 (Ruled out: $TMPDIR paths in sandbox-off commands).
  Verified: source already on 2.1.327.
  Verified: PASS: a file written in the sandbox was readable unsandboxed and the reverse. Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.

## Sandbox and Seatbelt

- [x] **CTX-097** Linux bubblewrap: a missing allowWrite path (such as /Volumes/) is skipped ("Skipping non-existent write path"). A missing denyWrite path gets /dev/null or an empty folder mounted to block its creation. An unresolvable link fails closed with /dev/null. The 2.1.326 release notes say the Bash sandbox on Linux and WSL now creates some missing `--add-dir` folders before each sandboxed command. launchctl list does not exist on Linux, and whether ps, top, and sysctl fail under bubblewrap is not claimed: bubblewrap runs only on Linux and WSL, and this plan was checked on macOS, so that part needs a Linux host.
  Basis: read from the 2.1.319 source; no Linux run.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:164; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).
  Verified: binary string search, claude 2.1.327, 2026-11-19: "[Sandbox Linux] Skipping non-existent write path" is present.
  Verified: PASS: cc-inspect code search, binary 2.1.327, 2026-11-19: the literal '[Sandbox Linux] Skipping non-existent write path' is in the bundle; no Linux host, so the behaviour stays as read.

## Sandbox and Seatbelt

## Sandbox and Seatbelt

## Sandbox and Seatbelt

- [x] **CTX-104** A sandboxed Bash command `just install-dev` failed with "unable to spawn process '/usr/bin/derq'", and passed with `dangerouslyDisableSandbox: true`.
  Basis: observed in transcript; the failure did not recur on 2.1.327: `/usr/bin/derq` exists and spawns inside the sandbox (a call with bad arguments exits 64, cc-inspect cli with `sandbox.enabled`, 2026-11-18), so the spawn failure belongs to that project's `just install-dev` run and is kept as reported. Status: unchecked at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:4111 (handoff of 2026-11-14).
  Verified: source already on 2.1.327.
  Verified: PASS: /usr/bin/derq spawned from this sandboxed shell and exited 64 on a bad flag; binary 2.1.327, 2026-11-19. The failure of that project's `just install-dev` was not reproduced (no such recipe in this repository).

- [x] **CTX-105** The native AskUserQuestion tool is deferred and the agent loads it with ToolSearch before it can call it.
  Basis: measured on 2.1.327: with `--permission-prompt-tool stdio`, `ToolSearch` `select:AskUserQuestion` returns a tool_reference for it with 13 deferred tools in the session (cc-inspect cli, 2026-11-18). Status: unchecked at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:8710 (handoff of 2026-11-15, Rules and user corrections).
  Verified: source already on 2.1.327.
  Verified: PASS: cc-inspect cli (fake API, no paid call) with `-p go --permission-prompt-tool stdio` and a ToolSearch `select:AskUserQuestion` call, binary 2.1.327, 2026-11-19: the 2nd request holds a tool_reference and the request tools carry `defer_loading`.

## Deny Rules versus Bash Writers

- [x] **CTX-845** On claude 2.1.327 a `permissions.deny` rule `Edit(prot/**)` stops only the Edit tool when the sandbox is off: a shell redirect, `tee`, `cp` and `sed -i` all wrote into `prot/` with exit code 0. With `sandbox.enabled` true the same rule also stops all four Bash writers ("Operation not permitted", exit 1), because the sandbox merges `Edit(...)` deny paths into its write deny list, while writes outside `prot/` still succeed. A blocked Bash write returns `is_error: false`, so a hook or check that reads only `is_error` misses it and must read the exit code or the text.
  Acceptance: a guard that protects a path either runs with the sandbox on or blocks the Bash writers itself; its test plants each of the four writers and an allowed neighbour path. Verification: probe.
  Basis: measured (two probe arms, cc-inspect cli on a fake API, 2026-11-18); cited (clawdipedia configure/permissions/sandbox: `sandbox.filesystem.denyWrite` merged with `Edit(...)` deny paths). Status: n/a (Claude Code behaviour).
  Source: reports/2026-11-18-research/surface-probes/settings-probes.md; reports/2026-11-18-research/triage/s4-6.md (guards item).
  Verified: source already on 2.1.327.
  Verified: PASS: cc-inspect cli with settings deny Edit(prot/**), binary 2.1.327, 2026-11-19. Sandbox on: redirect, tee, cp and sed -i into prot/ all returned exit 1 and a write into ok/ returned 0. Sandbox off: the same writers returned exit 0 in prot/. The repository's guard test plants the four writers separately (not asserted here).

## Nested Sessions and Auto-Allow

- [x] **CTX-852** On claude 2.1.327 a `claude -p` started from a sandboxed Bash call cannot build its own sandbox: it reports "Sandbox is enabled but failed to initialize: EPERM: operation not permitted, listen '/tmp/claude-501/srt-mux-….sock'", runs every command unsandboxed inside the outer profile, and cannot run `ps`. Started from an unsandboxed call with user settings loaded, the inner sandbox works: a unix-socket connect fails with EPERM and no initialization error appears. `--setting-sources project` leaves out the user's sandbox block, so such a session runs with no sandbox. Unset, `sandbox.autoAllowBashIfSandboxed` takes the inverse of the server gate `bot_protected_tengu_compiled_pudding` (`autoAllowBashIfSandboxed ?? !gate`, chunk-1yrzf3wn.js@1116482); the settings schema documents the default as false (chunk-ja5z738t.js@138689).
  Acceptance: claudetto's headless fallback runs outside the outer sandbox, and setup writes the auto-allow key explicitly (ADR-0188). Verification: probe.
  Basis: measured (five nested runs; three unnested probes, 2026-11-18; code read). Status: missing at 088a227c.
  Source: reports/2026-11-18-research/incident-lab/runs/hang-sonnet.jsonl (nested); reports/2026-11-18-research/incident-lab/sandbox-probe.txt (unnested); ADR-0188.
  Verified: source already on 2.1.327.
  Verified: PASS (static plus tests): hooks/settings/__tests__/defaults.test.ts:35-36 asserts sandbox.autoAllowBashIfSandboxed true and excludedCommands contains 'claude *'; `$C plugin test plugins/claudetto` 105 pass 0 fail, binary 2.1.327, 2026-11-19. The nested-sandbox EPERM was not rebuilt (it needs a nested claude -p).
