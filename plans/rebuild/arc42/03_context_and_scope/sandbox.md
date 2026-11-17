# sandbox

## Sandbox And Seatbelt

- [ ] **CTX-085** In auto mode with the sandbox on (claude 2.1.271+), the model names per-command hosts on the Bash command (`allowed_domains`); the classifier reviews them; the hosts open for that command only. A fake-API run with `sandbox.enabled` sent `allowed_domains`. Not run on the real login.
  Basis: cited, one fake-API run.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1796.

- [ ] **CTX-086** `sandbox.network.httpProxyPort` and `socksProxyPort` send all sandboxed traffic to a local proxy, and Claude Code's own domain lists stop applying. A claudetto proxy could check hosts against a malware list. WebFetch, hooks, and MCP servers run outside the sandbox, so WebFetch needs a URL-reputation hook too.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1801.

- [ ] **CTX-087** A process already in Seatbelt cannot apply a second profile: `sandbox-exec` gives "sandbox_apply: Operation not permitted" (exit 71). Claude Code itself is unsandboxed (pid chain 0) and wraps its Bash child. Claude Code's own sandbox fails to apply (exit 71) when started from a sandboxed shell. A Terminal launch from the sandbox is refused ("Sandbox is not allowed to open documents in Terminal").
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1806.

- [ ] **CTX-088** `/restart` resumes in the same process (same `procStart`), so the Bash sandbox it started with stays. A `!` command runs in the same sandboxed shell as the Bash tool.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1840.

- [ ] **CTX-089** A new `claude` process with user `sandbox.enabled` true and project false runs Bash unsandboxed (H3a exit71=0); user only gives exit 71 (H3b); flag `--settings` `enabled: true` turns it on again (H3c exit 71). The project setting beats the user setting; the flag beats the project.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1852.

- [ ] **CTX-090** A Seatbelt profile sees paths, not git commands. A git force push or `reset --hard` needs a permission rule, a hook, or the auto-mode classifier.
  Basis: reported, fact stated in the source.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1858.

- [ ] **CTX-091** `.claude/settings.json` changed on 2026-11-04 at 14:49:10: `enabledPlugins` `swift-lsp` and `deniedMcpServers` `apple-docs` removed, `sandbox.enabled` false and `allowUnsandboxedCommands` true added, by the user.
  Basis: reported.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1861.

## Sandbox And Seatbelt

- [ ] **CTX-092** The built-in sandbox routes git's ssh through its own proxy: `env` shows `GIT_SSH_COMMAND=ssh ... -o ProxyCommand=...SRT_SSH_PROXY_COMMAND...`, a CONNECT. Bare ssh and `core.sshCommand` are held for approval. `@anthropic-ai/sandbox-runtime` was read and not used because it starts a second proxy
  Basis: read.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:242; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:249.

- [ ] **CTX-093** Minimal sandbox probe (user ran it outside Claude Code, $0.0052): writes are denied in the repo outside the working folder, `.git`, hooks, `$TMPDIR`, `/private/tmp`, `~`, `~/.bun`, `~/.cache`, `/etc`, dotfiles, `/dev/tty`, and rename of `.git`; allowed in `/tmp/claude-501` and `/dev/null`. `curl example.com` is denied with CONNECT 403 when no domain is allowed and `-p` cannot ask
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1011.

- [ ] **CTX-094** `bun add` under the sandbox fails with "error: EPERM accessing temporary directory. set $BUN_TMPDIR or $BUN_INSTALL" in all three first arms (cache allowWrite, registry domain, temp cache dir; $0.0050, $0.0031, $0.0027); `excludedCommands ["bun *"]` was rejected because it runs every package script outside the sandbox. A first reading blamed `BUN_TMPDIR`; the cause is `~/.zshenv` exporting `BUN_INSTALL_CACHE_DIR=/Volumes/...`, which bun 1.4.4 takes before `--cache-dir` and bunfig. A settings `env` value never reaches the command because zsh reads `~/.zshenv` at every start (`zsh -c` shows the volume path, `zsh -f` or `sh -c` shows the override). `bun add` passes under the sandbox only with `allowedDomains ["registry.npmjs.org"]`, the cache in the sandbox temp, and the variable unset in the command (arm G, `is-number@7.0.0`); arms D, E, F fail with EPERM; arm H fails because `~/.zshenv` re-exports the volume path. An `allowWrite` on the external volume cache still failed, cause unknown
  Basis: measured, user-run probes.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1054; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1071; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1674.

- [ ] **CTX-095** Inside the sandbox `claude-tty.test.ts` fails with "Failed to open PTY", `os.openpty` raises PermissionError (mutmut), and a plain `git push` fails because the pre-push check runs the tests; each passes with the sandbox off.
  Acceptance: the same command exits 0 with the sandbox off. Verification: probe.
  Basis: observed in transcript, 2026-11-16. Status: unchecked, the 2.1.325 sandbox was not re-probed in this pass.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 ("just check" before those commits, Ruled out); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1092 (mutmut PermissionError from os.openpty); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3175 (plain git push fails in the sandbox).

