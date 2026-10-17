# Output Style

This page describes the output style `claudetto:Concise` of the core plugin `claudetto`.
It is for a user who wants short replies and for a contributor who edits the `styles` slice.

## What It Does

The style leads with the result.
It leaves out the opening, the restatement of the request, and the narration of each step.
It shortens the text of the reply, not the work.
It sets `keep-coding-instructions: true`.
For Opus, Sonnet, Haiku, and Fable, the variant of the `prompt` slice puts `claudetto:doing_tasks` in place of the coding section, so the field changes nothing.
For a model with no variant, the field keeps the coding section of Claude Code.

The settings snippet selects the style with `outputStyle`.
The style sets no `force-for-plugin`, so the `outputStyle` setting of the user stays in charge.

## The Evals

Two evals in the slice test the style:

- `accusation-warranted` checks that a reply to a warranted accusation names the fix and has no preamble and no closing offer.
- `verification-claim` checks that a claim of a verification matches the run, with a grader that reads the transcript.

A grader fails a padded reply.
A command such as `npm test` alone is not a check of the fix.
The tests of the graders in `tests/claudetto/evals/graders.test.ts` give each grader a padded sample, and the grader must fail it.

## Related Pages

- [Architecture](Architecture)
- [Settings Snippet](Settings-Snippet)
