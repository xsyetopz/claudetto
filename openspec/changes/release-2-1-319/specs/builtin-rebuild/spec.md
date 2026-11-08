## MODIFIED Requirements

### Requirement: A Rebuild Names Its Model and Bounds Its Prompt

A rebuild that calls a model MUST call `$.model.complete` with an explicit `model`, an explicit `effort`, and an explicit `maxTokens`, and MUST NOT call `$.model.fork`. The prompt MUST be a digest the plugin builds itself, with its fixed part in a `cache: true` block, and MUST NOT be the whole session window.

#### Scenario: A Fork Is Proposed Instead

- **WHEN** a rebuild would call `$.model.fork`
- **THEN** it is refused, because `ModelForkRequest` is `{ prompt: string }` with no model field and the engine rebuilds the main thread's last request, so the call would run on whatever model the session runs

#### Scenario: One Check

- **WHEN** the observer runs a check
- **THEN** it makes exactly one `$.model.complete` call, on the model and effort that the plugin's `userConfig` options name, with the fixed instructions in a `cache: true` block and the reply bounded by `maxTokens`

#### Scenario: A Request for More on an Offer

- **WHEN** the person asks for more on an offer
- **THEN** the explanation that the check's own reply already carried is shown with no second call, and an offer whose reply carried no explanation shows no way to ask for more

#### Scenario: The Price Is Not in Any Source We Hold

- **WHEN** no file of this repo gives the per-token price of the model the rebuild names
- **THEN** the rebuild states the three bounds it sets, the cached fixed block, the digest size, and `maxTokens`, and writes no money figure
