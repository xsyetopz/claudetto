---
status: accepted
date: 2026-11-23
---

# A Solo Run Merges Each Slice to Main

## Context and Problem Statement

The rebuild was planned on branch `feat/2.1.329-next-from-2.1.327-unreleased`, which exists neither locally nor on `origin` on 2026-11-23 (`git branch -a`). Work lands through pull requests to `main` (the latest, #176, squash-merged). [ADR-0186](0186-slice-commits-as-boundaries.md) keeps slice commits local until the user decides how to push them, and the goal tells the agent to ask through `AskUserQuestion` when only the user holds an answer. On 2026-11-23 the user asked for one agent to finish claudetto without help or interruption, merging each slice to `main` with CI green. How does a slice reach `main`, and what happens to a decision only the user holds?

## Considered Options

- Keep slices on a long-lived feature branch and ask the user at each user-held decision.
- Merge each verified slice to `main` through its own pull request once CI passes, and decide user-held questions from the plan's defaults.

## Decision Outcome

Chosen: each verified slice goes from a branch off `main`, through a pull request, to `main` once CI passes; the branch is then deleted. The agent does not stop to ask. A user-held choice takes the default that the plan or an ADR sets. When neither sets one, the agent takes the smallest reversible option and records it as an ADR with status `proposed` and the note "agent decision, pending user review". A step that only the user can perform (a login, a device permission, a payment) becomes a risk-register item with a user-held Trigger, and work moves on.

## Consequences

- ADR-0186 still holds for the slice as the context boundary; its keep-local and squash-before-push clause gives way to one pull request per slice.
- `main` carries the rebuild state, so a bad slice is undone by reverting its merge.
- Decisions the user would have made are made earlier and reviewed later; each one sits in an ADR marked `proposed`.

Source: user decision, 2026-11-23 (session 8c1c0180-9331-498b-bcfa-eb1bef224e21); `git branch -a` and `git log -1 main`, 2026-11-23.
