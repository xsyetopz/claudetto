# Edit

History, checks and sources: [evidence/edit.md](evidence/edit.md).

## EDIT-001 Batch Edits Through One Perl Call

claudetto lets the agent make many edits in one `Bash(perl -0pi -e ...)` call and registers no batch tool.

Given a file with 10 places to change
When the agent makes the change
Then it takes one tool call

## EDIT-002 Perl Allow Rule and Diff Hook

claudetto allows `Bash(perl -0pi -e *)` in permissions and runs a `PostToolUse` hook on its result that prints `git diff --stat` of the touched files and tells the model to Read each touched file before a Write.

Given the permission mode is `acceptEdits`
When the agent runs the perl call
Then it runs with `decision: accept, source: config`
And the hook shows the diff stat
And a Write after the re-Read succeeds where the same flow without the hook fails with "File has been modified since read"

Given the working directory is outside a git work tree, or `git diff` fails
When the hook writes its note
Then the note says the diff stat is unavailable outside git
And it never says no file changed
