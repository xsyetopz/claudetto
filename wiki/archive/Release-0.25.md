# Release 0.25

This page records the notes of the `0.25` release.

Released 2026-10-06.
This release adds clause 18, "Known defects".
It adds the claim-check prompt hook on `Stop` and `SubagentStop`.

## Added

- Clause 18, "Known defects", goes to the main agent and to each subagent.
  - Claude fixes each defect in its own change.
    Claude fixes each defect that makes its check fail, before it reports done.
  - Claude reports a defect outside the request with its evidence.
    The main agent then asks you to fix it now, or to keep it open with a reason and an owner.
  - Claude calls a failing check "flaky" only when it names the cause and a rerun passes.
- A prompt hook on `Stop` and `SubagentStop` blocks a last message that calls a part done that no check passed on.
  This includes a check that did not run, failed, is flaky, or is pre-existing.
  It also includes a failed-test count that is not 0.
  A **Not verified** list, open items, and a skipped step that is not a check do not count.
  When the model is not sure, it blocks.
  A missed failure looks like finished work.
  It blocks only once in a row.
  It uses the background model of Claude Code, so each stop adds one model call.
  Live tests on Claude Code 2.1.292 show that a plugin prompt hook runs on both events.
  Claude Code shows the full hook prompt to Claude at each block.
  So the prompt is short, and it reads as the rule.
- The guards ask before each `PublishPlugin` call (Claude Code 2.1.292).
  The call publishes a plugin to the claude.ai library of your organization.
  No `guard_*` option turns this ask off.

## Changed

- The 13 agent prompts start each report with `Done` or `Not done`.
  They list each part with no passing check under **Not verified**.
  - A worker agent fixes each defect in its own change.
    It reports a defect outside the brief under **Outside the brief**, with its evidence.
    It no longer puts such a defect in the report as a follow-up.
  - Each agent runs its checks before it uses 3/4 of its turns.
- Clause 1: a check that cannot run blocks a done report.
- Clause 6 and the `dotclaude:handoff` skill: each **Open** item has the reason that it stays open and its owner.
  An item that was open in an earlier note is done in the new session, or Claude asks you about it.
- Clause 10 (`dotclaude-jev`): a pick of Jev on a fact question with a confidence of 0.9 or more settles the question.
  When Claude does not follow a pick of Jev, it says so and gives the reason.
- Clause 15: the main agent gives each subagent a slice whose checks fit in its turn limit.
  It reads "done" next to "did not run" or "flaky" as not done.
- The hook texts of the three plugins are in stricter ASD-STE100.
  Each text uses shorter sentences.
  Each text gives the reason and the action.
  The assertion and skip-marker asks of the edit guard now say why a weaker test is a risk.

## Fixed

- The clause 18 prompt hook let through a progress report that calls each part written or still running.
  The report says that its checks are still to run.
  Before, it blocked such a report in 2 of 5 runs, because it read "written" as "done".
  With the fix, it let through the same report in 8 of 8 runs.
  It blocked a false done claim in 4 of 4 runs.

## Related Pages

- Previous: [Release 0.24](Release-0.24)
- Next: [Release 0.26](Release-0.26)
- [Archive](Archive): the index of the archived pages.
