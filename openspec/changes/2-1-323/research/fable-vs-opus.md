# Fable Against Opus 5.5 Beyond the Advisor Role

Source: `external/` captures read on 2026-11-13: 54 files named for Fable or Mythos, plus `export-Opus 5.5 for everything, or mixing models across plan - implement - review-.jsonl`, `export-Holy shit, it refuses to eat usage.jsonl`, and `export-Be careful with Opus 5.5’s confidence.jsonl`. Tags: M measured by the author, A anecdote, V vendor or mod-bot claim relayed. All is self-reported and untrusted. Most 5.2 posts are one run from the launch week; most measured ones are 5.1.

## Verdict

Fable is not a general model. Accuracy ties on controlled runs at 1.5x to 3x the cost, and Opus 5.5 is the preferred implementer. Fable holds a case for review, planning from a vague brief, unsticking an Opus loop, and long orchestration. Mythos 5.2 is "the same model with the cyber and bio safeguards on top" (one commenter, A); no 5.2 Mythos report exists.

## Measured

| Source | Result |
|---|---|
| `export-Opus 5.5 is the real deal...jsonl`, Merrymak3r, 5.1, M | 23 graded tasks. Opus 5.5 and Fable 5.1 both 100%. About $0.09 against $0.26 per passed task; 27s against 41s. Token counts match on the frontier tier, so the gap is mostly price per token. |
| `export-Anyone else not using Fable AT ALL recently-.jsonl`, SatoshiReport, M | About 30 issues on both models. Reopens equal; Fable cost 2x. |
| `...1xs5rpr-have-you-tried-fable-52...md`, ontagi, 5.2 | About 2.5x Opus at high. |
| `...1xtbvob...md`, klashnkoof1, 5.2 | Opus xhigh 51 min and $19; Fable high 58 min and $29. |
| `...1xs2wdl...md`, OpenMarkAI, 5.2, M | Fable 74% at $0.062 and 74s; Opus 5.5 68% at $0.028 and 40s. |
| `...1xs84wp...md`, mod-bot, 5.2, V | Fable high 45.3% against Opus xhigh 45.5% at about half the per-task cost. |
| `...1xujhrk...md`, Arqium, 5.2, M | Adjudicator step: Fable low 98 and 98; Opus 59, 98, 65, 53. About 45% more per run. |
| `...1xsxbf9...md`, Round_Ad_5832, 5.2, M | Six small repos, 2 runs each. Seeded bug: Fable 2 of 2, Opus 0 of 2. Opus about 2.1x faster. A Fable instance ran it. |
| `2026-10-01_p2/export-PSA...advisor...jsonl`, V | Opus high with a Fable advisor: 90.1% at $2.92; Opus xhigh alone: 91.1% at $4.11. |
| `2026-10-07/export-so why use Fable 5.1...jsonl`, CodeCombustion, 5.1, M, no n | Errors about 11% on Fable and about 31% on Opus orchestration. |
| `...1xusayn...md`, DrewHoov, 5.2 | A Fable usage-cap cut: 117m weighted tokens to reach 100% against 230m before. |

## Roles

- **Review and sweep, for:** bugs Opus missed (calunicornia, SocketByte, Sirramza, the seeded-bug run). **Against:** retractions (extopico), a refusal on weapon terms (Hazzman), and a later agent finding what an earlier one missed (a confound).
- **Planning, for:** Fable plans and Opus executes is the stated consensus (`...1xtdfma...md`, `...1xtyq0y...md`). **Against:** Opus found mistakes in Fable's plans in 8 sessions (Bitter_Physics_239); TiuTalk's 5-project test had Fable leading on simplicity with core-mechanism bugs in 4 of 5 plans.
- **Orchestration, for:** CodeCombustion, geek_fit, armeg, Ja_Rule_Here_. **Against:** "Don't use Fable 5.1 or Fable 5 for Orchestration" (over-spawning), JackRabbit999 (weekly cap in 1 to 2 days), Grouchy_Memory_1338.
- **Implementation:** Opus is the stated consensus. Fable wins on stuck problems (decompilation, cloth and path-tracing performance, shader bugs) and loses on routine edits (KayBay80: 500K tokens of reading before two edits).
- **Advisor:** cheapest use. One user (dbbk) says it draws no separate Fable allowance; the docs read this session do not state it, so it stays unverified.

## Failure Modes

Quota burn (many, A); passivity and corner-cutting (5.2); literal reading of terse prompts (5.2); Fable subagents spawned unasked, and a subagent resumed as Fable when no subagent model is set (AdriftAtlas); excess research before an edit; refusals under the cyber, bio, and AI R&D safeguards; ignoring `CLAUDE.md` (two reports). Opus failures noted in the same threads: drift in long runs, and incomplete investigations that a review pass catches (`export-Be careful with Opus 5.5’s confidence.jsonl`).

## Not Checked

- The three files under `2026-10-02/` are byte-identical to their `2026-10-01_p2/` copies (`cmp`, observed).
- Launch-week free Fable resets and a launch offer on the weekly share come from commenters.
- The `claude-fable-and-mythos-5-2` announcement is a link in a thread and was not read.
