## ADDED Requirements

### Requirement: Every Surface Is Read and Cut

Each surface claudetto reaches SHALL be read before and after its cut by `just capture` or `just inventory`: the session prompt, tool texts, agent and skill texts, the output style, hook output, and the classifier request (D21). A fresh session SHALL cost less than the 13.8k-token baseline (G6).

#### Scenario: Release Reading

- **WHEN** `0.1.0` is cut
- **THEN** `just capture --shipped` reads a first request below the `0.0.0` reading, and `just inventory` passes
