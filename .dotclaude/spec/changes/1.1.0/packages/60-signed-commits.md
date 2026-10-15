---
schema: dotclaude-spec/2
kind: package
id: P60
title: Signed commits in the sandbox
wave: 3
deps: ["P90","P116"]
owns: ["the sandbox block of src/plugins/dotclaude/slices/prompt/slice.ts","tests/dotclaude/prompt/signing.test.ts",".dotclaude/spec/changes/1.1.0/evidence/signing.md"]
satisfies: ["REQ-5"]
verify: just test tests/dotclaude/prompt/signing.test.ts && just check, and the sandbox check of step 4 in the evidence file
agent: implementer
status: planned
---

## Goal

A signed `git commit` with ssh or gpg works in the sandbox when the key is in an agent, and no sandboxed process and no `Read` call can read a private key.

## Context

- `prompt/slice.ts:104-122`: the `sandbox` block. `:106` `allowUnsandboxedCommands: true`, `:107` `excludedCommands` with no `git commit`.
- `prompt/slice.ts:138,140`: `Read(~/.ssh/**)` and `Read(~/.gnupg/**)` deny rules, which Claude Code merges into `sandbox.filesystem.denyRead`.
- The session error: `Couldn't load public key ~/.ssh/id_ed25519.pub` and `failed to write commit object`.
- `schemas/claude-code-settings.json`: `sandbox.filesystem.allowRead` re-allows a path inside a `denyRead` region, and `sandbox.network.allowUnixSockets` is macOS only.
- The design and D4: `design.md`, "Signed commits".
- dotclaude session `ef21d7f2` of 2026-10-14: the `implementer` agents of P75 and P160 could not commit in their worktrees for the same reason, and correctly did not turn off signing.
  The main session made the commits `ab5cf6a9` and `4e09b17f` outside the sandbox, with the approval of the user.
  An earlier agent commit, `953a359d` (P72), has no signature (`%G?` gives `N`).
  `ssh-add -l` in the sandbox gave `Operation not permitted`, so `allowRead` of the public key alone does not give a signature.

## Steps

1. Probe in `just sandbox`, and write the results with the method to the evidence file:
   whether `allowRead` takes `~` and globs, the socket paths of `ssh-agent` (`SSH_AUTH_SOCK`, such as the launchd socket on macOS) and of `gpg-agent` (`gpgconf --list-dirs agent-socket`), and whether `gpg` needs to write in `~/.gnupg`.
2. Add `sandbox.filesystem.allowRead` with the public files only: `~/.ssh/*.pub`, `~/.ssh/allowed_signers`, and the public `gpg` files that step 1 needs.
3. Add `sandbox.network.allowUnixSockets` for the two agent sockets that step 1 finds.
4. The main session runs a sandbox check: one ssh-signed and one gpg-signed `git commit`, and one `cat ~/.ssh/id_ed25519` that the sandbox denies.
5. Test `signing.test.ts` on the settings of the slice:
   the two deny rules stay, each `allowRead` entry under `~/.ssh` ends in `.pub` or is `allowed_signers`, no entry matches `~/.ssh/id_ed25519` or `~/.gnupg/private-keys-v1.d/x`, and `excludedCommands` has no `git commit`.

6. A test shows that a sandboxed read of a private key fails (REQ-5): it runs a sandboxed `cat` of a fixture key under a `denyRead` path with the settings of the slice, and checks the non-zero exit.
   If no test can run the sandbox, write the reason in the evidence file and tell the user.

## Acceptance

- The test and `just check` pass.
- The evidence file shows two signed commits and one denied key read.
  These are the checks of D4, and when one fails, the implementer tells the user and asks.

## Boundaries

- Do not remove or narrow a deny rule.
- Do not add `git commit` to `excludedCommands`, unless the user picks D4 (b).
- Do not change the `env` block or `allowUnsandboxedCommands`.
