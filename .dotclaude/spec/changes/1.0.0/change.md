---
schema: dotclaude-spec/2
kind: change
id: 1.0.0
size: large
status: implementing
verify: just check
---

# 1.0.0: full rebuild

## Why

0.28.0 failed as a product.
The first plan of 0.29.0 added one task for each session, and after 40 of 113 tasks it had no release.
The architecture is not modular: entry points grow by accretion, one capability has 11 files, and OpenSpec is coupled into setup, the status line, the snippet, tests, and the wiki.
dotclaude starts again as 1.0.0: a full customization of Claude Code through its extension points, with no patch of the binary.

## Goal

dotclaude changes Claude Code with the Mod API, settings, hooks, skills, agents, and output styles.
It gets the highest intelligence for the lowest token cost:

- It replaces the built-in system prompt, tool descriptions, and other instructions with shorter text that keeps the facts that the model needs.
- It turns off each built-in part that dotclaude does not need, or replaces it with a lighter part.
- It sends each decision that facts settle to a decisions API, and not to the user.

## Decisions of the user (2026-10-12)

- The version is 1.0.0.
  The old change `openspec/changes/dotclaude-0-29-0/` is discarded.
  The tags, the releases, and the changelog of each older version are deleted, after the user approves each deletion (P18).
- No migration from an older version, no legacy shim, and no compatibility layer of any kind.
- dotclaude replaces OpenSpec with its own spec workflow, in the core plugin.
- The internal structure of each plugin is done again.
- Code uses arrow functions, not `function` declarations.
  Code uses OOP only where it fits, such as an interface for a port or a class for state.
  Plain data and pure functions are the default.
- The status line has no progress bars.
  It shows numbers and Unicode icons, with a better layout, a color scale, and a no-color mode.
- The keys of the settings snippet follow the property order of the settings schema.
  The keys of `env` are in alphabetical order.
- The work runs as parallel agents in waves, not as one task for each session.
- Jev is the decisions API of dotclaude: each decision that facts settle goes to Jev by default.
  When the TypeSafe API key is missing or not valid, or the account has no balance, the decision goes to a small Claude model.
  Approvals and preferences still go to the user.
- dotclaude has its own output style `dotclaude:Concise`, based on the built-in Concise style.
- dotclaude changes the built-in system prompt, tool descriptions, output styles, and other instructions through the Mod API, after an agent extracts them from the bundle.
  Reading the bundle is permitted, and a patch is not.
- The setup adapts to the account type of the user.
  Pro is the baseline, and Max 5x, Max 20x, and API-key accounts scale from it, with the same features: for example, more parallel subagents and better model and effort picks.
- The auto mode classifier allows each safe command, and the removal of Claude Code worktrees and Claude Code temp folders is safe.
  A command that leaks env vars or secrets, and each dangerous or destructive system, `git`, or tooling command, goes to ask or deny.
- The user narrows the native auto mode classifier, permission system, and sandbox, in the way of macOS (the user, 2026-10-12).
  Normal work passes with no prompt.
  Risky but recoverable work needs the user, like `sudo`.
  Each destructive action on a database, the system, `git`, or anything else is forbidden, also when the user asks for it, like SIP and AMFI.
  The user can still run such a command with a `!` command.
  The `autoMode.hard_deny` list holds the forbidden actions, and the classifier reads `autoMode` only from the user settings.
- When the destructive floor stops an action, the agent does not try another way.
  It stops that work and asks the user to run the exact command with a `!` command, then waits.
  A subagent stops and puts the exact command in its report, and the main session gives it to the user (the user, 2026-10-13).
- Each session records the dotclaude version and the short commit SHA of the build, so that an analysis of the sessions can tell which build had which problem (the user, 2026-10-13).
  The record costs 0 model tokens.
  It goes into the transcript only if Claude does not see it there, and else into a file of `.dotclaude/` keyed by the session id.
