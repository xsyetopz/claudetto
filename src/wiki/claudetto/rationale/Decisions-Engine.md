# Decisions: Engine Facts

This page holds the decisions D48 to D57 that still stand in 0.2.0.
Each rests on a fact of the Claude Code engine that the code alone does not show.
Read this page before you change one of the code paths below.
A change that looks simpler can break a fact that a test cannot see.
The later decision D63 is on [Session Facts](Decisions-Session).
The ids D50, D54, D56, and D58 to D62 are removed, and [Decisions](Decisions) lists them.

## Rules for Contributors

- Do not replace a choice on this page with a different mechanism without new evidence.
  Write the new evidence into the decision, and change the decision in the same commit.
- When you find a fact of the engine that saves model tokens, or that costs no model tokens, add it to this page.
  Give the source: a page of the docs, a line of the types file, a line of the bundle, or a measured run.
- The types file is `.claude-plugin/types/claude-code/index.d.ts`.
  The bundle dumps are in `external/`, which git ignores, so a bundle line is evidence for a reader with that folder.

## Channels That Cost No Model Tokens

A text that the model reads costs input tokens on each later turn, and it can change the reply.
A text that only the user reads costs no model tokens.

| Channel | The model reads it | Use |
| --- | --- | --- |
| `$.ui.log` | ❌ | A notice for the user, such as the line of `/goal` (D48) |
| The status line command | ❌ | Live figures, such as the context share and the rate limits |
| A `command.run` handler | ❌ | A command with a fixed output, such as `/goal` (D42) |
| A key in `settings.json` | ❌ | A behavior that Claude Code has, such as `sandbox` (D51) |
| `$.session.append` with a `user` row | ✅ | Only a text that the model must act on |
| A `prompt.submit` text | ✅ | Only a short text that the model must follow |

## D48 User Notices Through `$.ui.log`, Not a Transcript Row

**Problem:** A session-start notice was a `user` row from `$.session.append`.
The model read the row as a part of the task.
In the eval case `accusation-warranted` (Haiku, run `2026-10-16T16-28-11-485Z`), the reply of the task had the settings diff appended: 56 missing snippet values and 9 built-in plugins.
The reply then ended with "Tell me if you want either of those done."
The judge `plain-reply` failed all three runs, and the score with the plugin was 0.89 against 1.00 without it.

**Choice:** A notice for the user calls `$.ui.log`.
The types file says that `$.ui.log` appends one dim line to the transcript, and that the line is not sent to the model.
A `-p` or SDK host receives the line as `ui_log`.
The `goal` and `handoff` slices use it (`slices/goal/adapters/mod.ts`, `slices/handoff/adapters/mod.ts`).
A line of `$.ui.log` must hold no line break, because Claude Code draws a break as a bad glyph (`src/kernel/text.ts`).

**Alternatives:** A `user` row with words that tell the model to ignore it.
It still costs tokens on each turn, and the model can still act on it.

**Evidence:** The trace `out/trace.jsonl` of the failed run.
`src/plugins/claudetto/slices/handoff/lab/change.test.ts` checks the notice on `ui.log`.

## D49 No Catch-All in a Hook That Calls `next` First

**Problem:** A `catch` around the whole `tool.call` hook looks safe.
But it can hide an error, and it can replace a verdict of another handler.

