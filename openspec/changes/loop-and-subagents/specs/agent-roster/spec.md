## ADDED Requirements

### Requirement: Measured Model Pins

The model pin of each claudetto agent SHALL rest on a measurement: a paid probe of one task in `claudetto:Hephaestus` on Sonnet and on Opus, with the tokens and the plan share of each run in `src/wiki/claudetto/evidence/`.

#### Scenario: Probe Result

- **WHEN** the probe shows that Sonnet uses no fewer tokens than Opus for the same result
- **THEN** the evidence page says so, and the pin changes only with the approval of the user