- Each commit and each pull request that Claude makes carries the attribution of Claude Code, and a hook adds it, not prompt text (the user, 2026-10-13).
- The built-in plugins `cc-plugin-agents-md` and `cc-plugin-you-should-know` stay off, and two new add-ons replace them at zero or low token cost: `dcc-plugin-agents-md` and `dcc-plugin-you-should-know` (the user, 2026-10-13).
  They copy no code of the built-ins.
  `AGENTS.md` gets the support of `CLAUDE.md` in each of its places.
  A notice of `dcc-plugin-you-should-know` shows as a toast before the action and does not stop it.
  `dcc-plugin-you-should-know` is opt-in.
  With an API key it makes a separate Haiku call, and on a subscription it forks the main conversation, until Claude Code lets a subscription make separate calls from a hook.
  The line names the model that made the call, and no model name is hard-coded.
  When no model is found, the line says `Claude` in place of the model name and version.
- dotclaude uses the garbage collection of Claude Code.
- dotclaude uses the worktrees of Claude Code, such as `isolation: worktree`, `EnterWorktree`, `ExitWorktree`, `--worktree`, and the `worktree` settings, and makes no worktree of its own with `git worktree add`.
- dotclaude uses `.claude/rules/`: a rule with `paths:` loads only when Claude works with a matching file, so it replaces runtime code and `CLAUDE.md` text that applies to some files only.
  This repository uses its own rules in the same way.
- dotclaude has a `/rules-creator` skill, based on the `skill-creator` skill of Anthropic, that is short and covers each needed area.
- dotclaude knows each file and folder of `.claude/` and `~/.claude/`: what it does, when Claude Code reads it, and what controls it.
- dotclaude writes its own files to `.dotclaude/`, with a layout based on `.claude/`, and keeps `.claude/` for the files that Claude Code reads.
  A path that git must not track goes to `.gitignore` when the team shares the rule, or to `.git/info/exclude` when only the local checkout needs it.
  `.dotclaude/` is the `.claude/` of dotclaude: it also holds the spec store, which moves from `.dotclaude/spec/changes/` to `.dotclaude/spec/changes/`, and git tracks it.
  dotclaude 1.0.0 reads `.dotclaude/` by itself, and 0.28.0 does not read it.
- The spec store keeps its lane changes in an append-only `events.jsonl`, one line for each change, in place of `state.json`.
  The lanes come from the log, so each fact is in one place, each change is a one-line diff, and two branches merge with no conflict.
- dotclaude does each task at zero token cost where it can: a hook, a script, a setting, or a status line command does the work, not a model call or a turn of Claude.
  For example, the lanes of `state.json` change when a package is ticked or merged, with no model call.
- The `asks` slice asks only when a change weakens a check, and never for a read.
  A change to a test, CI, lint, runner, hook, settings, or limits file that keeps or adds checks gets no ask.
