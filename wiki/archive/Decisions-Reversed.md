# Decisions-Reversed

The decisions of 0.x that 1.0.0 reverses, with the reason for each reversal.
The decisions in force are in [Decisions](Decisions).

## Settings

None yet.

## Prompt

None yet.

## Router

None yet.

## Tools

None yet.

## Layout

None yet.

## Evidence

- D27, the claim-check part: a `Stop` prompt hook judged the claims of each reply.
  The 0.28.0 choice was this hook, with no other check of a passed claim.
  Reason: the hook failed its hook eval on 2026-10-12, because a block carried the whole evaluator prompt, and a repeated reply passed in 2 of 3 runs.
  Source: [Stop-Prompt-Hooks](Stop-Prompt-Hooks), section "Removal in 0.29.0".
