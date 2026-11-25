# Propose Request Cost Against the Bundled Plugin

On Claude Code 2.1.329 (2026-11-25), the shipped claudetto-you-should-know propose prompt is 12,419 bytes against 34,244 for the bundled plugin's, so each request carries about 7,000 fewer input tokens. The mean `total_cost_usd` as measured does not show that saving (0.0521 against 0.0548) because the replays shared cache entries. Neither arm produced a card that states a git behaviour git contradicts more often than the other did: arm a gave 2 false cards in 6 replays and arm v gave no card at all.

## Method

The harness is the one in `reports/2026-11-20-research/ysk-tool-claim/`. `replay.sh` forks the dogfood session (`--resume <id> --fork-session --tools ""`, model `claude-sonnet-5-5`) and sends one propose prompt as the user turn, filled with the seven offers in the plugin store's `seen` list.

| Arm | Prompt | Source |
|---|---|---|
| a | the shipped claudetto prompt | `proposePrompt(seen, [])` in `plugins/claudetto-you-should-know/hooks/request/prompt.ts` |
| v | the bundled you-should-know prompt | function `Tn(seen, known)` of module `chunk-v2byvq1b.js` in the 2.1.329 binary |

The bundle calls `Tn(A, C)` for its propose fork (`s.model.fork({prompt:Tn(A,C)})`). `bundled-2.1.329-extract.js` holds the bytes of that module from `var Ge=` (the side-request frame) through the end of `Tn`, cut from the binary at byte offsets 332031074 to 332066858 and exported unchanged. `prompt.ts` imports `Tn` from it and passes `(seen, [])`, so arm v is the bundled text and not a reconstruction. With empty lists the extract gives 33,204 bytes, the figure the plugin README states.

The 2026-11-20 files are untouched. `replay.sh` here differs only in the default binary (2.1.329) and the arm names.

### Base Session