- The subagent runs of dotclaude use the lessons of the Bun port to Rust ([Bun in Rust](https://bun.com/blog/bun-in-rust)), at the scale of a subscription and not of the API.
  Each step fits one run, one `reviewer` reads only the diff of a package, a subagent cannot run a git command that changes shared state, and few runs go at once.
- This repository has a project agent `implementer` that links to the 1.0.0 agent of the plugin, on `claude-sonnet-5-5` at `effort: medium`, in place of the installed 0.28.0 agent on Haiku.
- The root session is the orchestrator, and each subagent is a worker that cannot start a subagent (the user, 2026-10-13).
- The agents and their models (the user, 2026-10-13, from the reports in `docs/research/agents-models/`):
  `planner` and `reviewer` on Opus 5.5 `high`, `debugger` on Opus 5.5 `medium`, `implementer` and `researcher` on Sonnet 5.5 `medium`, and `investigator` on Haiku 5.5 `medium` for code search only.
  No subagent runs on Fable 5.1 or Mythos 5.1.
  When the same check of an `implementer` fails two times, the root sends the work again with `model: opus`.
  The `investigator` quotes only the numbers that a tool returned.
- No agent has a `maxTurns` (the user, 2026-10-13).
- The prompt of each agent follows the prompt guidance of Anthropic for its model, the failures of `external/agent-failure-dossier/`, and the style of XML tags in Markdown (the user, 2026-10-13).
- The root resumes a stopped agent with `SendMessage` and never starts a new agent for its work, and a hook enforces this with no escape (the user, 2026-10-13).
- The advisor tool is opt-in (the user, 2026-10-13, [evidence](evidence/advisor.md)).
  With no `advisorModel`, it adds no token, so the `trim` slice does not turn it off.
  With an `advisorModel`, each request of the root and of each subagent has about 1,358 tokens more, so `/dotclaude:setup` sets it only when the user asks.
- The wiki gives each choice of 1.0.0 a short reason and the alternatives that dotclaude did not take, with the reason for each.
  `docs/` holds the research of this repository, and `just wiki` does not publish it (the user, 2026-10-13).
- The spec system of 1.0.0 changes with no compatibility, from the research in `docs/research/spec-driven/01-sdd-sources.md`, with a focus on `traceSDD`: file types, formats, Markdown front matter, and states (the user, 2026-10-13).
  Each external source of the research gets a public citation on the wiki page `Attributions` (the user, 2026-10-13).
- Each phase of the spec flow has one slash command, named with the verb of its phase, such as `/dotclaude:specify`, `plan`, `tasks`, `implement`, `review`, `accept`, and `archive` (the user, 2026-10-13).
  The subcommands of `dotclaude-spec` take the same names, and the CLI gets the renames to match (the user, 2026-10-13).
  The research found no state model in `traceSDD`, so the states are the design of dotclaude: `design-spec.md`.
- Jev decided five points of the redesign, because the user gives each decision to Jev (the user, 2026-10-13):
  - dotclaude has its own states, and each state change has a gate with recorded evidence (confidence 0.98).
  - No `tasks` phase: the packages of `plan` are the tasks (0.88).
  - A separate `merge` command merges a package (0.20, not sure, so easy to change).
  - A small fix is a trivial change on the short path of the same states, and `/hotfix` goes away (0.69).
  - Code cites the requirement IDs on each non-trivial line, as the `traceSDD` paper measured (0.53).

## Scope

- The architecture: ports and adapters in vertical slices, with a generated composition root ([design](design.md)).
- The spec workflow: the `spec/` store, the `dotclaude-spec` CLI, and the skills `/spec`, `/hotfix`, `/ship`, and `/handoff` ([workflow](workflow.md)).
- The handoff: handoff, `/clear`, and resume, in place of compaction.
- The decisions slice: Jev, with a fallback to a small Claude model.
- The prompt slices: the transforms of the system prompt, the tool descriptions, and the other built-in texts.
- The trim slice: the settings and mod rules that turn off the built-in parts that dotclaude does not need.
- The output style `dotclaude:Concise`.
- A fixed set of seven agents, with a set model and effort for each.
- The rebuilt status line, and the settings snippet in schema order.
- The add-ons on the new layout, with `dotclaude-lab` as a debugging add-on that works alone.
- The removal of OpenSpec, of the `dotclaude-jev` add-on, and of each 0.28.0 file.
- The wiki, the README, and a new CHANGELOG that starts at 1.0.0.

## Out of scope

- A migration path from 0.28.0.
- An MCP server.
  A skill with a CLI costs less at the start of a session.
- Dynamic model routing.
  The evidence does not support it ([workflow](workflow.md#agents)).
- A patch of the Claude Code binary or its package.

## Resolved

- The changes in `plugins/dotclaude-jev/` that were not committed are discarded (the user, 2026-10-12).
- The architecture is ports and adapters in vertical slices (Jev, confidence 0.82).
- `dotclaude-lab` stays as a debugging add-on that works alone, with `capture`, `sandbox`, `schema`, and `eval-compare` (the user).
- The decisions service is a slice of the core plugin, not an add-on (Jev, confidence 0.78).
  So the `dotclaude-jev` add-on goes.
- dotclaude ships transforms keyed by the id of each built-in section, not copies of the built-in texts (Jev, confidence 0.98).
  A test checks on each Claude Code version that each transform finds its section.
  The extracted texts stay in `external/`, which git ignores.

## Evidence

The research of 2026-10-12 is in the session reports, and each design file names the source of each decision.
