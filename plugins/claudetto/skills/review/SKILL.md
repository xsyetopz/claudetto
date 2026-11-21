---
name: review
description: Review the uncommitted diff for bugs only; reports, edits nothing.
disable-model-invocation: true
context: fork
agent: claudetto:Athena
---
# Review

Review the working diff for defects only. Report no style, naming, or refactoring.

Run `git diff HEAD` and `git ls-files --others --exclude-standard`, then read each changed file around its hunks and the callers the change touches.

Report each defect as `path:line`, the input that makes it fail, and why. Skip a doubt you cannot tie to a failing input. Edit nothing. If you find none, say so.
