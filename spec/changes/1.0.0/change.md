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
