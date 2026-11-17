---
status: accepted
date: recorded in openspec/specs/sandbox/spec.md:164 (day of decision not recorded)
---
# Sandbox Block Final Choices

## Context and Problem Statement

Drafts conflicted. Draft C: `allowUnsandboxedCommands: false` (removes the retry prompt; about 330 sandbox-off calls seen), `allowWrite` of cache folders, `denyRead` of credential stores, `autoAllowBashIfSandboxed` and `failIfUnavailable` unset. Draft A (SA-5.2): `allowUnsandboxedCommands:false` plus `failIfUnavailable:true` in strict profiles. Draft B/D321: `enabled` true, `allowUnsandboxedCommands` true (retry through the permission flow), `enableWeakerNetworkIsolation` true.

Bash needs confinement. Setup can write a `sandbox` group into user settings (the only route carrying `filesystem` and `network`; a plugin-root `settings.json` drops `sandbox` and Bash then runs unsandboxed; a `settings.read` hook carries only `enabled` and `allowUnsandboxedCommands`). Seatbelt does not nest: an inner `sandbox_apply` fails "Operation not permitted" with exit 71, and with the native sandbox plus `CLAUDE_CODE_SHELL_PREFIX` every plain Bash call exits 71. SBPL accepts only `*` and `localhost` hosts.

Setup writes a `sandbox` block. Four keys could harden it: `autoAllowBashIfSandboxed: false`, `allowUnsandboxedCommands` off, `failIfUnavailable: true`, and denies of `~/.ssh`, `~/.config/gh`, `~/.gnupg`. The agent-terms schedule SA-5.2 wants `allowUnsandboxedCommands: false` and `failIfUnavailable: true` in a strict profile. The sandbox spec forbids setting them.

The trust service must answer inside the sandbox so that `gh` and `git` over HTTPS work. Which key opens it?

The setup can write a key for each feature. The user ruled on 2026-11-04 that a feature off by default stays off and unset. `sandbox.enabled` is the named case: off and unset. The project `.claude/settings.json` changed on 2026-11-04 at 14:49:10 to `sandbox.enabled` false and `allowUnsandboxedCommands` true.

Transcript record tx-x02/sandbox-ssh-gnupg-readable: The repo signs commits with an SSH key under ~/.ssh (commit.gpgsign true, gpg.format ssh). The sandbox deny-list could block that. The user answered in a popup.

## Considered Options

- Draft C: no unsandboxed retry; narrow `allowWrite`.
- Draft A: strict profile with `failIfUnavailable:true`.
- Draft B/D321: unsandboxed retry via permission flow; wide `allowWrite`.
- Setup writes one `sandbox` group into user settings.
- Own wrapper: `sandbox-exec`, an SBPL profile, a proxy, `sandboxConfig`, or a `confine` plugin.
- Write `allowUnsandboxedCommands: false` and `failIfUnavailable: true` (SA-5.2 strict profile).
- Leave all four keys off the block (the spec).
- `enableWeakerNetworkIsolation` alone.
- `allowMachLookup ["*"]` alone.
- Both.
- Write `sandbox.enabled: true` (the baseline setup group at `088a227c` does).
- Leave `sandbox.enabled` unset.
- Deny read of ~/.ssh and ~/.gnupg.
- Keep both readable and ~/.ssh write-denied.

## Decision Outcome

