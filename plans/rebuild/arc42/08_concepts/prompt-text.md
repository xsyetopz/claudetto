# Prompt Text

## Echo Workarounds

- [ ] **CC-001** Workarounds for unwanted echo of notes: let the model dump the info first in a labeled author's-note paragraph; tag small notes "do not make this explicit, it is only to inform"; pack notes into precise single words. Block rules "no-note-echo" (notes govern silently, infer fresh) and "no-obviousness" (assume baseline stakes understood) are reported as hit-or-miss; "stay on the boat" grounded-scope rule: check the premise first, answer from the strongest evidence, add caveats only when they change the logic, no unsupported expansion.
  Basis: reported.
  Source: external/2026-10-22/reddit.com-r-chatgpt-comments-1tpk1qk-how-to-avoid-the-pink-elephant-pa-20261022T004323Z.md:351; external/2026-10-22/reddit.com-r-chatgpt-comments-1tpk1qk-how-to-avoid-the-pink-elephant-pa-20261022T004323Z.md:363 (url: <https://www.reddit.com/r/ChatGPT/comments/1tpk1qk/how_to_avoid_the_pink_elephant_paradox/>).

## Rules

- [ ] **CC-002** Every prompt text shall use no hard word limit in a concise or sentence-style rule: Fable 5.2 turns prose choppy under "one instruction per sentence, in 20 words or fewer"; the you-should-know "at most 20 words" cap is a risk only on Fable.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:32.

- [ ] **CC-003** A JSON-only request on Sonnet 5.5 skips working-out at low and medium effort; a prompt that asks for JSON shall use structured outputs, parse the last JSON value, or add "Think the problem through before you answer." This applies to the Stop grader and to the you-should-know check instructions.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:35.

- [ ] **CC-004** A style rule shall tell the model what to cut (restating the question, recaps, hedging) and not a length, and shall scope the short rule to replies and not to docs or code the model writes.
  Basis: reported (anecdote).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:186.

- [ ] **CC-005** Each skill shall state a shared paragraph once and reference it: the propose and update skills repeat the delta-format paragraph (about 560 characters), "Never edits code" is said once in update, and the apply skill gets "Work every unticked task until a stop in step 5 applies."
  Basis: observed in transcript (read in the audit).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:241; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:244.

- [ ] **CC-006** Each text a hook injects lands in the newest turn, so the cache prefix and preserved thinking hold: the `additionalContext` of a hook, and the Stop feedback, arrive with the event and continue the turn, not as an edit of earlier turns. The pin note is dropped with the constraint ledger, and the Stop block is dropped with ADR-0104 (the advisor tool stays disabled and there is no constraint ledger; user decision, recorded in the 2026-11-17 handover (day of decision not recorded)). The silent-turn reminder is a Claude Code setting that setup turns off (`groups.test.ts:121@088a227c`). `planModeText` has no baseline code (REQ-SETUP-042) and no Claude Code side in 2.1.327, so its landing is a build-time check on the engine's own plan-mode path.
  Basis: cited (clawdipedia extend/mod-api/types/classic/result-config-elicitation: `additionalContext` is text handed to the model with the event; extend/hooks/session-events: Stop `additionalContext` is feedback that continues the turn; read on 2.1.327). Status: partial at 088a227c (the silent-turn setting exists; no `planModeText`, no pin note in the plugin tree).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:328.