**Choice:** A hook that calls `next` first has no catch-all.
The docs page [Handle a hook that fails](https://code.claude.com/docs/en/plugins/mods/events) says:
"It failed after `next` resolved: that result stands".
So when the hook throws after `next`, Claude Code logs the error and keeps the result of `next`.
A `catch` names only the error that it expects.

**Alternatives:** A catch-all that returns the result of `next`.
It gives the same result, and it hides the error from the log.

**Evidence:** The header comments of `slices/patch/adapters/mod.ts` and `slices/guard/adapters/mod.ts`.

## D51 The Sandbox Keys Come From Settings

**Problem:** A plugin cannot set `sandbox`.
Of the `settings` of a plugin, "only `agent` and `subagentStatusLine` take effect" (`docs/plugins_manifest-reference.md`).

**Choice:** The settings snippet carries the `sandbox` keys, and `claudetto-setup --apply` merges them into a settings file ([Settings Apply](Settings-Apply)).
The facts below shape the check `just sandbox-linux` (`tools/sandbox/linux/run.ts`):

- With `failIfUnavailable: false`, the default, a missing sandbox gives only a warning, and the commands run unsandboxed.
  So the check sets `failIfUnavailable: true` and `allowUnsandboxedCommands: false`.
- On Linux and WSL2, the sandbox needs `bwrap` and `socat`.
- The seccomp filter is required for the hard stop on Linux and WSL2.
  It blocks `socket(AF_UNIX, ...)`.
  Without it, a command reaches the `ssh-agent` socket.
  Claude Code only warns when it is missing (`seccomp not available - unix socket access not restricted`).
- The engine looks up the helper in the order `sandbox.seccomp.applyPath`, the `vendor/seccomp/<arch>/apply-seccomp` folders next to the bundle, and the global `npm` install.
  The native Linux binary embeds the helper, and the engine uses it with no `npm` install (checked on 2026-10-16).
- `sandbox.network.allowAllUnixSockets: true` makes the engine skip the filter.

**Alternatives:** A `tool.check` deny of each network command.
A script can reach the network in many forms, so a deny list is never complete.

**Evidence:** A live session of `just sandbox-linux` on 2026-10-17 (the native `claude-code-linux-arm64@2.1.302` on `haiku`, 0.0031 USD).
The control call with no sandbox got `pong` from `SSH_AUTH_SOCK`.
The sandboxed `Bash` call to `socat` failed with `socket(1, 1, 0): Operation not permitted`, so the verdict is `blocked`.
With `SRT_DEBUG=1` the engine logged `[Sandbox Linux] Applying seccomp filter for Unix socket blocking`.

## D52 Each Adapter Keeps Its Own `$` Calls

**Problem:** A shared helper that calls `$` looks like less code.

**Choice:** Each function that touches `$` is in the adapter file that uses it.
`claude plugin validate` follows `$` only into a function of one file, and each `$.env` call needs a literal name.
A shared helper makes the validation fail.

**Evidence:** The header comments of `slices/goal/adapters/mod.ts`, `slices/patch/adapters/mod.ts`, `slices/decide/adapters/mod.ts`, and `slices/guard/adapters/mod.ts`.

## D53 A Plugin Verdict Only Makes a Call Stricter

**Problem:** A handler can return `allow`, and a reader can think that it approves a call that a rule of the user asks for.

**Choice:** No handler uses `allow` to make a call less strict.
The engine orders the verdicts `deny`, `ask`, `allow`, and the verdict of a plugin is final unless the engine is stricter.
An `ask` from a hook prompts in auto mode, and in a session that cannot prompt the call is denied (`docs/hooks.md`).

**Evidence:** The `guard` handler returns `next(e)` or a deny, and never an `allow`.

## D55 No Session-Wide Env Through `CLAUDE_ENV_FILE`

**Problem:** `CLAUDE_ENV_FILE` looks like the documented way to set an env var.

**Choice:** `claudetto` uses `$.env` in the hooks module.
`CLAUDE_ENV_FILE` is only for a `SessionStart` command hook (`docs/hooks.md`), and `claudetto` has one hooks module in place of command hooks (D39).
A value in that file also holds for the whole session, and a value of `claudetto` must hold only for one call.

## D57 A Plugin `bin/` Command Is Named by Its Path, Not by Its Bare Name

**Problem:** The `bin/` folder of a plugin is "on the Bash tool's `PATH` while the plugin is enabled" (`docs/plugins_manifest-reference.md`).
In an eval run on Claude Code 2.1.301, the model ran a `bin/` command of the plugin by its bare name.
The shell answered `Exit code 127` and `command not found`, and the model then ran the command itself.
The plugin was loaded: the `init` row had `claudetto@inline`, its slash commands, and its MCP server.

**Choice:** Claude Code adds the `bin/` folders only to the shell snapshot, so the `PATH` of a Bash call has them only when the call sources the snapshot.
The bundle shows the path: one function lists the `bin/` folder of each enabled plugin, one writes `export PATH=...` with those folders into the snapshot file,
and `buildExecCommand` runs `source <snapshot> 2>/dev/null || true` before each command.
A snapshot that is missing, or a read of it that fails, gives no error and no `bin/` folder.
In `claude plugin eval`, the sandbox settings of the run have the config folder in `denyRead`, and the snapshot sits in `shell-snapshots/` of that folder.
So the source fails with no message in that sandbox.
`claudetto` does not rely on `PATH` for a command.
A skill names its command by `${CLAUDE_PLUGIN_ROOT}/bin/<name>` (`slices/dry/skills/dry/SKILL.md`), and the `decide` hook runs `${$.plugin.root}/bin/claudetto-decide`.

**Evidence:** `external/cc-2.1.301/strings.txt` (a local dump), and the trace of the kept eval run.
The cause in `claude plugin eval` follows from the `denyRead` list and the bundle, and no debug log of that run exists to confirm it.

## Related Pages

- [Decisions](Decisions)
- [Session Facts](Decisions-Session)
- [Architecture](Decisions-Architecture)
- [Evidence](Evidence)
