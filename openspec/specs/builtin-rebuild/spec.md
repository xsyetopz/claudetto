# builtin-rebuild Specification

## Purpose
Where a built-in feature is worth having but carries telemetry, a non-CLI path, or an unnamed model, claudetto rebuilds it from its read source: lighter, with no telemetry, and fully extensible. The first one is `cc-plugin-you-should-know@builtin`, rebuilt as the plugin `claudetto-you-should-know`.

## Requirements

### Requirement: A Rebuild Starts from a Read Source

A rebuild SHALL be based on a source that this repo holds and that a file of `docs/keep/plugins/` records, with the hooks, calls, state keys, and constants quoted with their line numbers. The system MUST NOT patch the Claude Code binary or its npm package, and reading it for evidence is the only use.

#### Scenario: A Behavior with No Source Line

- **WHEN** a rebuild would add a behavior that the source note does not record
- **THEN** it is left out, and the note gains an open question instead

#### Scenario: The Kept Bundle Is Older Than the Install

- **WHEN** the kept bundle is `2.1.310` and the installed program is newer
- **THEN** the rebuild first diffs the two and records what changed, before any code

### Requirement: A Rebuild Carries Its Own Code and Its Own Prompt under Its Own Licence

A rebuild MUST ship under claudetto's own `MIT`, MUST NOT copy source code of the read original, and MUST NOT carry a trade name, a product name, a logo, or a wordmark of Anthropic or of Claude. It MAY reuse what the user allows and what copyright does not cover: the interface strings the person sees, the mechanism, the cadence, the constants, the key order, and the card geometry. It MUST write its own observer prompt.

#### Scenario: An Interface String Matches the Source

- **WHEN** a label, a tag, an answer label, or a heading of the rebuild matches the read original word for word
- **THEN** it ships as it is, because the user allows the interface text (2026-10-27, restated 2026-10-28: "the text is allowed to be taken, such as on buttons and prompts", and "anyone could copy text from a live interaction session anyway, so it's user-facing")

#### Scenario: Source Code of the Original

- **WHEN** a function, a file, or a block of the original's code would be carried over as it is
- **THEN** it is written again from the behavior the source note records, because publication is not a copy grant, as `anthropics/claude-code` shows in the one line of its `LICENSE.md`, "© Anthropic PBC. All rights reserved. Use is subject to Anthropic's Commercial Terms of Service"

#### Scenario: The Observer Prompt

- **WHEN** the original's observer prompt is offered as the starting text
- **THEN** the rebuild writes its own instead, for size and not for licence: the original's fixed text is `33,015` characters plus a `985`-character no-tools frame, about `8,250` tokens on every check, and it instructs about artifacts, pages, and follow-up directions that the rebuild drops (`docs/keep/plugins/you-should-know-rebuild.txt`, the `COST OF ONE CHECK` line). Task 11.4 reports the character count of what ships

#### Scenario: A Licence Is Offered as a Grant

- **WHEN** a document is offered as the licence that would permit copying the text or using the branding
- **THEN** its own bytes are read before the rebuild relies on it, and a licence whose trademark clause withholds the right does not grant it, as `anthropics/skills/skills/brand-guidelines/LICENSE.txt:139` does in the Apache-2.0 words "This License does not grant permission to use the trade names, trademarks, service marks, or product names of the Licensor"

### Requirement: A Rebuild Names Its Model and Bounds Its Prompt

A rebuild that calls a model MUST call `$.model.complete` with an explicit `model`, an explicit `effort`, and an explicit `maxTokens`, and MUST NOT call `$.model.fork`. The prompt MUST be a digest the plugin builds itself, with its fixed part in a `cache: true` block, and MUST NOT be the whole session window.

#### Scenario: A Fork Is Proposed Instead

- **WHEN** a rebuild would call `$.model.fork`
- **THEN** it is refused, because `ModelForkRequest` is `{ prompt: string }` with no model field and the engine rebuilds the main thread's last request, so the call would run on whatever model the session runs

#### Scenario: One Check

- **WHEN** the observer runs a check
- **THEN** it makes exactly one `$.model.complete` call, on the cheap model and effort that the tier row names, with the fixed instructions in a `cache: true` block and the reply bounded by `maxTokens`

#### Scenario: A Request for More on an Offer

