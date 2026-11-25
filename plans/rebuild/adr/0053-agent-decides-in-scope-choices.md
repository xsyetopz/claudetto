---
status: accepted
date: 2026-11-16
---
# Agent Decides In-Scope Choices

## Context and Problem Statement

The goal agent had kept "Jev for routine decisions", so it settled product choices alone, which the agent said conflicted with "ask when ambiguous and expensive".

Agents stop to ask the user to approve choices inside the task: limits, flags, a reinstall, a choice the brief leaves to the agent. Each ask costs a turn.

The agent left three choices to the user (block agreement openers, stop tools on a mid-turn complaint, stop setup copying rule files). Who decides?

Transcript record tx-x03/ask-user-question-only-for-what-cannot-be-got-or-undone: The baseline text asks through AskUserQuestion for what the user alone holds and asks before a step only a brief names. The user reported that the question prompt blocked the goal from continuing on its own.

## Considered Options

- Jev settles product choices
- The user settles product choices through `AskUserQuestion`
- Ask the user to approve each choice.
- The agent decides, using the most pragmatic long-term option, and reports the choice.
- Ask the user.
- Decide by trial and error, as the FAFO method is for.
- Keep the baseline ask rule.
- Ask only for a login, hardware, or an outward-facing step; decide each other choice, build it, and name the option passed over.

## Decision Outcome

Chosen: The goal runs semi-autonomously with the user watching. Questions go through `AskUserQuestion`, and a decision or a product choice that the user should know about goes to the user. This supersedes the earlier setting, as the agent reported it, that Jev settles product choices.

The agent decides. The user approves a batch once; the agent then proceeds with no further asks. The agent handles friction, such as stopping and reinstalling the app it tests. It picks the most pragmatic long-term option, not a hard-coded one, and researches what its sources answer. It asks only for what only the user holds: hardware, a login, a product choice such as a licence change.

The agent decides by trial and error and asks only what a probe cannot settle.

## Consequences

The goal text names `AskUserQuestion` and the user as the decider for product choices.

Fewer turns. The report names each choice made, so the user can reverse it. Supersedes no earlier decision.

Fewer user questions; each decision needs a recorded probe.

Transcript record tx-x03/ask-user-question-only-for-what-cannot-be-got-or-undone decided: Ask only for what the agent can neither get nor undo itself. Supersedes the baseline rule at `plugins/claudetto/hooks/features/prompt/texts.ts:10`. Outward-facing steps, such as publishing to the xsyetopz marketplace, stay a question, and only at the very end of the work. The agent ends a turn with a question only for such a step.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b1ac2fdf-4da4-4f95-8340-0d1d068a5d88.jsonl:302, reported, user, 2026-11-16 (user decision, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/f4b7e436-da1a-46f3-b8ef-6591f00dfe9e.jsonl:981, user decision, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/f4b7e436-da1a-46f3-b8ef-6591f00dfe9e.jsonl:3068, user decision, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/f4b7e436-da1a-46f3-b8ef-6591f00dfe9e.jsonl:11422, user decision, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/3308c572-8491-4247-abfe-16794c4d516c.jsonl:2442, user decision, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/335fc9c0-d833-41fc-99d0-5a40c6908df4.jsonl:314, user decision, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/688088e0-bb43-495d-816d-62389a1c5370.jsonl:85, user decision, 2026-11-12; user decision, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1936); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:6480 (the user's report); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:6480 (handoff Next 9: ask only at the very end).

Amended by ADR-0202 (2026-11-25): Jev rates statements about a submitted prompt and code adds a note; it does not settle product choices, which stay with the agent and the user as above.
