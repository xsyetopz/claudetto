# Decisions: Engine Facts

Each topic here rests on a fact of the Claude Code engine that the code alone does not show.
Read this page before you change one of these code paths.
A change that looks simpler can break a fact that a test cannot see.

## Rules for Contributors

- Do not replace a choice here with another mechanism without new evidence.
  Write the evidence into the topic in the same commit.
- If you find an engine fact that saves model tokens, add it here with its source.
  A source is a docs page, a line of the types file, a line of the bundle, or a measured run.
- The types file is `.claude-plugin/types/claude-code/index.d.ts`.
  Bundle dumps are in `external/`, which git ignores.

## Which Channels Cost No Model Tokens

A text that the model reads costs input tokens on each later turn.
A text that only the user reads costs none.

| Channel | Model reads it | Use |
| --- | --- | --- |
| `$.ui.log` | ❌ | A notice for the user, such as the line of `/goal` |
| The status line command | ❌ | Live figures, such as context share |
| A `command.run` handler | ❌ | A command with a fixed output, such as `/goal` |
| A key in `settings.json` | ❌ | A behavior Claude Code has, such as `sandbox` |
| `$.session.append` with a `user` row | ✅ | Only text the model must act on |
| A `prompt.submit` text | ✅ | Only a short text the model must follow |

## Why Notices Use `$.ui.log`

**Choice:** A notice for the user calls `$.ui.log`.
The types file says it appends one dim line to the transcript that is not sent to the model.
A `-p` or SDK host receives it as `ui_log`.
The `goal` and `handoff` slices use it.
A line must hold no line break, because Claude Code draws a break as a bad glyph (`src/kernel/text.ts`).

**Reason:** A session-start notice sent as a `user` row was read as part of the task.
In an early run of the eval case `accusation-warranted` (Haiku), the reply ended with extra settings text.
That run had fewer than 10 runs per arm, so no score is kept (D25, [Evals of 0.1.0](Evals-0.1.0)).

**Evidence:** The trace `out/trace.jsonl` of the failed run.
`slices/handoff/lab/change.test.ts` checks the notice.

## Why a Hook That Calls `next` First Has No Catch-All

**Choice:** Such a hook has no `catch` around the whole body.
A `catch` names only the error it expects.

**Reason:** The docs page [Handle a Hook That Fails](https://code.claude.com/docs/en/plugins/mods/events) says: "It failed after `next` resolved: that result stands".
So Claude Code logs the error and keeps the result.
A catch-all would hide the error from the log.

**Evidence:** Header comments of `slices/patch/adapters/mod.ts` and `slices/guard/adapters/mod.ts`.

## Why the Sandbox Keys Come From Settings

**Choice:** The snippet carries the `sandbox` keys, and `claudetto-setup --apply` merges them ([Settings Apply](Settings-Apply)).

**Reason:** A plugin cannot set `sandbox`.
Of the `settings` of a plugin, "only `agent` and `subagentStatusLine` take effect".
These facts shape `just sandbox-linux` (`tools/sandbox/linux/run.ts`):

- With the default `failIfUnavailable: false`, a missing sandbox only warns, and commands run unsandboxed.
  So the check sets `failIfUnavailable: true` and `allowUnsandboxedCommands: false`.
- Linux and WSL2 need `bwrap` and `socat`.
- The seccomp filter blocks `socket(AF_UNIX, ...)`.
  Without it, a command reaches the `ssh-agent` socket, and Claude Code only warns.
- The engine looks for the helper at `sandbox.seccomp.applyPath`, then `vendor/seccomp/<arch>/apply-seccomp`, then a global `npm` install.
  The native Linux binary embeds the helper (checked 2026-10-16).
- `sandbox.network.allowAllUnixSockets: true` skips the filter.

**Evidence:** A live `just sandbox-linux` run on 2026-10-17 (native `claude-code-linux-arm64@2.1.302`, `haiku`, 0.0031 USD).
The control call got `pong` from `SSH_AUTH_SOCK`.
The sandboxed call failed with `socket(1, 1, 0): Operation not permitted`, so the verdict is `blocked`.

## Why Each Adapter Keeps Its Own `$` Calls

**Choice:** Each function that touches `$` stays in the adapter file that uses it.

**Reason:** `claude plugin validate` follows `$` only into a function of one file, and each `$.env` call needs a literal name.
A shared helper makes validation fail.

**Evidence:** Header comments of the `mod.ts` files of `goal`, `patch`, `decide`, and `guard`.

## Why a Plugin Verdict Only Makes a Call Stricter

**Choice:** No handler uses `allow` to make a call less strict.
The engine orders verdicts `deny`, `ask`, `allow`.
An `ask` from a hook prompts in auto mode, and in a session that cannot prompt, the call is denied.

**Reason:** A reader could think `allow` overrides a rule of the user.

**Evidence:** The `guard` handler returns `next(e)` or a deny, never an `allow`.

## Why `CLAUDE_ENV_FILE` Is Not Used

**Choice:** `claudetto` uses `$.env` in the hooks module.

**Reason:** `CLAUDE_ENV_FILE` works only for a `SessionStart` command hook, and `claudetto` has no command hooks.
A value in that file holds for the whole session, but a `claudetto` value must hold for one call.

## Why a `bin/` Command Is Named by Its Path

**Choice:** A skill names its command by `${CLAUDE_PLUGIN_ROOT}/bin/<name>`.
The `decide` hook runs `${$.plugin.root}/bin/claudetto-decide`.
`claudetto` does not rely on `PATH`.

**Reason:** The docs say the `bin/` folder is "on the Bash tool's `PATH` while the plugin is enabled".
In an eval on 2.1.301, the bare name gave `Exit code 127` and `command not found`, although the plugin was loaded.
The bundle adds the folders only to the shell snapshot, and each command runs `source <snapshot> 2>/dev/null || true`.
In `claude plugin eval`, the config folder is in `denyRead`, so the source fails with no message.
No debug log confirms this cause.

**Evidence:** `external/cc-2.1.301/strings.txt` and the trace of the kept eval run.
See `slices/dry/skills/dry/SKILL.md`.

## See Also

- [Decisions Session](Decisions-Session)
- [Decisions Architecture](Decisions-Architecture)
- [Evidence](Evidence)
- [Decisions](Decisions)
