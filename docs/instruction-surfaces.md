# Where a Rule Goes, and Why

claudetto writes text on several surfaces. They differ in when the harness loads them, so the surface decides whether a rule is free or paid on every request. This page is the placement rule. The sizes are from `wc -m` and from `just capture` on Claude Code `2.1.317`, in characters of the first request (`docs/surfaces.md` holds the method).

## The Rule

Put a rule on the cheapest surface that the harness loads whenever the rule applies, and never on a surface the user owns.

- The main thread's agent body replaces the default body of `system` (`docs/prompt/overrides.md`). It is in every request of every session, so a rule there is paid even in a session that never needs it. In the shipped arm the body is 5,216 of the 5,352 characters of `system`, and `plugins/claudetto/agents/main.md` is 5,292 characters by `wc -m`.
- An output style adds text to the first system message in `messages`. `plugins/claudetto/output-styles/Concise.md` is 1,896 characters by `wc -m` and adds 1,906 to the shipped request.
- An agent body is read only when that agent runs. `agents/Artemis.md` is 1,776 characters, `Athena.md` 2,899, `Hephaestus.md` 3,191, and `Hermes.md` 1,577.
- A rule file with `paths` frontmatter is meant to load when a matching file is read. `plugins/claudetto/rules/claudetto-code.md` has that key. The load behavior is not measured here, because it needs a session that reads a file.

## The Surfaces

| Surface | When it is in the request | What belongs there |
| --- | --- | --- |
| `agents/main.md` under the `agent` setting | Every request, as the body of `system` | A rule that applies to every turn whatever the session touches |
| `output-styles/Concise.md` under the `outputStyle` setting | Every request, in `messages` | The shape of a reply, and nothing about how to do the work |
| An agent body, such as `agents/Athena.md` | Only when that agent runs | How one kind of delegated work is done |
| An agent description | Every request, in the agent listing | Only what the main thread needs to choose the agent, its refusals included |
| A skill under `skills/` | Its name and description in `messages`; its body on invocation | A procedure the user or the model runs on purpose |
| `~/.claude/rules/<name>.md` with `paths` | Meant for a matching file only | A rule that applies only to a kind of file |
| `~/.claude/CLAUDE.md`, `CLAUDE.local.md` | Launch, in `messages`, every session | The user's own standing preferences and private notes. claudetto reads these files and does not write them |

The `2.1.317` program holds the labels "(project instructions, checked into the codebase)" and "(user's private project instructions, not checked in)", which fits instruction files landing in `messages`. Where the text lands was not traced.

## What Claudetto Cannot Ship

The plugin manifest has no key for an instruction file or a rule. `strings` of the `2.1.317` program shows `settings` among the manifest keys, and of the settings a plugin supplies, `agent` and `subagentStatusLine` take effect. `plugins/claudetto/src/blocks/setup-command/rules.ts` records that Claude Code does not load a plugin's `rules/` folder. So the setup command copies `rules/claudetto-code.md` into `rules/` beside the user settings file, and the user can read, edit, and delete it as a plain file.

## Why Not the System Prompt

A rule that applies only while one kind of work is done costs every request if it sits in `agents/main.md`. Put it in an agent body, a skill, or a rule file with `paths`, and keep one line of principle in the body.
