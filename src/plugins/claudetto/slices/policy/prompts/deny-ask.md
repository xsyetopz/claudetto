This action sends work to a repository that is not yours: `{{repo}}`.
Its owner can have rules about AI tools, so claudetto reads them before Claude contributes there.
Local work stays allowed: edits, commits, and builds in your own copy do not stop.
Only an action that reaches this repository stops, such as a push, a pull request, or an issue.
Read each file in this list:
{{files}}
{{notes}}
Then call `{{tool}}` with `repo`, `verdict`, `quote`, `conditions`, and `read`.
Use the verdict `forbidden` when a file forbids AI tools, LLM contributions, or generated code.
Use `conditions` when a file allows them under rules, and `allowed` when a file allows them with no rule.
Use `silent` when no file says anything about AI tools.
Copy `quote` word for word from a file, and list each path that you read in `read`.
Then do the same action again.
