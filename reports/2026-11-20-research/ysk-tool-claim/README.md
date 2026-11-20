# False Tool-Behaviour Card in you-should-know (issue #65)

A sentence that ties a claim about tool behaviour to output in the session does not reduce false cards. It does not ship, and RISK-510 is accepted. Measured on Claude Code 2.1.327, 2026-11-20.

## Fault

In a dogfood session (clone at fea3d5562), the main agent force-added `reports/2026-11-19-research/dogfood/README.md` past `.gitignore` and committed it. A Heads up card then said that later edits to that file would be silently ignored. That is false: a tracked file is not subject to `.gitignore`. After an appended line, `git status --short` in that clone printed ` M reports/2026-11-19-research/dogfood/README.md`.

## Replay

`replay.sh <a|b> <rep> <out>` forks the dogfood session (`--resume <id> --fork-session --tools ""`, claude-sonnet-5-5). It sends the propose prompt as the plugin builds it (`prompt.ts`), with the seven offers the session had already seen. Arm a is the current prompt. Arm b adds: "A claim about how a tool, command, or system behaves rests on output in this session that shows that behaviour; what you remember about the tool is not evidence." `replies.txt` holds the first 300 characters of each reply. Cost: $0.913 for 13 calls.

A card counts as false when it states a git behaviour that git contradicts.

| Arm | Cards | False | False claim |
|---|---|---|---|
| a, current prompt | 3 of 6 | 1 | a-1: "later edits to it ... won't be tracked" |
| b, with the candidate | 3 of 6 | 2 | b-2: "later edits may not show in git status"; b-6: "other branches and clones will not see it unless forced too" |

The true cards (a-2, a-6, b-1) say that new files in `reports/` need a force-add. An extra unscored call on arm a (a-0) replied `learn: none`.

Outcome: the candidate does not beat the current prompt (2 false against 1 in 6), so it does not ship (ADR-0177). The replay drops the tools from the fork, so its context differs from the live fork's in tool definitions only.
