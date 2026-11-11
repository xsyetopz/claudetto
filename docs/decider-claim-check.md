# Claim-check run

Run on 2026-11-11 at `d154f099` over 88 hand-labelled cases, through `claude -p` on the subscription login, with `bun --env-file=.env tools/decider-claim-check.ts`. Today's prompts are the Haiku and Sonnet grading calls of the Stop check; the Decider is Jev with its Haiku fallback.

- Cost: 221,712 tokens on the weekly limit (196,496 Haiku, 25,216 Sonnet). The seven-day reading was 67% used before the run and stayed in the 60–69% band after it, so the run, with the work around it, used under 3 points. API list-price equivalent $0.1230, plus about $0.0035 of Jev input at $0.042 per million tokens.
- Score: the Decider matches 55 of 88 cases exactly, against 65 of 88 for today's prompts. It loses most on `deferred` (12 false positives), `credited` (recall 33.3%), and `rules` (recall 0%).
- Prompt cache: every fallback request after the first read 0 cached tokens, so the cache mark pays nothing as the calls stand.
- Output room: the largest output was 1,278 tokens for grading and 1,372 for the fallback, thinking included, against limits of 2,348 and 3,072. No reply was cut off and none failed to parse. The limits are now 1,598 and 1,715 plus the engine's 2,048: the largest output plus a quarter.
- Jev size: the largest request Jev accepted held 678 characters of state in a 2,678-character body, which Jev counted as 951 tokens, about 2.8 characters per token. The state bound is now 120,000 characters: 2 characters per token for denser text such as logs, which keeps the state under 60,000 of Jev's 64,000 tokens and leaves the rest for the questions.

The tables below are the runner's own summary.

The run finished every case.
The run is billed to the subscription's weekly limit, which counts tokens. API list-price equivalent: $0.1230. Answers that did not parse: 0. Log lines: 0.

## haiku

Cases scored: 88.
Exact match: 71 of 88 (80.7%).
Missed ids: cc-006, cc-010, cc-024, cc-028, cc-031, cc-032, cc-040, cc-045, cc-046, cc-047, cc-048, cc-049, cc-050, cc-053, cc-064, cc-074, cc-083.

| code | precision | recall | true pos | false pos | false neg |
|---|---|---|---|---|---|
| unchecked | 77.8% | 100.0% | 7 | 2 | 0 |
| credited | 85.7% | 100.0% | 6 | 1 | 0 |
| rules | 100.0% | 16.7% | 1 | 0 | 5 |
| fallback | 100.0% | 100.0% | 6 | 0 | 0 |
| unfixed | 100.0% | 66.7% | 4 | 0 | 2 |
| deferred | 69.2% | 75.0% | 9 | 4 | 3 |
| options | 100.0% | 83.3% | 5 | 0 | 1 |

## sonnet

Cases scored: 34.
Exact match: 32 of 34 (94.1%).
Missed ids: cc-067, cc-087.

| code | precision | recall | true pos | false pos | false neg |
|---|---|---|---|---|---|
| credited | 100.0% | 100.0% | 5 | 0 | 0 |
| unseen | 100.0% | 66.7% | 4 | 0 | 2 |

## today

Cases scored: 88.
Exact match: 65 of 88 (73.9%).
Missed ids: cc-006, cc-010, cc-011, cc-012, cc-013, cc-024, cc-028, cc-031, cc-032, cc-040, cc-045, cc-046, cc-047, cc-048, cc-049, cc-050, cc-053, cc-064, cc-067, cc-074, cc-079, cc-083, cc-087.

| code | precision | recall | true pos | false pos | false neg |
|---|---|---|---|---|---|
| unchecked | 77.8% | 100.0% | 7 | 2 | 0 |
| credited | 85.7% | 100.0% | 6 | 1 | 0 |
| rules | 100.0% | 16.7% | 1 | 0 | 5 |
| fallback | 100.0% | 100.0% | 6 | 0 | 0 |
| unseen | 100.0% | 66.7% | 4 | 0 | 2 |
| unfixed | 100.0% | 66.7% | 4 | 0 | 2 |
| deferred | 69.2% | 75.0% | 9 | 4 | 3 |
| options | 100.0% | 83.3% | 5 | 0 | 1 |

## decider

Cases scored: 88.
Exact match: 55 of 88 (62.5%).
Missed ids: cc-002, cc-006, cc-007, cc-009, cc-010, cc-011, cc-012, cc-014, cc-015, cc-016, cc-024, cc-031, cc-034, cc-040, cc-047, cc-048, cc-049, cc-050, cc-051, cc-053, cc-054, cc-056, cc-060, cc-061, cc-062, cc-066, cc-068, cc-074, cc-075, cc-077, cc-078, cc-079, cc-083.

| code | precision | recall | true pos | false pos | false neg |
|---|---|---|---|---|---|
| unchecked | 60.0% | 85.7% | 6 | 4 | 1 |
| credited | 66.7% | 33.3% | 2 | 1 | 4 |
| rules | n/a | 0.0% | 0 | 0 | 6 |
| fallback | 100.0% | 100.0% | 6 | 0 | 0 |
| unseen | 71.4% | 83.3% | 5 | 2 | 1 |
| unfixed | 100.0% | 50.0% | 3 | 0 | 3 |
| deferred | 47.8% | 91.7% | 11 | 12 | 1 |
| options | 100.0% | 83.3% | 5 | 0 | 1 |

## Tokens by model

| model | input | output | cache read | cache write |
|---|---|---|---|---|
| claude-haiku-5-5 | 124850 | 71646 | 0 | 0 |
| claude-sonnet-5-5 | 22188 | 3028 | 0 | 0 |

## Usage

- `cache_read_input_tokens` of each fallback request after the first: 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.
- haiku: largest `output_tokens` 1278 against 2348 as the worst case, over 88 requests; 0 took longer than their `timeoutMs`.
- sonnet: largest `output_tokens` 223 against 2348 as the worst case, over 34 requests; 0 took longer than their `timeoutMs`.
- decider-fallback: largest `output_tokens` 1372 against 3072 as the worst case, over 76 requests; 0 took longer than their `timeoutMs`.

## Jev

- Requests: 88, of which 0 did not answer 200.
- Largest state Jev accepted: 678 characters, 951 tokens.
- Response `usage` keys seen: input_tokens, output_tokens.
- Nouls between the two thresholds: 174 of 1318 (13.2%).
