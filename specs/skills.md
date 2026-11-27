# Skills

History, checks and sources: [evidence/skills.md](evidence/skills.md).

## SKILLS-001 Probe Skill Agent Field and Listing

The plugin skill questions are answered by a probe on 2.1.330 before either command is built.

Given a probe on 2.1.330 with a fake-API capture or a cc-inspect `code` read
When a plugin skill sets the `agent:` field
Then each answer comes with the request bytes of the listing with and without the command
And `agent: claudetto:Athena` resolves under `context: fork`
And a `disable-model-invocation: true` skill adds no listing line

## SKILLS-010 No Review Command

claudetto ships no `/claudetto:review` command because it tied vanilla Claude Code in its eval.

Given the eval case `review-seeded-defects` with a fixture diff of 5 seeded defects and 3 benign changes
When the command arm and a vanilla "review the diff" arm run, n=3 per arm, with `--no-publish` and a cost cap
Then a tie removes the command
And `plugin details claudetto` lists Skills 0

## SKILLS-020 No Spec-Review Command

claudetto-spec ships no `/claudetto-spec:spec-review` command because it did not score above the plain request.

Given the eval case `spec-review-hollow-test` with 3 requirements
When the plugin arm and the `spec` skill alone run, n=3 per arm, with `--no-publish` and a cost cap
Then a tie removes the command
And `plugins/claudetto-spec/commands/` holds only `implement.md` and `specify.md`

## SKILLS-021 Specify and Implement Commands

claudetto-spec ships `/claudetto-spec:specify <request>` and `/claudetto-spec:implement [IDs]` as user commands with `disable-model-invocation: true`, so a reviewer can read and edit the spec before red.

Given a two-turn case where the user edits the spec mid-loop, once adding a narrowing requirement and once changing an existing one
When the command path and the single `spec` skill path run, n=3 per path, on `claude-haiku-5-5` with `--max-cost-usd` on every run
Then the command path scores no lower than the skill path
