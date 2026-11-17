# Sandbox Limits

- [ ] **CON-001** claudetto shall treat these sandbox facts as fixed (CC 2.1.322 and earlier, fake API, macOS): a `denyWrite` path write fails "operation not permitted" with no prompt; `allowWrite ["~/"]` covers any new folder under home; `allowMachLookup ["*"]` becomes `(global-name-prefix "")` and lets pgrep, scutil --dns, pbpaste and diskutil list run (exit 0 against 3, 1, 1, 1); `ps` and `top` (setuid root) and `sysctl` (fixed-name list) fail under every key, hence `excludedCommands`; `just verify` opens a PTY the sandbox refuses; a `git *` `excludedCommands` entry does not take effect.
  Acceptance: the sandbox setup group names `ps`, `top`, and `sysctl` in `excludedCommands` and no `git *` entry. Verification: inspection.
  Basis: measured; unverified in 2.1.326. Status: have at 088a227c (`sandbox` setup group).
  Source: openspec/specs/sandbox/spec.md:15; openspec/specs/sandbox/spec.md:16; openspec/specs/sandbox/spec.md:58.

- [ ] **CON-002** claudetto shall treat these sandbox limits as fixed (measured on 2.1.323): the sandbox refuses `kill` of an outside process and `git worktree remove` of another session's worktree (it half-removes: the folder goes and the `.git/worktrees` entry stays).
  Acceptance: A sandboxed `kill` of an outside PID fails. Verification: probe.
  Basis: measured. Status: have at 088a227c.
  Source: unresolved: no source line holds the sandbox `kill` and `git worktree remove` refusals (old-plan tag D:290).

- [ ] **CON-003** The macOS sandbox refuses writes to `.git/hooks`, `.git/index.lock`, `.git/config`, a worktree folder inside `.git`, `.vscode`, and `/opt/homebrew`, and blocks the keychain that `gh` needs; `gh` works when `GH_TOKEN` is set.
  Acceptance: a command that needs one of these runs outside the sandbox with approval, or the agent reports the block. Verification: probe.
  Basis: reported. Status: have.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:9; reported, one user, 2026-11-11 (Claude Code 2.1.319); the `/sandbox` command edits the write list.

- [ ] **CON-004** A pty or tmux cannot open inside the session sandbox (tmux EPERM on the socket, `script: openpty` EPERM, `Bun.spawn` terminal fails), and auto mode denied the unsandboxed run. TUI render checks stay cited, not observed.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:166.

- [ ] **CON-005** claudetto shall not expect `ssh` to reach `github.com:22` under the shipped sandbox: `git ls-remote` over `git@github.com` returned rc=128 in all three runs.
  Basis: measured (2.1.319 evidence; a successful login was not measured). With `allowedDomains ["*"]` the call passes the proxy and fails with "Host key verification failed" (no `known_hosts` on this machine); with `["example.org"]` the proxy answers "sandbox proxy: github.com:22: 403 user denied" and `<sandbox_violations>` shows `deny network-outbound github.com:22`. The sandbox logs a denial and writes no line for an allow.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-10/README.md:5-38 (results at lines 19-36).
