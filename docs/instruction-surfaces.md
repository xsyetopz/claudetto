# Where a Rule Goes, and Why

claudetto writes text on seven surfaces. They differ in when the harness loads them and in what each
costs, so the surface decides whether a rule is free or paid on every request. This page is the
placement rule and the reading behind it.

Load behavior is from the Claude Code docs for `2.1.312`, page `configure/memory-and-rules`. Sizes
are from `just capture`, which reads the first Messages request against a local fake API with no
model call. `docs/prompt/footprint.md` holds the per-piece figures. The docs page cannot be re-read here, and the sizes were not re-captured for `0.3.0` (`tools/capture/run.ts` was denied by the auto mode classifier in this session), so every size on this page is unmeasured for `0.3.0`. The figures that can be read from files now are these: `wc -m` gives 5,292 for `plugins/claudetto/agents/main.md` and 1,896 for `plugins/claudetto/output-styles/Concise.md`, and `tools/limits.ts` sets `MAIN_BODY_CAP` to 6000 and `OUTPUT_STYLE_CAP` to 1936.

## The Rule

Put a rule on the cheapest surface that the harness loads whenever the rule applies, and never on a
surface the user owns.

Three readings make that concrete.

An instruction file is not in the system prompt. The harness reads it at launch and adds the text as
a user message, so it lands in `messages` and not in `system`. The `2.1.317` program holds the labels "(project instructions, checked into the codebase)" and "(user's private project instructions, not checked in)", which is consistent with this, but where the text lands was not traced.

A rule file with `paths` front matter loads only when `Read`, `Write`, or `Edit`, or a Bash read such
as `cat`, touches a matching file. It costs nothing in a session that never touches one. The harness
reads only the `paths` key, and bad YAML loads the rule without it, which turns a scoped rule into an
always-loaded one by accident. The `paths` load rule is from the `2.1.312` docs page and was not re-read; `paths` is not found in the `2.1.317` strings dump, so it is unmeasured there. A shipped rule is meant to parse and to name at least one glob, and
no check reads that now.

The main thread's agent body replaces the default body of `system`. It is in the cached prefix of
every request of every session, and it reloads after a compaction, so a rule there is paid even in a
session that never needs it.

## The Surfaces

| Surface | When the harness loads it | What it costs | What belongs there |
| --- | --- | --- | --- |
| `agents/main.md` under the `agent` setting | Every request, as the body of `system` | Replaces the default body. The figures once here (3,645; 3,608 against 3,678; a cut of 72) are unmeasured for `0.3.0`, and `docs/default-body-gap.md` reads the default body at 5,627 characters on Sonnet 5.5, so the default size depends on the model and the build | A rule that applies to every turn whatever the session touches |
| `~/.claude/rules/<name>.md` with `paths` | First `Read`, `Write`, or `Edit` of a matching file, and again on demand after a compaction | Nothing until a match, then its body in `messages` | A rule that applies only to a kind of file, such as how to write a comment or a test |
| `~/.claude/rules/<name>.md` without `paths` | Launch, with the priority of `.claude/CLAUDE.md` | Its body in `messages`, every session | A personal rule with no file kind to scope it to |
| `~/.claude/CLAUDE.md` | Launch, for every project | Its body in `messages`, every session | The user's own standing preferences. claudetto reads this file and does not write it |
| `CLAUDE.local.md` | Launch, appended after the project `CLAUDE.md` of its directory | Its body in `messages`, every session | The user's private notes and reports for one repo. Git ignores it |
| `output-styles/Concise.md` under the `outputStyle` setting | Every request | `wc -m` of the file reads 1,896; the header and reminder sizes are unmeasured | The shape of a reply, and nothing about how to do the work |
| An agent body, such as `agents/Athena.md` | Only when that agent runs | Nothing on the main thread | How one kind of delegated work is done |
| An agent description | Every request, in the agent listing | Unmeasured (492 was for the two agents of `0.2.0`; four ship now), which `agent.offer` can refuse per agent | Only what the main thread needs to choose the agent, its refusals included, because this is the one text of an agent the main thread reads before it picks |
| A skill under `skills/` | Its body on invocation; its name and description in `messages` when the model may call it | Nothing with `disable-model-invocation: true`, else one listing line per skill | A procedure the user or the model runs on purpose |

## Why Not the System Prompt

The body of `system` has a hard bound that the other surfaces do not. The harness sends a default
body when no agent setting is set, 3,645 characters under the shipped settings on `2.1.316` (unmeasured since), so an
agent file above that size makes every request of every session larger, which is a loss and not a
trim. The body travels as JSON and ours has more line breaks than the default text, each escaped, so
the bound was 3,678 as the request carried it. `tests/repo/prompt/budget.test.ts` reads `MAIN_BODY_CAP` (6000) from `tools/limits.ts` now.

That bound is the reason a rule needs a reason to be there. A rule about writing a comment applies
only while code is being written, and a `paths` rule covers exactly that case for nothing, so the
system prompt keeps one line of principle and the rest lives in `rules/claudetto-comments.md`.

## What Claudetto Cannot Ship

The plugin manifest has no key for an instruction file or a rule. Its component keys are `skills`,
`commands`, `agents`, `hooks`, `outputStyles`, `workflows`, `mcpServers`, `lspServers`, and
`settings`. Read on `2.1.317` (the manifest key set in the strings dump), the keys are `hooks`, `commands`, `agents`, `skills`, `outputStyles`, `themes`, `workflows`, `channels`, `mcpServers`, `lspServers`, `monitors`, `settings`, `types`, `userConfig`, `binaries`, and `experimental`; none is an instruction file or a rule. Of the `settings` keys, only `agent` and `subagentStatusLine` take effect.

So a rule file has to be installed into `~/.claude/rules/`, not loaded from the plugin. claudetto
keeps its rule files in `rules/` of this repo and the setup skill copies them, which also means the
user can read, edit, and delete one as a plain file.
