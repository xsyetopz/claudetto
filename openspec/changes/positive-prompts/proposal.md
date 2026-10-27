## Why

The user wants each text that a model reads to follow the Anthropic prompting guidance: say what to do, with the reason, instead of what not to do (the user, 2026-10-26).
The output style must also make Claude write in this form, for example in a subagent brief (the user, 2026-10-26).
The user chose to rewrite all negatives, explicit and soft, on each surface (the user, 2026-10-26, answer to "Scope").
The user removed the STE rule of `AGENTS.md` (the user, 2026-10-26: "the STE rule could go."), so its removal is part of this change.

The spec `text-surfaces` has "Positive Framing" with a lint test, but no such test exists (`grep -rniE "Positive Framing|framing" tests plugins/claudetto/tests` finds none), and `redesign-0-4-0` removes the requirement, because a test of prose is deleted by `.claude/rules/tests.md` (the user, 2026-10-26).
This change adds the rule back as "Positive Form", with a one-time audit command and a review as its check, and no stored test.
On 2026-10-26, `grep -rhoiE "(do not|don't|never|avoid|must not)"` counts 12 hits in `plugins/claudetto/agents`, 4 in `plugins/claudetto/skills`, 1 in `plugins/claudetto/output-styles`, 1 in `.claude/rules`, and 1 in `AGENTS.md`.
Soft negatives, such as "with no offer and no recap" in `Concise.md`, are more frequent.

## What Changes

- Each explicit and soft negative becomes a positive form with its reason, where one exists.
- `Concise.md` and `agents/main.md` tell Claude to write each text for a model, such as a subagent brief, in the same form.
- `agents/main.md` keeps only the rules that a senior coding agent needs, and loses the pronoun and emoji rules (the user, 2026-10-26: "pronouns have *nothing* to do with coding", "*coding* is the keyword, not a conversationalist").
- The main agent, the subagents that write, run, and review code, and `Concise.md` guard against a gamed measure, from the sources that the user gave on 2026-10-26: Goodhart's law, Bengio on lying and cheating agents, arXiv `2402.07510`, and P2 Innovate. The user put this guidance in the prompt surfaces (the user, 2026-10-26).
- `agents/main.md` checks a technical claim of the user before it agrees, answers the technical content in place of emotional validation, and writes to the standard of a maintained production project (the user, 2026-10-26: "Claude gives in, and just does what the user said, instead of trying to push back on whether user was *factually* and *objectively* correct", "therapy-speak", "treating every existing and new project as a mere throwaway one-time prototype"). The user declined a permission hook for edits to checks, because approval prompts break the agent workflow (the user, 2026-10-26).
- The quoted words of the user in a handoff stay word for word, as the spec `code-compaction` requires.

## Capabilities

### Modified Capabilities

- `text-surfaces`: the new "Positive Form" covers each surface and soft negatives, and "Briefs in Positive Form" adds a writing rule for briefs.

## Impact

- Text: `plugins/claudetto/agents/`, `plugins/claudetto/skills/`, `plugins/claudetto/output-styles/`, the `prompts.ts` files and hook messages in `plugins/`, `plugins/claudetto-browser/`, `.claude/rules/`, and `AGENTS.md`.
- Docs: the `0.4.0-alpha.1` section of `CHANGELOG.md`.
