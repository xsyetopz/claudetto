## Why

A session with claudetto in `../biome-json` ended its turn with a decision in the reply text: a "Your decision:" section, then a "What I Need from You" item "Reply "launcher" ... or "bun only" ...". The same reply listed defects as "Left as they are (minor, older than this work)" and asked nothing about them (the user, 2026-10-27).
A question in the reply text stops the turn until the user reads it, and Jev cannot answer it, because Jev answers only an `AskUserQuestion` call (`plugins/claudetto/modules/jev/adapters/ask.ts`).

The texts of the plugin lead to both faults:

- `agents/main.md:47` says "When you push back, end the turn before the change. Go on in a later turn when the user gives a reason", so the model ends the turn with prose.
- `agents/main.md:57` says "Ask with `AskUserQuestion` only when ...", which frames the tool as the exception.
- `agents/main.md:71` says "leave code that only looks wrong ... until the user picks", and no line says how the user picks.
- `output-styles/Concise.md:15` says "Only when the turn needs the user, end instead with a short numbered "What I Need from You" list". A decision needs the user, so the list takes it, although line 17 says to ask a decision with the tool.

## What Changes

- `main.md`: each question for the user, a push back included, goes through `AskUserQuestion` when the tools have it, with the evidence in the question. Code that only looks wrong gets one `AskUserQuestion` call, in place of a list of items left as they are.
- `Concise.md`: the "What I Need from You" list holds only steps that only the user can do, such as a login, and never a choice.
- No hook reads the reply for a question, because a check of English words is brittle (the user, 2026-10-27).

## Capabilities

### Modified Capabilities

- `prompt-base`: a new requirement for questions.

## Impact

- `plugins/claudetto/agents/main.md` and `plugins/claudetto/output-styles/Concise.md`. The style texts in `plugins/claudetto/evals/*/case.yaml` are older variants that their recorded runs used, so they stay.
- No eval run shows the change, because a run of `claude plugin eval` has no `AskUserQuestion` (the user, 2026-10-27).
