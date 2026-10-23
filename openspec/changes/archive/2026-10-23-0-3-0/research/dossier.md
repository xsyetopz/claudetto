# Agent Failure Dossier: Capabilities for 0.3.0

Source: `external/agent-failure-dossier/` (v2, 2026-10-10), read on 2026-10-21: `00-INDEX.md`, `05-appendices-and-limitations.md`, `08-session-log-corpus.md`, and the "Recipe" part of each issue in `01` to `04`, `06`, and `07`.
Its session logs are of one user, on a plugin that copies claudetto designs (`08-session-log-corpus.md:8`), so a count shows that a failure occurs, not how often.

## Rules That Apply to Each Capability

- Enforcement ladder (`00-INDEX.md:43`): prose is the weakest layer, and a deterministic hook or a permission rule is the strongest.
  In the logs, prompt-only fixes failed again on the same incidents, and lints, hooks, and turn counters held (`08-session-log-corpus.md:73`).
  So a rule that a check can enforce becomes a mod hook, and the prompt keeps only rules that no check can enforce.
- Deterministic layers held each time (`08-session-log-corpus.md:56`): the `rm` check, the `.env` deny, and the permission denials.
- Over-deferral was among the most frequent corrections of the user (`08-session-log-corpus.md:72`), and "ask first" rules spread into it (`00-INDEX.md:56`).
  This session repeated it: I asked before stub captures that cost nothing (fault 53).
- Shared-tree parallelism caused the most destructive incidents, through `git stash` in subagents (`08-session-log-corpus.md:76`).

## Map

"New" means 0.2.0 has no such part.
Each surface is the cheapest one that does the work (architecture, "Zero-Base Question", rule 2).

| Issue | Recipe step | claudetto 0.3.0 | Surface | Verdict |
| --- | --- | --- | --- | --- |
| I01 ungrounded defaults | Derive the state, do not describe it (`01-grounding-and-memory.md`, I01, step 1) | Put the branch, the last tag, the manifest version, and the open OpenSpec changes in the environment message | mod `prompt.context` | new (proposed) |
| I02 instruction decay | Make each checkable rule a hook or a lint (I02, step 1) | `ground`, `sembr`, and the gate stay mechanical | mod hooks | keep (architecture, verdict table) |
| I02 | Mine transcripts for repeated corrections (I02, step 3) | The `claudetto-lab` replay | lab skill | keep |
| I03 context rot | Compact early, about `200k` (I03, step 1) | The compaction window of the eval | settings | measure (`p5b-internals.md`) |
| I03 | A handoff schema in place of a free summary (I03, step 2) | `handoff` | mod `session.compact` | compare with the built-in summary |
| I04 false completion | A `Stop` check that runs the real check (I04, step 1) | The rebuilt `goal` | `Stop` check | rebuild |
| I04 | A fresh-context verifier (`00-INDEX.md:25`) | The `reviewer` agent gets the diff and the plan only | agent file | keep (D1) |
| I05 specification gaming | Make the referee unwritable (I05, step 1) | Deny `Edit` and `Write` on the settings files of Claude Code and on the plugin cache, so the agent cannot change its own gate | static `deny` and `tool.check` | new (proposed) |
| I07 destructive actions | A hook that refuses destructive patterns with "do not retry another way" (I07, step 2) | The gate of spec `permission-gate`, with the reason text | mod `tool.check` | keep |
| I07, I11 | `git stash` by subagents in a shared tree (`08-session-log-corpus.md:76`) | `git stash` without `list` or `show` is a destructive `git` command in the gate | mod `tool.check` | new (proposed) |
| I08 invented config keys | Validate config files against a schema (I08, step 3) | `claudetto-setup` validates the snippet against the settings schema of Claude Code | `bin/claudetto-setup` | new (proposed) |
| I08 | Gate a new dependency (I08, step 1) | n/a for 0.3.0 | - | not planned, a registry check makes a network call for each install |
| I09 bloat | Duplication and complexity lints as feedback (I09, step 3) | The `dry` skill, and the complexity bound of D7 | skill, `biome.json` | keep |
| I11 delegation | Single agent by default, and delegate only parts that share little context (I11, step 1) | The body of `claudetto:main` | agent body | keep (D9) |
| I12 cost | Medium effort by default, a small model for search (I12, steps 1 and 2) | `worker` on `medium`, `scout` on Haiku | agent files | keep (D1) |
| I12 | Brevity rules for replies (I12, step 5) | `claudetto:Concise` | output style | rebuild |
| I13 over-deferral | Try once before a hand-off, and a standing autonomy contract (I13, steps 1 and 2) | The body of `claudetto:main` holds the contract: stub captures, local checks, and reads need no question | agent body | new (proposed) |
| I13 | When cost is the reason to ask, state the number (I13, step 3) | Same contract | agent body | new (proposed) |
| I14 consent drift | A registry of values that the user owns, with an ask on each edit (I14, step 1) | `ask` with `decider: "person"` on an edit of a bound file (`limits.ts`, `budget.ts`), and the reason names the old and the new value | mod `tool.check` | new (proposed) |
| I14 | No "decision of the user" text without a matching prompt (I14, step 4) | `ground` already checks it (the `USER` pattern of `claims.ts`) | mod `tool.check` | keep |
| I17 background jobs | Kill by the saved PID, never by pattern (I17, step 5) | `pkill -f` and `killall` are destructive system commands in the gate | mod `tool.check` | new (proposed) |
| I18 environment | Write each environment quirk into a file that loads at the start (I18, step 4) | The shell facts (macOS has no `timeout`, zsh fails on a glob with no match) go into the environment message | mod `prompt.context` | keep (D9) |
| Appendix C, item 3 | A reply lost into a tool turn, fixed by a `Stop` hook that blocks a turn with no visible text (`05-appendices-and-limitations.md:71`) | A `Stop` check: a turn that ends with no text to the user gets one more turn | mod `Stop` | new (proposed) |
| Appendix C, item 4 | ASD-STE100 cut replies from about 580 words to about 100 (`05-appendices-and-limitations.md:72`) | The writing rules of `claudetto:Concise` | output style | rebuild |

## Not Taken

- A sandbox first (I07, step 1): the user turned the sandbox off (2026-10-21), and the gate and the static rules cover its job.
- A different vendor for review (I11, step 5): claudetto works only with Claude models.
- Held-out tests (I05, step 3): a test suite of the user is out of the scope of a plugin.
