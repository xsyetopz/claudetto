# Where a Rule Goes, and Why

claudetto writes text on seven surfaces. They differ in when the harness loads them and in what each
costs, so the surface decides whether a rule is free or paid on every request. This page is the
placement rule and the reading behind it.

Load behavior is from the Claude Code docs for `2.1.312`, page `configure/memory-and-rules`. Sizes
are from `just capture`, which reads the first Messages request against a local fake API with no
model call. `docs/prompt/footprint.md` holds the per-piece figures.

## The Rule

Put a rule on the cheapest surface that the harness loads whenever the rule applies, and never on a
surface the user owns.

Three readings make that concrete.

An instruction file is not in the system prompt. The harness reads it at launch and adds the text as
a user message, so it lands in `messages` and not in `system`.

A rule file with `paths` front matter loads only when `Read`, `Write`, or `Edit`, or a Bash read such
as `cat`, touches a matching file. It costs nothing in a session that never touches one. The harness
reads only the `paths` key, and bad YAML loads the rule without it, which turns a scoped rule into an
always-loaded one by accident. `tools/rule-scope.ts` checks that each shipped rule parses and names
at least one glob.

The main thread's agent body replaces the default body of `system`. It is in the cached prefix of
every request of every session, and it reloads after a compaction, so a rule there is paid even in a
session that never needs it.

## The Surfaces

| Surface | When the harness loads it | What it costs | What belongs there |
| --- | --- | --- | --- |
| `agents/main.md` under the `agent` setting | Every request, as the body of `system` | Replaces the default body of 5,627; our 5,493 cuts 134, and the request-neutral bound is 5,600 | A rule that applies to every turn whatever the session touches |
| `~/.claude/rules/<name>.md` with `paths` | First `Read`, `Write`, or `Edit` of a matching file, and again on demand after a compaction | Nothing until a match, then its body in `messages` | A rule that applies only to a kind of file, such as how to write a comment or a test |
| `~/.claude/rules/<name>.md` without `paths` | Launch, with the priority of `.claude/CLAUDE.md` | Its body in `messages`, every session | A personal rule with no file kind to scope it to |
| `~/.claude/CLAUDE.md` | Launch, for every project | Its body in `messages`, every session | The user's own standing preferences. claudetto reads this file and does not write it |
| `CLAUDE.local.md` | Launch, appended after the project `CLAUDE.md` of its directory | Its body in `messages`, every session | The user's private notes and reports for one repo. Git ignores it |
| `output-styles/Concise.md` under the `outputStyle` setting | Every request | 1,526 of body, a 36-character header, and a 102-character reminder repeated on each user message | The shape of a reply, and nothing about how to do the work |
| An agent body, such as `agents/Apollo.md` | Only when that agent runs | Nothing on the main thread | How one kind of delegated work is done |
| An agent description | Every request, in the agent listing | 492 characters for the two that ship, which `agent.offer` can refuse per agent | Only what the main thread needs to choose the agent, its refusals included, because this is the one text of an agent the main thread reads before it picks |
| A skill under `skills/` | Its body on invocation; its name and description in `messages` when the model may call it | Nothing with `disable-model-invocation: true`, else one listing line per skill | A procedure the user or the model runs on purpose |

## Why Not the System Prompt

The body of `system` has a hard bound that the other surfaces do not. The harness sends the default
body of 5,627 characters when no agent setting is set, so an agent file above that size makes every
request of every session larger than a stock session, which is a loss and not a trim. The body
travels as JSON and ours escapes 27 characters more than the default text, so the figure that keeps
the request from growing is 5,600 and not 5,627.

That bound is the reason a rule needs a reason to be there. A rule about writing a comment applies
only while code is being written, and a `paths` rule covers exactly that case for nothing, so the
system prompt keeps one line of principle and the rest lives in `rules/claudetto-comments.md`.

## What Claudetto Cannot Ship

The plugin manifest has no key for an instruction file or a rule. Its component keys are `skills`,
`commands`, `agents`, `hooks`, `outputStyles`, `workflows`, `mcpServers`, `lspServers`, and
`settings`, of which only `agent` and `subagentStatusLine` take effect.

So a rule file has to be installed into `~/.claude/rules/`, not loaded from the plugin. claudetto
keeps its rule files in `rules/` of this repo and the setup skill copies them, which also means the
user can read, edit, and delete one as a plain file.
