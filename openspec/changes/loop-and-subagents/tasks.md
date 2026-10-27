## 1. Loop Command

- [ ] 1.1 Add `/loop [interval] <prompt>`, `/loop stop`, and `/loop status` in `modules/work/` next to `/goal`, with the state in `.claude/claudetto/loop.json`. Check: lab tests for "Start" and "Resume" fail before the change, then `just lab`.
- [ ] 1.2 Add the bounds of turns and of the red band, each with one stop line. Check: a lab test for "Red Band" fails before the change, then `just lab`.
- [ ] 1.3 Add the `tool.call` hook on `ScheduleWakeup` that moves a wait inside the TTL in effect, and the rule text for `Monitor` waits. Check: a lab test for "Wait Inside TTL" fails before the change, then `just check`.

## 2. Subagents

- [ ] 2.1 Check the docs and the bundle of Claude Code 2.1.310 on whether subagents and background tasks survive `/clear` and `/compact`, and add the line to `agents/main.md` when they do. Check: a test that the line is in the prompt, then `just check`.
- [ ] 2.2 Add the spawn check hook in `modules/agents/` with a rule name and an `evals/hooks.json` key. Check: lab tests for "Prompt Names a Ticked Task" and "Nothing Done" fail before the change, then `just check`.
- [ ] 2.3 Ask the user to approve the paid probe of `claudetto:Hephaestus` on Sonnet and on Opus, with its cost and the weekly share, then run it and write the evidence page. Check: the page has the tokens and the share of each run.

## 3. Close

- [ ] 3.1 Add the entries to the `0.4.0-alpha.1` section of `CHANGELOG.md` and the wiki pages. Check: `just check`.
- [ ] 3.2 Get a `claudetto:Athena` review of the diff against this plan, and fix each defect. Check: the review lists no open defect.
