---
name: review
description: Review the uncommitted diff for bugs only; reports, edits nothing.
disable-model-invocation: true
context: fork
agent: claudetto:Athena
allowed-tools: Bash(git diff HEAD) Bash(git ls-files --others --exclude-standard)
---
# Review

Find defects in the diff below, and report no style, naming, or refactoring. Read each changed file around its hunks and the callers the change touches, and read each untracked file whole.

Report each defect as `path:line`, the input that makes it fail, and why. Skip a doubt you cannot tie to a failing input. If you find none, say so.

Diff against HEAD:

!`git diff HEAD`

Untracked files:

!`git ls-files --others --exclude-standard`
