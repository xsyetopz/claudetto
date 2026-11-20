---
status: accepted
date: recorded in openspec/changes/archive/2026-11-16-2-1-323/design.md:105 (day of decision not recorded)
---
# Settings Gates Replace Bash Gate

## Context and Problem Statement

The Bash gate in `tool.check/useBashRules/` (4,677 lines at baseline 62e2fe96, with `walled.ts` naming every word of a command as a path) fed path spam and false denials.

The old Bash gate (`tool.check/useBashRules/`) judged shell commands in a mod: it denied busy-wait loops (`while` or `until` with a body of only `:` or `true` and no `sleep`, `read`, or `wait`), `rm` of a temp base (`/tmp`, `/tmp/claude`, `/tmp/claude-<uid>`, `$TMPDIR`, its `*` glob, or a `..` path), a masked pipe exit code (22 of 23 distinct denials were a masked check), `git commit` after a failed step (denied for `;`, newline, `|| true`, pipefail-pipe-then-`;`, loops; `&&`, `set -e`, `|| exit 1`, `if..then`, `until` pass), a shell read with a ready `Read` call offered, and `oxlint@latest --fix-suggestions`. Claude Code's own check denies `rm` targets ending `$dir/`, `$dir/*`, or `$(...)`, so the gate must not teach `d=$(mktemp -d)` then `rm -rf "$d"`.

The claudetto Bash gate (about 3,400 hand-written lines and 5,646 generated ones) caused most denials in the audits and all of the path spam.

Own rule lists (`rules.ts`, vendored `agenttrailhq/guardrails`: 27 of 42 caught, no evaluator) needed upkeep. A generated shellfirm list replaced them, and D323 then removed the Bash gate for settings Claude Code applies.

## Considered Options

- Keep the claudetto Bash gate
- Setup writes `permissions`, `sandbox.filesystem` and `autoMode` settings that Claude Code applies
- Keep the Bash gate.
- Drop the gate for `permissions` rules written by setup.
- Keep `tool.check/useBashRules/` with the vendored shellfirm rules, fixtures and licence.
- Setup writes `permissions.ask`, `permissions.deny`, `permissions.allow`, `sandbox.filesystem.denyRead`/`denyWrite` and `autoMode` lists.
- Keep vendoring `agenttrailhq/guardrails` and own `rules.ts` lists (rootDelete, ROOTS, gitVerdict, gitParts, download ask, GATE_ROOT_DELETE, GATE_DOWNLOAD_RUN, gateLosesWork, GATE_PUSH_REWRITE)
- Generated shellfirm list
- `kenryu42/cc-safety-net` (not used)
- `Dicklesworthstone/destructive_command_guard` (not used: licence rider withholds rights from Anthropic)
- pleme-io/guardrail (not used: 2,447 rules, 2,250 one generated AWS pattern)
- Claude Code permissions, sandbox and autoMode settings written by setup

## Decision Outcome

Chosen: setup writes Claude Code's own gates; the gate is deleted. Superseded rules: standing instruction, fail closed, hard deny, refspec ask, read redirect, walls, recreate, in-place edit denial, kill pid ownership.

Same decision, other record: drop the Bash gate (`tool.check/useBashRules/`) for setup-written `permissions` rules; no mod judges a Bash command; read and write advice stays in Bash tool text. The D323 plan stands where its gap is measured.

Same decision, other record: setup-written settings (D323 Decision 5). `switch.ts` survives as a classic `PreToolUse` command hook. A replay of the fixtures against the new settings measures the gap first (task 2.1). The shellfirm port had measured 42/42 old-gate catches and 3/39 flags, 586 commands stricter and about 9 looser (C archive).

Same decision, other record: Claude Code settings written by setup. The shellfirm list was the interim choice; D323 REMOVED dangerous-commands (generated upstream rules, severity-as-verdict, pin record and tests, gate-keeps-only-what-rules-miss, unsafe-fix denial, denied-kill pids).

## Consequences

Good: no gate code or false denials. Bad: no setting takes over the recreate gate, in-place and read-redirect denials, or the pid-ownership kill list; the advice stays in the Bash tool text.

- The reproduced shapes above lose their mod check; the gap against the old gate has no baseline to compare (the gate code is in the 088a227c tree, but no run of it against these shapes is recorded). The revisit check is a run of the reproduced shapes against the permission rules.
- Partial remains at 088a227c: `hooks/kernel/shell`, `features/temp-cleanup`, `features/protected`.
- Good: the sandbox, `permissions` and `autoMode` are Claude Code's own gates.
- Bad: plain forms miss `sh -c`, `git -C`, substitution, `export -p` and a redirect into `/etc`.
- Dangerous-command gate (superseded by D323): rules generated from one pinned shellfirm list (Apache-2.0; pinned by commit and tarball SHA-256, checked before the archive is read; groups fs, git and shell at High and Critical, Critical denies and High asks; `fs-strict:*` dropped) plus a small patch of disable, override (needs probe evidence) and add; the generator fails when an id matches no upstream rule (`just vendor-rules`); unparseable input fed the raw rules and then asked (`GATE_UNREADABLE`); reason `<rule id>: <description>`. Measured: 42/42 destructive commands caught and 3/39 benign flagged, against agenttrail 27/42 and 6/39; fixtures 1,122 of 2,657 concern kept rules (28 skipped by name, 88 vendored upstream, 4 patch). `rm -- -r /` passes, `rm -rf /` denies, quoted mentions pass.
- Gate verdict set (superseded by D323): `formatVerdict`, `packages.ts` (`bun.lock` denies npm, npx, yarn and pnpm naming `bun install` and `bunx`; `xmake.lua` denies cmake, make, ninja and conan), `refVerdict`, `killVerdict`, `ownedVerdict`, `releaseVerdict`, the hook-write ask, `writesWhole`, `inPlaceTarget`, `printsFile`, `maskedExitVerdict`, `unstoppedCommitVerdict` and `busyWaitVerdict`; the strictest wins. Write and Read over Bash: a parsed Bash that writes a whole file or prints a file is denied, the reason naming `Read` or `Write`; about 145 of 812 denials were output redirects. D321 kept shell-to-Read/Write/Edit, `pkill`, the dangerous-command rules (13 denials, none false), the secret scan and the commit and open-items checks, and deleted the wording-tests check and the delegation caps; D323 removes all of them.
- Permission hold basics (superseded by D323 permission-policy removal): an unsettled request goes to a person and is never approved by default; a PermissionRequest hook fails closed (never answers allow to input with no gated key; WebFetch and MCP pass on); a gate throw asks "The gate failed: `<error>`. A person must approve this call."; a failed scan of a result withholds it; a denial with no reason is not retried (`PermissionDenied` supports only `retry`); a new user prompt clears the denial count.

Good: no vendored rules or licence to carry. Bad: claudetto no longer denies a call before Claude Code does.

Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:105; openspec/specs/mod-architecture/spec.md:28; openspec/changes/archive/2026-11-16-2-1-323/specs/permission-policy/spec.md:139; openspec/specs/dangerous-commands/spec.md:10; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:344 (`gate/rules.ts`). Basis: measured (reproduced shapes). Not located: the D323 line naming `tool.check/useBashRules/`; openspec/changes/archive/2026-11-16-2-1-323/research/inventory.md:37; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:71; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:187; openspec/specs/permission-policy/spec.md:264; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/permission-policy/spec.md:225; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:61; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:63; openspec/changes/archive/2026-11-16-2-1-323/specs/dangerous-commands/spec.md:3.
