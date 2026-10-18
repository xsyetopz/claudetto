# Proposal: trim-0-2-0

## Why

claudetto 0.1.0 adds many parts that Claude Code 2.1.302 already does, and some parts do measured harm.
The aim of 0.2.0 is a small framework that makes vanilla Claude Code token-efficient.

## What Changes

- Cut the slices and add-ons with the verdict `cut` in the table of `design.md`.
- Trim `guard`, `setup`, `prompt`, `handoff`, `statusline`, `sembr`, `claudetto-lab`, `src/kernel`, and `tools`.
- Rewrite `claudetto-sessions` as one skill with scripts.
- Add the `ground` slice.
- Breaking changes are permitted, with no legacy upkeep (the user, 2026-10-18).

## Supersedes

This change replaces the open tasks of `release-0-2-0` that touch a cut part.
