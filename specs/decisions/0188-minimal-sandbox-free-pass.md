---
status: accepted
date: 2026-11-18
---
# Minimal Sandbox: Non-Destructive Commands Run without a Prompt

## Context and Problem Statement

The sandbox exists to contain damage, but in the user's sessions it mostly causes friction. Across all transcripts in `~/.claude/projects` (2026-11-18) the agent set `dangerouslyDisableSandbox` on 22,470 Bash calls. 21,504 of them come from one GodHand session in auto mode (3da32cd2, 2026-11-18). That session first hit two real blocks: the OrbStack Docker socket (`permission denied while trying to connect to the docker API`, line 184) and a Homebrew write under `/opt/homebrew` (line 230). After that the agent turned the sandbox off for almost everything, read-only work included: `python3` 6,667 times, `cat` 3,329, `.venv/bin/python` 2,369, `sed` 1,822, `grep` 1,257. Each such call bypasses the sandbox entirely and in auto mode costs a classifier review. A sandbox that blocks routine work trains the agent to switch it off, and then it protects nothing.

Two code facts make the friction worse. First, `autoAllowBashIfSandboxed` has no fixed default: unset, it is the inverse of the server gate `bot_protected_tengu_compiled_pudding` (chunk-1yrzf3wn.js@1116482), and the schema documents it as false. ADR-0159 left it unset, so an account with the gate on gets a permission prompt for every sandboxed command. Second, Seatbelt does not nest (CTX-087): a `claude` started from a sandboxed Bash call reports "Sandbox is enabled but failed to initialize", runs unsandboxed inside the outer profile, and cannot run `ps` (reports/2026-11-18-research/incident-lab/README.md, Confound). claudetto's headless fallback (`claude -p`) is such a call.

The user ruled on 2026-11-13 and 2026-11-14 that the sandbox stays as small as possible, and on 2026-11-18 that safe and non-destructive commands pass with no prompt. Which settings make that true?

## Considered Options

- Keep ADR-0159 as written (auto-allow unset).
- Turn the sandbox off and rely on permission rules alone.
- Keep the sandbox, auto-allow every sandboxed command, and open the paths routine work needs, so destructive and system-dangerous commands are the only ones that reach a person.

## Decision Outcome

Chosen: the third. Setup writes, on top of the ADR-0159 block:

- `sandbox.autoAllowBashIfSandboxed: true`. A sandboxed command runs with no prompt and no classifier call. Deny rules, command-specific ask rules and Claude Code's own safety checks still apply (schema text, chunk-ja5z738t.js@138689).
- `sandbox.network.allowAllUnixSockets: true` (already in ADR-0159, missing from the user's settings today). The Docker socket block that started the GodHand run is gone.
- `/opt/homebrew` in `sandbox.filesystem.allowWrite`. Installing a package is not destructive, and the second GodHand block goes away.
- `excludedCommands` gains `claude *`. The headless fallback runs outside the outer sandbox, so its own sandbox starts and its own guards hold. `permissions.allow` gains no `claude -p` entry: a headless run is a paid run, and a paid run keeps its permission prompt (RISK-391, RISK-393). The fill removes the `Bash(claude -p *)` allow that an earlier version wrote.

A person sees a prompt only for the commands that GUARDS-040 and ADR-0054 name: deleting files, branches, packages, services or data; history rewrites and force pushes; `pkill` and `killall`. Everything else either runs inside the sandbox with no prompt or is a plain allowed command, except `claude -p`, which asks because it spends money.

Turning the sandbox off was rejected because a `permissions.deny` rule on a path stops only the Edit tool, not a shell writer (CTX-845). The sandbox is the only layer that stops `cp` or `>` into a protected path, and the only one that keeps the credential stores unreadable (`denyRead` in ADR-0159).

## Consequences

- Good: routine reads, builds, tests, package installs and Docker runs need neither a prompt nor a sandbox-off retry. The agent loses its reason to set `dangerouslyDisableSandbox`, which keeps the sandbox on for the commands where it matters.
- Good: the headless fallback gets its own sandbox instead of a broken nested one.
- Bad, the strongest objection: with auto-allow on, a command injected by untrusted content runs with no human check. It can read everything outside `denyRead`. Setup lists no `allowedDomains` (SETUP-024), so on 2.1.327 a sandboxed command reaches only the hosts named in its own `allowed_domains`, and every other host is denied (issue #81). A command that names a host can still send data to it. The sandbox still stops it from writing shell startup files, git hooks and config, `~/.ssh` and launch agents (ADR-0159 `denyWrite`, plus the paths the sandbox always protects), so it cannot persist. Exfiltration is handled by breaking the lethal trifecta (GUARDS-045), not by prompts the user approves by reflex.
- Supersedes ADR-0159's rule "never write `autoAllowBashIfSandboxed`".
- Acceptance is measured: replaying the Bash commands of the GodHand session through the new block yields no prompt and no sandbox failure for any command outside the GUARDS-040 list (SETUP-024).

Source: user decisions 2026-11-13, 2026-11-14 (ADR-0159 Source) and 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl, the message on trimming the sandbox); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded.jsonl:184,188,230,234; claude 2.1.327 chunk-1yrzf3wn.js@1116482, chunk-ja5z738t.js@138689; reports/2026-11-18-research/incident-lab/README.md, sandbox-probe.txt; ADR-0159, ADR-0054, CTX-087, CTX-845.
