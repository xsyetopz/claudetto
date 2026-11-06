## Why

The baseline (`62e2fe96`) ships 23,266 lines under `plugins/claudetto/src` (16,079 without tests), 23 blocks, and 20 options, and several responsibilities have two or three owners: setup exists as a CLI and as a command, the gate and the classifier and the sandbox guard the same secrets, and two blocks write handoffs. The 4,677-line gate has 27 spec tests. `window` stores rows that only the unshipped `tools/window-report.ts` reports on, while the classifier writes its spend through `window/classify-spend.ts` and the handover runs inside `window`'s `asCompaction`. Version 0.4.0 rebuilds claudetto and `claudetto-you-should-know` as the smallest set of mods, settings, and skills that keeps or improves each observed behavior, and it proves parity against a measured baseline.

## What Changes

- A feature map assigns every baseline feature one owner: a Claude Code setting or behavior, a mod hook, a settings hook, a skill, or removal. Each assignment cites the evidence that decides it (`feature-map.md`).
- Each responsibility with more than one owner is merged into one: setup, status-line install, secret protection, handoff writing, and the run-limit checks that live in the gate.
- Features whose map row says "remove" are dropped.
- `claudetto-you-should-know` is rebuilt against a written behavior contract, with fewer modules and the same observable results.
- claudetto-openspec, a plugin of its own, replaces upstream `@fission-ai/openspec` 1.16.0: it reads and writes the same files, keeps upstream's verdicts on upstream's own cases except for named defect fixes, and measures smaller.
- The Stop open-items check gets an off switch and accepts only blockers the hook can verify, in place of a word list. Its known misfires become fixtures.
- Settings reach the session by the narrowest confirmed route: the plugin's own `settings.json` for `subagentStatusLine`, and a setup write for the tier keys. Probe 2.1 showed that a `settings.read` hook changes only `disableBundledSkills` of the measured keys.

## Capabilities

### New Capabilities

- `mod-architecture`: how each feature gets one owner, the evidence it needs, and how the result is compared to the baseline.
- `lean-openspec`: claudetto-openspec's file compatibility with upstream, its validation parity and named fixes, and its size bound.
- `you-should-know`: the observable behavior contract of the side-check observer.
- `secret-matcher`: betterleaks as the one secret matcher over every tool result and each handoff (goal item 1).
- `dangerous-commands`: the pinned community dangerous-command list in place of `rules.ts`'s own lists (goal item 2).
- `sandbox`: the setup command writes one `sandbox` block into the user's settings that turns on Claude Code's built-in sandbox with least friction: writes to the project, the temp folder, and the tool caches only, cloud-credential reads denied, any host reachable, and no retry outside the sandbox (goal item 3).

### Modified Capabilities

- `builtin-rebuild`: the model and effort come from the plugin options, and "Learn more" never makes a second call, matching the shipped code.
- `run-limits`: the Stop open-items check becomes a stated, tested, switchable requirement.

## Impact

- Code: all of `plugins/claudetto/` and `plugins/claudetto-you-should-know/` are rewritten. The working tree already stages their deletion; the baseline stays at `62e2fe96`.
- Code, goal item 3: one "Sandbox" group in `hooks/setup/settings.ts`. claudetto's own `sandbox-exec` wrapper, proxy, and `sandboxConfig` option were built and deleted, because Seatbelt does not nest under the built-in sandbox (`design.md`, "Sandbox (goal item 3)").
- Dependencies: one runtime tool is required, betterleaks 1.10.0 (MIT), installed by `brew install betterleaks`, as the one secret matcher (goal item 1); without it every tool result is withheld. No package dependency is added. `@fission-ai/openspec` stays a dev dependency, used only to check that upstream accepts what claudetto-openspec writes.
