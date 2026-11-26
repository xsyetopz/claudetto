# Release Measurements, 2026-11-26

Claude Code 2.1.329, Haiku 5.5, effort high, window 100,000, n=3 per arm, commit 425e0af0d. Holdout lines are arm aggregates only (ADR-0193).

```text
claudetto suite (2026-11-26T01-51-35-352Z/aggregate-result.json): with score 0.956 cost $0.42 turns 459; vanilla score 0.795 cost $2.19 turns 587
claudetto holdout (results/holdout-2026-11-26T01-33-17-226Z.json): with score 0.963 cost $0.14 turns 187; vanilla score 0.914 cost $0.18 turns 243
claudetto-spec suite (2026-11-26T01-33-36-338Z/aggregate-result.json): with score 0.967 cost $0.29 turns 297; vanilla score 0.732 cost $0.28 turns 348
claudetto-spec holdout (results/holdout-2026-11-26T01-46-14-733Z.json): with score 1 cost $0.14 turns 170; vanilla score 0.586 cost $0.11 turns 184
claudetto suite traces: with input 7444141 output 269701 tool_calls 367; vanilla input 8950936 output 317541 tool_calls 494 (72 runs each; result usage, tool_use blocks)
claudetto-you-should-know seeded (ysk-seeded, 18 cases x 3, Haiku 5.5): turn-end check hits 25/29 false alarms 1/24 side requests 99 (input 356236, cache read 1488564, cache write 591403, output 45971); HEAD e0ba94bff hits 12/30 false alarms 2/24 side requests 72 (input 269196, cache read 938462, cache write 595857, output 25933)
```