The dogfood base session `64d48dd8-950b-4465-ad38-8c5416b7e020` no longer existed in `/private/tmp/claude-501/df/cfg/projects/-private-tmp-claude-501-df-repo/` (`--resume` answered "No conversation found"). The base was rebuilt from fork `0fa53f50-3751-4a89-af00-15e0804adf7f`, a 2026-11-24 replay of that session: its first 87 transcript lines (everything before the replay's own attachment and reply), with the session id rewritten to `64d48dd8-...`. The replay prompt is not stored as a transcript turn, so the rebuilt history ends at the leaf the fork recorded (`fc0fb465`). This is the same conversation, rebuilt rather than the original file.

## Commands

```sh
S=/private/tmp/claude-501/df/cfg/plugins/store/claudetto-you-should-know_inline-c6364fcb3207.json
export CLAUDE_BIN=$HOME/.local/share/claude/versions/2.1.329
O=$PWD/runs   # an absolute path: replay.sh changes directory before it writes
bun prompt.ts a $S | wc -c        # 12419
bun prompt.ts v $S | wc -c        # 34244
bash replay.sh a 1 $O
for r in 1 2 3 4 5 6; do
  [ $r != 1 ] && bash replay.sh a $r $O
  bash replay.sh v $r $O
done
```

Each launch ran outside the sandbox. `runs/` holds each result JSON (`a-1.json` and the rest), and `runs/prompt-a.txt` and `runs/prompt-v.txt` hold the two prompts as sent.

## Results

| Arm | Prompt bytes | Mean `total_cost_usd` | Mean input | Mean cache write | Mean cache read | Mean output | Cards | False cards |
|---|---|---|---|---|---|---|---|---|
| a, shipped claudetto | 12,419 | 0.0521 | 2 | 12,255 | 20,893 | 96.5 | 2 of 6 | 2 |
| v, bundled 2.1.329 | 34,244 | 0.0548 | 2 | 12,778 | 32,941 | 36.2 | 0 of 6 | 0 |

Per run (`cost`, cache write, cache read, output tokens):

| Run | a | v |
|---|---|---|
| 1 | 0.0946, 22925, 0, 285 | 0.1963, 48873, 0, 85 |
| 2 | 0.0944, 23120, 18731, 6 | 0.0050, 0, 48873, 6 |
| 3 | 0.0042, 0, 41851, 6 | 0.1125, 27794, 2153, 108 |
| 4 | 0.0050, 0, 22925, 270 | 0.0050, 0, 48873, 6 |
| 5 | 0.1100, 27484, 0, 6 | 0.0050, 0, 48873, 6 |
| 6 | 0.0042, 0, 41851, 6 | 0.0050, 0, 48873, 6 |

Cost of the sweep: $0.3125 (a) + $0.3286 (v) + $0.0042 for one diagnostic replay outside the table = $0.645 for 13 calls, against the $8 cap. Two launches failed before any API call and cost nothing (see Faults).

### Cost Reading

The mean cost is not a clean comparison, because the runs reuse each other's cache. A run that finds its prefix cached bills 0.004 to 0.005 whatever the prompt, and a run that writes it bills 0.09 to 0.20. Which runs hit the cache depended on the order, not on the arm.

Two readings that remove the cache effect:

- Total input tokens per call (input + write + read) where both arms ran at the same context size: arm v 48,873 on five runs, arm a 41,851 on three runs, so the prompt adds 7,022 tokens. Runs a-1 and a-4 (22,925) against the v runs at 29,949 (v-3) show a gap of 7,024 tokens.
- Cold cost, every token priced as a write (about $4 per million tokens, solved from runs a-1 and v-1: 22,925 tokens and 285 output tokens cost 0.0946, 48,873 and 85 cost 0.1963): arm a 0.134, arm v 0.183 per call, so arm v costs about 37 percent more when nothing is cached. The write price is derived from these two results, not read from a price list.

### Card Accuracy

A false card states a git behaviour that git contradicts: the force-added tracked file's later edits do show in `git status`.

- a-1: the learn line says later edits to the force-added README "won't show up in `git status`". False (its own explanation says the opposite).
- a-4: the learn line says later edits to that file "need `git add -f` too". False: a tracked file needs no force-add. The explanation says later edits commit normally.
- a-2, a-3, a-5, a-6 and all six v replies: `learn: none`. No card, so no false card.

Arm v wrote no card in 6 replays. That is no worse on accuracy, and it carries no information on how accurate its cards would be when it does write one. Arm a wrote 2 cards and both learn lines were false. The sample is small: 2 of 6 against 0 of 6 is not separable at this size.

## Unexplained

The context size of a replay of the same arm varied between runs: arm a totalled 22,925, 27,486 or 41,851 tokens for the same prompt, and arm v totalled 48,873 on five runs and 29,949 on one. Steps of about 18,900 and 19,000 tokens recur. Thinking blocks that a resumed fork drops may explain them (the 2026-11-24 transcripts record a `thinking_drop` with reason `prefix_mismatch`), but no check here confirmed that. The 7,022-token prompt gap holds within each context size.

## Faults

- `reports/2026-11-20-research/ysk-tool-claim/replay.sh:9` redirects stdin from `$out/prompt-$arm.txt` after the `cd` to the repo, so a relative `<out-dir>` fails there ("No such file or directory") and then at the Python line with a JSON decode error. The copy here has the same line 9 and takes an absolute `<out-dir>`.
- `replay.sh:9` with the original session id answered "No conversation found with session ID: 64d48dd8-..." because the base session file had been removed from the config directory; see Base Session.

## Follow-up: A Rule From the Bundled Prompt

Hypothesis: the bundled prompt stays quiet because of a rule the shipped prompt drops. Check: diff `runs/prompt-v.txt` against `runs/prompt-a.txt` for rules on confidence, the threshold for a card, and silence.

Both prompts hold a confidence rule and a when-in-doubt rule. The shipped prompt has them in `<when_to_suggest>` (confidence, line 40 of `runs/prompt-a.txt`) and `<when_in_doubt>` (lines 141 to 143). The bundled text has these that the shipped one lacks, cited by line in `runs/prompt-v.txt`:

- Line 70: "The main agent is very capable and will very possibly find the same suggestion you do ... only suggest something if you have confidence that the topic has been or will be glossed over". The shipped prompt skips what the person engaged with, but never says the main agent will often cover a topic itself.
- Line 72: "Err on the side of not suggesting anything until you have confidence" (the shipped confidence bullet names incomplete evidence only).
- Line 75: "The bar for showing a suggestion is very high!" with "Default to learn: none."
- Line 156: "Err on the side of not suggesting anything!"
- Line 436: "you should be really confident that this is a worthwhile thing to explore, and that the main session isn't doing it".
- Line 488: "ONLY suggest something if it is not feasibly covered in the main session AND compelling AND relevant AND consequential."

Lines 70, 436 and 488 share one rule that the shipped prompt lacks: the main session probably covers the topic. Arm c is the shipped prompt with that rule added to the "has not engaged" bullet in `propose-text.ts`:

> The main agent is capable and often reaches the same point itself, so a note belongs only where the topic has been or will be glossed over, or where the person clearly missed it.

Arm c is 12,598 bytes against 12,419 for arm a. Replays: `bash replay.sh <a|c> <rep> $PWD/runs-c`, interleaved a, c, a, c for 8 repetitions each, the same base session and binary as above (`prompt.ts` arm a is the working-tree prompt without the sentence, which matched `runs/prompt-a.txt` byte for byte). Cost $0.3325 for 16 calls. A card counts as true when git or the session supports it, and as false when its learn line states a git behaviour git contradicts.

| Arm | Cards | True | False | Replays with a card |
|---|---|---|---|---|
| a, shipped | 3 of 8 | 2 (a-1, a-7: new files in `reports/` stay ignored) | 1 (a-6: "future edits there won't show up in `git status`") | a-1, a-6, a-7 |
| c, with the sentence | 2 of 8 | 1 (c-6: other report files were never committed) | 1 (c-8: "later changes to that folder won't show up in git status") | c-6, c-8 |

c-8 and a-6 have the same shape: a learn line about `reports/` as a whole whose explanation says edits to the force-added README do show. They are scored alike. If both are scored true instead, arm a has 0 false and arm c has 0 false.

Outcome: arm c has 1 false card against 1 for arm a under either scoring, so it does not have fewer false cards, and `propose-text.ts` is reverted. Over both sweeps arm a wrote 5 cards in 14 replays and arm v none in 6, so the bundled prompt's silence is not explained by the one rule tested here.

### Plugin Tests

`claude plugin test .` in `plugins/claudetto-you-should-know` (unsandboxed, after the revert): 172 pass, 0 fail, 26 files.