- [ ] **CTX-096** The `$TMPDIR` outside the sandbox differs from the one inside: `/var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T` outside, `/tmp/claude-501` inside; a sandbox-off command shall use `/private/tmp/claude-501/...`.
  Acceptance: a file written under `/private/tmp/claude-501` is readable from both. Verification: probe.
  Basis: observed in transcript, 2026-11-12. Status: unchecked, not re-probed.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:11 (standing instructions); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1092 (Ruled out: $TMPDIR paths in sandbox-off commands).

## Sandbox And Seatbelt

- [ ] **CTX-097** Linux bubblewrap: a missing allowWrite path (such as /Volumes/) is skipped ("Skipping non-existent write path"). A missing denyWrite path gets /dev/null or an empty folder mounted to block its creation. An unresolvable link fails closed with /dev/null. The 2.1.326 release notes say the Bash sandbox on Linux and WSL now creates some missing `--add-dir` folders before each sandboxed command. launchctl list does not exist on Linux, and whether ps, top, and sysctl fail under bubblewrap is unmeasured.
  Basis: read from the 2.1.319 source; no Linux run.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:164; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

- [ ] **CTX-098** AppleScript answers "tell application Finder to get version" from the app bundle with no Apple Event, so it passes under (deny appleevent-send). Only events Finder must answer (get name of startup disk, count windows) fail -600 in the sandbox. open -R returned 0 though the reveal was blocked.
  Basis: measured (confirmed by the user).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:162.

- [ ] **CTX-099** In this session's sandbox the first osascript and open probe was refuted: the engine adds appleevent-send, the appleeventsd lookup, and lsopen only under allowAppleEvents (chunk-fcp0yk24.js:769604) yet prints the "blocked" text whenever it is not true (chunk-24jdhyyr.js:3442135) (claude 2.1.319 binary). A nested sandbox-exec fails with "sandbox_apply: Operation not permitted", and log show fails with "Cannot run while sandboxed", so a sandbox probe needs a shell outside it.
  Basis: read and measured.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:161.

## Sandbox And Seatbelt

- [ ] **CTX-100** Test on CLI 2.1.310, Haiku 5.5: with deny Write(./fake.env), a shell cp overwrote the file in 2 of 2 runs; with deny Edit(./fake.env) the same cp was blocked in 2 of 2; the cause is untested; 2.1.321 notes a related cp fix, not re-run. The 2.1.326 release notes fix cp being refused when only its source was covered by an Edit deny rule.
  Basis: reported, n=2.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xsfrvr-the-ways-coding-agents-broke-o-20261110T095743Z.md:97; external/2026-11-10/reddit.com-r-claudecode-comments-1xsfrvr-the-ways-coding-agents-broke-o-20261110T095743Z.md:99 (url: https://www.reddit.com/r/ClaudeCode/comments/1xsfrvr/the_ways_coding_agents_broke_our_codebase_and_the/). https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes)

- [ ] **CTX-101** A PreToolUse hook that matches the typed command text ("flutter build ipa") misses a build launched from inside another script; Bash hooks see only the command string, so cp, redirects, or a python one-liner can write where the hook never parses; the OS sandbox closes the gap (child processes included), is off by default, and does not apply on native Windows.
  Basis: reported, one hook author plus one commenter.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xsfrvr-the-ways-coding-agents-broke-o-20261110T095743Z.md:105; external/2026-11-10/reddit.com-r-claudecode-comments-1xsfrvr-the-ways-coding-agents-broke-o-20261110T095743Z.md:111 (url: https://www.reddit.com/r/ClaudeCode/comments/1xsfrvr/the_ways_coding_agents_broke_our_codebase_and_the/).

- [ ] **CTX-102** Enabling sandboxing for subagents (network and workspace) disrupted a workflow so much through denials and gates that token inefficiency persisted.
  Basis: reported, n=1. Status: not applicable (outside fact).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xg1zev-this-tweet-is-a-scary-truth-20261102T184325Z.md:508 (url: https://www.reddit.com/r/ClaudeCode/comments/1xg1zev/this_tweet_is_a_scary_truth/).

## Sandbox And Seatbelt

- [ ] **CTX-103** claudetto shall note that a sandboxed Go `gh` verifying a cert through `com.apple.trustd.agent` needs `enableWeakerNetworkIsolation` or `allowMachLookup ["*"]`, else `x509: OSStatus -26276`.
  Acceptance: Offline Go `x509.Verify` probe on 2.1.321. 2.1.326: present (`sandbox.enableWeakerNetworkIsolation` chunk-m33vdkhs.js:140907, `sandbox.network.allowMachLookup` chunk-m33vdkhs.js:117784). Verification: probe.
  Basis: measured. Status: unchecked: a fact about the macOS sandbox, not code at 088a227c (git grep finds no hit).
  Source: openspec/specs/sandbox/spec.md:80; openspec/specs/sandbox/spec.md:15.

## Sandbox And Seatbelt

- [ ] **CTX-104** A sandboxed Bash command `just install-dev` failed with "unable to spawn process '/usr/bin/derq'", and passed with `dangerouslyDisableSandbox: true`.
  Basis: observed in transcript. Status: unchecked, not probed here.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:4111 (handoff of 2026-11-14).

- [ ] **CTX-105** The native AskUserQuestion tool is deferred and the agent loads it with ToolSearch before it can call it.
  Basis: observed in transcript. Status: unchecked, not probed here.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:8710 (handoff of 2026-11-15, Rules and user corrections).
