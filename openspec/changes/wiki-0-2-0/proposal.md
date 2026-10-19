# Proposal: wiki-0-2-0

## Why

The wiki mixes the docs of `claudetto`, the history of `dotclaude`, and notes on Claude Code `2.1.296`.
The user wants two clean parts (the user, 2026-10-19):

1. `claudetto` 0.2.0 and later.
2. Claude Code `2.1.303`: each documented and undocumented surface, the full architecture and pipeline ("how does Claude Code work"), and each piece of API surface exactly as it is in `2.1.303`, with how it works and where it can be used.

## What Changes

- All pages come from `src/wiki/`, and `just generate` writes `wiki/` (D13 of `release-0-2-0`, task 10.4).
- `wiki/archive/` and `docs/research/` go. A cited fact moves to an evidence page first.
- Part 1 has one page for each slice and add-on of 0.2.0. Pages of removed slices go.
- Part 2 is a new reference of Claude Code `2.1.303`, with a mark for the status of each item.
- Each mention of `dotclaude` goes (task 2.3).
