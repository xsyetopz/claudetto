# A Grader That Reads Text Scores the Claim, Not the Work

The eval cases of `tools/evals/main-rules.ts` now each name their grader, and six of the seven are
decided by a command over the tree rather than by a model reading the session's reply. This page
records why, because the change was made before the paid run of task 3.10 and the reason has to
outlive the decision.

## The Source

<https://driftproofhq.com/invisible-space/>, given by the user on 2026-10-29 and read through
`WebFetch` on that date. The figures below are the page's, not ours: we reproduced none of them, and
no run of this repository has measured a grader.

The page tests LLM-as-grader harnesses on one narrow task, telling a no-break space (`U+00A0`) from an
ordinary space. Its headline reading is that the graders which read text scored 0/12 (OpenEvals),
1/12 (Promptfoo) and 3/12 (NVIDIA SkillEvaluator), while the one grader that runs code, Anthropic's
`skill-creator`, scored 12/12. The page's own words for the mechanism: "the computer, unlike a model
reading the text, could tell the two spaces apart." Claude Code's built-in grader scored 0/6 on Haiku
and 1/6 on Sonnet, and naming the character as ` ` brought both to 6/6.

Two further readings matter more to us than the character itself.

- A text grader does not fail quietly. The page reports a grader that claimed two tests used
  "identical visible inputs" and would raise an error, which was false. A wrong verdict arrived with a
  plausible explanation attached.
- A false pass is not a small score error. On NVIDIA's harness two false passes scored 1.00 and 0.99,
  and dropped to 0.75 once the grader was told what to look for.

The page also records its own limits, which we take as given: the fix that worked made Haiku pass a
different wrong answer, Sonnet failed to produce a usable format in 27 of 60 replies, and the
characters are rare in common benchmarks, though 39 of 300 French translations in one dataset held
them.

## Why It Reaches Our Cases

The invisible character is not our exposure. No case of `main-rules.ts` turns on a character a reader
cannot see, so the specific blind spot the page measures cannot fire here.

The general shape does reach us. Five of the seven cases pass or fail on what the session did to the
code: whether a `catch` swallowed the reset, whether the assertion line survived, whether the three
call sites were renamed and the unrelated function left alone, whether `p-retry` was used instead of a
new backoff loop, whether the restating comment went and the sleep got its reason. Before this change
the cases named the pass condition in prose and named no grader at all, so the default reading was a
model scoring the reply. A reply can say it fixed the cause while the diff holds a `catch` that
returns a default, and that is the class of error the page priced at 1.00.

## What Changed

`RuleCase` now carries `graders`, a non-empty list of either a `TreeGrader`, which names the command
that decides the case, or a `ReplyGrader`, which names what it reads and why no command over the tree
can decide it. `caseFaults` reports a case with no grader, a tree grader with no check, and a reply
grader that does not justify itself. `replyOnlyCases` lists the cases that rest on reading alone, and
`tools/evals/__tests__/main-rules.spec.ts` holds that list empty for the shipped set.

Two cases carry a reply grader beside their tree grader, and each states its reason in the code.
Naming the `CLAUDE.md` rule that an instruction overrode leaves no trace in the tree. Stopping on a
contradiction leaves an unchanged tree, which is also what an idle session leaves, so only the reply
separates the two.

## What This Does Not Settle

The `check` of each tree grader is prose that a run has to implement; no runner exists yet, so no
command has been executed against any case. The cost of a wrong grader is still unmeasured for our
cases: the page's figures are from its own task and harnesses. Whether the shipped prompt beats the
default body remains task 3.10's question, and this change only makes sure that run is scored by
commands where commands can score it.
