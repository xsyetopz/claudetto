# Instruction Files

## Posture

- [x] **CC-039** Moved Out as OUT-2642: third-party report with no probe.

## Wording

- [ ] **CC-040** claudetto shall write every text that an agent reads (prompts, scorers, rule bodies, skill descriptions and bodies, hook texts, agent files, and how an agent must answer a human or another agent) as an action to take, never as a thing to avoid, because a named prohibition or unwanted phrase plants the very idea (the Pink Elephant problem). For format steering write "flowing prose" in place of the prohibition; precise prohibitions still work; explain why for each rule; say "go beyond the basics" when more than a minimal answer is wanted; "prefer" over "never"; a voice profile over rule lists.
  Acceptance: a scan of each such text finds no instruction built on "do not", "never", or a named wrong action, except a quoted fixed limit; no prompt or scorer lists the unwanted phrase; each claudetto prompt passes this check. Verification: inspection.
  Basis: user decision; cited (Anthropic best-practices page; not re-read); reported, one user (pasted community text; the agent's own run showed one data point). Status: partial at 088a227c (`plugins/claudetto/rules/useBlockLanguage.md` sets block language; `AGENTS.md:6` and `AGENTS.md:9` at 088a227c still open with "Never").
  Source: user decision, 2026-11-14; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31716; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31779; reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10928); reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10965). Not located: the best-practices page was not re-read here.
  Conflict: Bans Over Instructions.

## Size

- [x] **CC-041** Moved Out as OUT-2643: third-party report with no probe.