- **WHEN** the person asks for more on an offer
- **THEN** the explanation that the check's own reply already carried is shown with no second call, and a call is made only when that reply carried none

#### Scenario: The Price Is Not in Any Source We Hold

- **WHEN** no file of this repo gives the per-token price of the model the rebuild names
- **THEN** the rebuild states the three bounds it sets, the cached fixed block, the digest size, and `maxTokens`, and writes no money figure

### Requirement: No Telemetry in a Rebuild

A rebuilt feature MUST NOT call `$.telemetry.log` or `$.telemetry.mark`, and MUST NOT fetch an external resource. The original logs at seven call sites, names four events, and links a Google Fonts stylesheet in the page it publishes.

#### Scenario: A Telemetry Noun Is Called by Mistake

- **WHEN** a rebuilt feature calls a telemetry noun
- **THEN** the call is removed even though no row could reach the first-party sink anyway, because the telemetry mod serves `SERVED_TIERS = ['builtin', 'core']` only and the public declarations carry no `$.telemetry` noun, so the gate is the belt and this rule is the design

#### Scenario: A Rebuild Adds a Network Call

- **WHEN** a rebuild would fetch anything outside the machine
- **THEN** the call is removed, because the user's stated reason for the rebuild is "no telemetry, lighterweight, and fully extensible"

#### Scenario: A State Move Inside a Dropped Function

- **WHEN** a dropped telemetry function also moves state, as the sender of the answered event also resets the back-off counters
- **THEN** the state move is kept and only the log and the mark are dropped

### Requirement: A Rebuild Keeps Only What Helps Coding

Each part of the original is rebuilt only when it changes what the person does in the code, because the harness is for coding. A part that the source defines but never reaches MUST NOT be rebuilt, since filling in the missing flow would be invention.

#### Scenario: The Parts This Test Drops

- **WHEN** the rebuild lists what it carries over
- **THEN** the learning page with its artifact publishing, the three follow-up explanation directions, the answers that only the constant list names, the advertisement tip that offers to turn the feature on, and the feature-flag and compliance gates are all absent

#### Scenario: A Topic That Is Not about the Work

- **WHEN** a check would offer a note that changes nothing in the repo, its commands, or its tools
- **THEN** the check answers with its silent default and shows nothing

#### Scenario: A View with No Code Path in the Source

- **WHEN** the source defines a view, an answer, or an outcome that no code in the module ever sets
- **THEN** it is left out, and the source note records it as unread rather than guessing the flow

### Requirement: A Rebuild Keeps the Bar for Interrupting

The rebuilt observer SHALL check on a fixed cadence of steps, SHALL skip a sub-agent step, SHALL keep lists of what the person was already shown and already knew so that it never repeats a line, SHALL back off when offers are ignored, and SHALL skip while a surface is already open.

#### Scenario: Nothing Worth Saying

- **WHEN** the check finds no topic above the bar
- **THEN** it shows nothing, and the cost is the one bounded call

#### Scenario: A Repeat

- **WHEN** a line matches the shown list or the known list, case-insensitively and without a final period
- **THEN** it is dropped and nothing is shown

#### Scenario: Ignored Offers

- **WHEN** the person types past an offer until it clears, more than the free count of times
- **THEN** the next checks are skipped by a counter that grows with each ignored offer up to a cap, and any answer resets it

### Requirement: A Rebuild Is Off until It Is Measured

A rebuilt feature SHALL ship off by default and SHALL turn on only for a tier whose `window-budget` rows show its cost per session.

#### Scenario: No Rows Yet

- **WHEN** no rows price the observer's calls
- **THEN** every tier row leaves it off, and the user turns it on by hand

### Requirement: A Rebuild Is Checked with No Model Call

A rebuild SHALL be a mod: a plugin folder with `.claude-plugin/plugin.json`, a `hooks/hooks.json` that names its module, and its own tests run by `claude plugin test`. That runner puts the test's hooks beneath the mod with nothing beneath them, so a call the test leaves unanswered throws and names its event, and nothing escapes to a provider.

#### Scenario: The Model Call under Test

- **WHEN** the test answers the mod's `model.complete` call
- **THEN** it asserts the model, the effort, `maxTokens`, and the `cache: true` block of the request, and no provider is reached and nothing is paid
