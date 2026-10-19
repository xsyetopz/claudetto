# Decisions: Settings

These decisions explain which keys `claudetto` sets, which parts of Claude Code it turns off, and when it asks the user.
The minimum Claude Code version is `2.1.304` (`MIN_CLAUDE_CODE_VERSION` in `tools/limits.ts`).

## Why Each Need Takes the Simplest Way

**Choice:** Each need takes the first way that works:

1. No key, because the default of Claude Code works.
2. A settings key or env var from `schemas/claude-code-settings.json`.
3. A built-in part that settings turn off ([Off Switches](Off-Switches)).
4. A mod handler.
5. A script.

**Reason:** More code breaks more often when Claude Code updates.
`claudetto-setup` merges the snippet only with `--apply`.

**Evidence:** `.claude/rules/extension-points.md` forbids runtime code for a feature Claude Code has.
`tests/claudetto/settings-pin.test.ts` checks each JSON block of [Settings Snippet](Settings-Snippet) against the schema.
It fails on a key the schema lacks and on a never-set key (`NEVER_SET_KEYS`, `NEVER_SET_ENV` in `tests/support/settings-pin.ts`).

## Why Some Skills Are User-Only

**Choice:** A skill that only the user runs sets `disable-model-invocation: true`.
These are `setup` and `spec` (core), `sessions` (`claudetto-sessions`), and `eval-compare` (`claudetto-lab`).
The skills `dry`, `patch`, `docs`, `codegraph`, and `browse` stay model-invocable.

**Reason:** Each model-invocable skill adds a line to every request.
A user-only skill needs no such line.

**Evidence:** The `SKILL.md` files under `src/plugins/`.

## Why the Schema Is Read From the Bundle

**Choice:** `claudetto-schema` (`just schema`) reads the settings schema out of the installed bundle.
It writes `schemas/claude-code-settings.json` and `schemas/claude-code-managed-settings.json`.
The second file is a reference only.

**Reason:** A schema typed by hand goes stale when Claude Code updates.

**Evidence:** `src/plugins/claudetto-lab/slices/schema/domain/build.ts`.
The `$comment` of the schema names Claude Code `2.1.302`.

## Why There Is No Model Router

**Choice:** The main loop keeps the model and effort the user sets with `/model`, `/effort`, or `effortLevel`.
`claudetto` never writes them in a hook.
The snippet sets `model` to `claude-opus-5-5` as a start value and `CLAUDE_CODE_SUBAGENT_MODEL` to `claude-sonnet-5-5`.
It never sets `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, because they override the user.
The `advise` tool sets the model and effort of its own call only.

**Reason:** A hook that rewrites `model` or `effort` adds a rule that only a probe can prove.
A cited study found a tool-call router wrong on about 1 route in 6 (arXiv 2605.07112, not checked here).

**Evidence:** The `settings` object of `slices/prompt/slice.ts`.

## Why Some Parts Are Switched Off

**Choice:** Three lists hold the switches.

| List | Content |
| --- | --- |
| Forced off | Built-in plugins, claude.ai connectors and syncs, feedback and tips, fast mode, cron, and hidden commands and attachments |
| Not set | `DISABLE_TELEMETRY`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `subagentPromptCacheTtl` |
| Never set | Keys that disable hooks, force thinking on, or remove needed context |

Keys of `~/.claude.json` are not in `settings.json`, so the snippet sets an env var, such as `CLAUDE_CODE_AUTO_CONNECT_IDE`.
No off switch for the `computer-use` MCP server is known, so the snippet denies `mcp__computer-use`.

**Reason:** Some switches may cost quality.
The eval of 2026-10-08 had fewer than 10 runs per arm, so it proves neither a loss nor a saving (D25).
The snippet still leaves out `DISABLE_TELEMETRY` and `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`.
That decision stands with no eval proof.

**Evidence:** [Evals History](Evals-History) and [Off Switches](Off-Switches).
The figures were not measured again for 0.2.0.

## Why the Snippet Asks Only Before Harm

**Choice:** `permissions.ask` has 25 exact git rules that name the destructive flag, such as `git push* --force` and `git reset* --hard`.
It also covers `docker run`, `create`, `compose run`, and `compose up` with a mount or `--privileged`, `rm` with a recursive flag, `sudo`, publish commands, `gh` writes, and an SQL drop.
A safe read such as `git status` is in `permissions.allow`.
`git reset --soft` and `git push --force-with-lease` pass.

**Reason:** Each ask stops the work.
An ask for a read teaches the user to approve without reading.
The `guard` hook covers forms a rule cannot match, such as `sh -c`.

**Evidence:** `slices/prompt/domain/git-ask.ts` and `docker-ask.ts`, and `tests/claudetto/prompt/docker-rules.test.ts`.

## See Also

- [Settings Snippet](Settings-Snippet)
- [Settings Snippet Keys](Settings-Snippet-Keys)
- [Off Switches](Off-Switches)
- [Decisions](Decisions)
