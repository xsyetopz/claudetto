## Why

The user asked for a rewrite of each description, prompt, and message of the plugins in the style of the `asd-ste100:rewrite` skill, combined with the general prompt practices of Anthropic and the practices for each model (the user, 2026-10-27, "Very critical").
A model reads each of these texts with no way to ask the author, so each sentence needs one reading.
On 2026-10-27 the linter of the skill (`ste-lint --max-words 20`) gave 136 findings in the agents, the output style, and the skills of the plugins, with 47 in `agents/main.md` and 18 in `skills/setup/SKILL.md`.

## What Changes

- Each text of spec `text-surfaces` gets the rules of STE style: one instruction for each sentence, active voice, simple tenses, no semicolon, short noun clusters, and one term for each concept. Instructions and hook messages use the Strict mode, and the wiki and `CHANGELOG.md` stay out of scope.
- The same pass keeps the prompt practices of Anthropic that the research file `.claude/claudetto/research/prompt-practices-2026-10-27.md` lists with sources: the reason for each rule, positive framing, no ALL CAPS, and the differences between models where a source names them.
- Each fact, condition, number, hedge, and code item stays as it is, because spec `text-surfaces` requires that the behavior stays.

## Capabilities

### Modified Capabilities

- `text-surfaces`: a new requirement for STE style.

## Impact

- `plugins/claudetto/agents/*.md`, `output-styles/Concise.md`, `skills/*/SKILL.md`, `description.md`, each `prompts.ts`, the `tool.describe` texts, and the spec templates. The same surfaces of `plugins/claudetto-browser/`.
- Lab tests that match a message text change with it.
- A paid eval shows whether the behavior stayed, and it needs the approval of the user.