Chosen: B/D321. `allowWrite` `~/`, `/Volumes/`, temp, `/private/var/folders`; `denyWrite` shell startup files (.zshrc .zshenv .zprofile .bashrc .bash_profile .profile, ~/.config/fish), ~/.gitconfig, ~/.config/git, ~/.ssh, ~/Library/LaunchAgents, PATH folders under home (~/.local/bin ~/.bun/bin ~/bin), `xcrun_db*` under /private/var/folders; `denyRead` ~/Library/Keychains, ~/.aws, ~/.azure, ~/.config/gcloud, ~/.netrc, ~/.git-credentials; `allowRead` login.keychain-db (without it `gh auth status` fails and `git push --dry-run` cannot read Username); `network.allowedDomains` `["*"]`, `allowMachLookup` `["*"]` (pgrep, scutil, pbpaste, diskutil exit 0 with it, 3/1/1/1 without), `allowLocalBinding` and `allowAllUnixSockets` true; `excludedCommands` `ps *`, `top *`, `sysctl *`, `launchctl list` only for commands no key can make run (a hand-written entry matches only a call that is one plain command, 4 of 513). ~/.ssh and ~/.gnupg stay readable (signed commits; a lab test fails if ~/.ssh is added to `denyRead`); the user's own `allowWrite` stays on `fill`; cache env dirs join `allowWrite` when set (`BUN_INSTALL_CACHE_DIR`, `npm_config_cache`, `PIP_CACHE_DIR`, `GOMODCACHE`, `GOCACHE`, `XDG_CACHE_HOME`, not `CARGO_HOME`, which holds credentials.toml); say `/private/tmp`, never `/tmp`; never write `autoAllowBashIfSandboxed` or `failIfUnavailable`.

Same decision, other record: the built-in sandbox through setup. The block lists what is dangerous, not what is safe, with least friction; no per-tool cache entries.

Same decision, other record: leave all four off. The block SHALL NOT set `autoAllowBashIfSandboxed` or `failIfUnavailable`. Reason in the spec: friction and breakage (`failIfUnavailable` aborts the start where the sandbox is unsupported; a default of `allowUnsandboxedCommands` keeps the legitimate fallback). The conflict with SA-5.2 is settled for claudetto; SA-5.2 stays a user-side option.

Same decision, user record of 2026-11-10: both. The user chose "allow both" on 2026-11-10. The block holds `enabled: true`, `allowUnsandboxedCommands: true`, `enableWeakerNetworkIsolation: true` and `allowMachLookup ["*"]`. The trust service answers under either key alone and under both.

Earlier, superseded: leave a default-off feature, `sandbox.enabled` included, off and unset.

gap-08--features-off-by-default-stay-unset (2026-11-04) left `sandbox.enabled` off and unset; the later decisions (plan-06--sandbox-weaker-network-isolation, the user chose "allow both" on 2026-11-10; plan-05--builtin-sandbox-through-setup, 2026-11-12) write `enabled: true`, and they win. Every other default-off feature stays unset.

## Consequences

- Setup writes the block; the user chose on 2026-11-09, 10 and 12 (reported).
- Strict profiles from draft A are not written.
- No wrapper code to maintain.
- Baseline writes only `{ sandbox: { enabled: true } }` (settings.ts:211); the richer block is missing.
- Good: the sandbox never blocks a start; a retry outside it goes through the permission flow.
- Bad: about 330 sandbox-off calls stay possible (see risk register).
- Good: `gh api user` works in the sandbox.
- Bad: a wider Mach lookup surface.

The baseline setup group that turns the sandbox on conflicts with this rule and needs a change (`plugins/claudetto/hooks/features/setup/settings.ts:211-212` at 088a227c).

Transcript record tx-x02/sandbox-ssh-gnupg-readable decided: readable; ~/.ssh stays write-denied. denyRead holds Keychains and cloud credentials only.

Source: openspec/specs/sandbox/spec.md:164; plugins/claudetto/hooks/features/setup/settings.ts:211@088a227c; claude 2.1.325: all sandbox keys present. Basis: measured; the user's choices reported. Status: partial at 088a227c (only `enabled` written). Not located: tags A:186, A:201, B:209; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:161; claude 2.1.325: `sandbox.enabled`, `allowUnsandboxedCommands`, `filesystem.*`, `network.*`, `CLAUDE_CODE_SHELL_PREFIX` present. Basis: measured. Status: partial at 088a227c; openspec/specs/sandbox/spec.md:82; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/sandbox/spec.md:61; external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:77 (SA-5.2); openspec/changes/archive/2026-11-09-release-2-1-319/design.md:200 (excludedCommands rejection context); openspec/specs/sandbox/spec.md:15; openspec/specs/sandbox/spec.md:18; openspec/specs/sandbox/spec.md:63; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/sandbox/spec.md:42; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1876; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1861; user decision, 2026-11-04; user decision, 2026-11-09 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11).
