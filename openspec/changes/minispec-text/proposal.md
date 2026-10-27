## Why

The user wants each `.md` file under `openspec/` to be 300 lines or less, and its text to use the fewest words that keep one exact meaning (the user, 2026-10-26).
The user chose a warning that skips the archive, and a text rule with no word check in code (the user, 2026-10-26, answers to "Line cap" and "Word checks").
On 2026-10-26, 4 live files are over 300 lines, all in `openspec/changes/redesign-0-4-0/research/` (`find openspec -name '*.md' -not -path '*/archive/*'` with `wc -l`).

minispec is for Claude Code and the Claude 5.5 models only (the user, 2026-10-26).
Its skill and agent text must follow the Anthropic prompting guidance: no ALL CAPS markers, and a reason with each rule (the user, 2026-10-26).
The research note `.claude/claudetto/research/skill-writing-2026-10-26.md` holds the guidance for descriptions and bodies.

## What Changes

- `minispec validate` gives a WARNING for each `.md` file of a change over 300 lines. `--strict` fails on it. The archive is not checked.
- The 4 live research files over 300 lines are split by topic.
- The minispec skills and agents get new text: the concise-writing rule with its reason, no ALL CAPS, and descriptions that say what the skill does, then "Use when".

## Capabilities

### Modified Capabilities

- `minispec`: the line cap, and the writing rule in its skill text.

## Impact

- Code: `plugins/claudetto/modules/spec/domain/validate.ts` and its tests.
- Text: the minispec skills in `plugins/claudetto/skills/` and the agents that use minispec.
- Docs: `openspec/changes/redesign-0-4-0/research/` and the `0.4.0-alpha.1` section of `CHANGELOG.md`.
