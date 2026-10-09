# Library docs

The add-on `dotclaude-docs` gives Claude current docs for a library or an API.
Recalled facts can be out of date, so the skill gets the docs from [Context7](https://context7.com) with the `ctx7` CLI.
The decision is D8 in [Decisions](Decisions-Tools).

## The add-on

- The add-on has one skill, `docs`, in `plugins/dotclaude-docs/skills/docs/SKILL.md`.
- The skill is model-invocable.
  Its listing line has 100 characters or fewer.
- The add-on is a separate plugin, so a user who does not install it pays no listing line.
  `dotclaude` works as before without it ([Plugin layout](Plugin-Layout#add-on-plugins)).
- Claude uses the skill when the task needs the API of a library version that the project uses, and the project does not show it.

## How Claude uses it

1. Claude runs `ctx7 library <name> "<topic>"` and picks the library ID from the result.
   It skips this step when the user gave the ID.
1. Claude runs `ctx7 docs <library id> "<topic>"` with a query on one concept.
1. Claude answers from the docs and names the library ID.

## Rules

| Rule | What it means |
| --- | --- |
| Free tier first | The skill works with no key. When `CONTEXT7_API_KEY` is set, `ctx7` uses it. |
| Few calls | At most 3 `ctx7` calls for one question, and each query is on one concept. |
| Honest failure | When `ctx7` fails or the quota is used up, Claude tells the user. For a quota error, Claude names `CONTEXT7_API_KEY` as the way to a higher limit. Claude does not give recalled facts as if they came from the docs. |
| No secrets in queries | A query goes to the Context7 service, so it holds only the library name and the topic. No secret, token, or private code goes in it. |
| Pinned and quiet | The command uses an exact `ctx7` version and sets `CTX7_TELEMETRY_DISABLED=1`. |

## Snippet parts

The [settings snippet](Settings-Snippet) holds these parts, and you copy them when you use `dotclaude-docs`.
No command merges them for you:

- The `permissions.allow` entries `Skill(dotclaude-docs:docs)` and the pinned `ctx7` command form.
  The `allowed-tools` line of the skill does not approve the call on Claude Code 2.1.294 (live run), so the snippet allows it.
- The sandbox network hosts `context7.com` and `registry.npmjs.org`.

A test pins the command form in the snippet to the form in the skill.

## Related pages

- [Commands](Commands)
- [Parts](Parts)
- [Install](Install)
