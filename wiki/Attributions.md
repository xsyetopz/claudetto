# Attributions

This page lists the outside works that dotclaude 1.0.0 uses.
Read it if you check the license of a work that dotclaude uses.
Each row gives the license that the source states.
Where the source states no license, the row says `not stated`.

## Outside Works

| Work | Link | License | What dotclaude 1.0.0 uses it for |
| --- | --- | --- | --- |
| agent-skills by Addy Osmani | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | MIT | An idea. The `description` of each skill and agent states what it does and when to use it. If a neighbor skill can match the same request, the description adds a `Not for` part. |
| Context7 with the `ctx7` CLI | [context7.com](https://context7.com), [upstash/context7](https://github.com/upstash/context7) | MIT for `upstash/context7`. Not checked for the `ctx7` package. | The `docs` skill of `dotclaude-docs` runs `ctx7` with `bunx` to read the current docs of a library. |
| agent-browser | [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) | Apache-2.0 | The default backend of `dotclaude-browser`. The `browse` skill and the `WebSearch` answer run it. |
| CloakBrowser | [CloakHQ/cloakbrowser](https://github.com/CloakHQ/cloakbrowser) | MIT for the wrapper code. The compiled binary has its own terms. | The optional `cloakbrowser` backend. `agent-browser` runs the CloakBrowser binary through `--executable-path`. |
| CodeGraph CLI `codegraph` from `@colbymchenry/codegraph` | [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph) | MIT | The `dotclaude-codegraph` plugin runs `codegraph` to sync the index and to read the code graph. |
| `jev` CLI by pedramamini | [gist](https://gist.github.com/pedramamini/014676fa8684d91bf7000f4623701ada) | MIT, as the gist README states | An idea. The verbs are short: `yes`, `pick`, and `ask`. Keys replace list positions. The `dotclaude-decide` command of the core plugin has these verbs. The TypeSafe API gives the answers. The gist also has a rating verb, which 1.0.0 does not use. |

## CloakBrowser Terms

The CloakBrowser binary has its own terms.
From `v148`, the binary needs an active CloakBrowser Pro subscription to download.
Earlier builds are free, with restrictions on redistribution.
Read the `BINARY-LICENSE.md` file of that project for the full terms.

## Not Shipped

dotclaude ships no npm package.
The packages in the root `package.json` are dev tools for the repository.
These are `@biomejs/biome`, `@types/node`, `bun-types`, `markdownlint-cli2`, and `yaml`.
The shipped code in `plugins/` imports only the `node:` built-in modules and the `claude-code` plugin types.

## Related Pages

- [Home](Home): the overview.
- [Architecture](Architecture): the core plugin.
- [Second Opinion](Second-Opinion): the `dotclaude-decide` command.
- [Skills](Skills): the skill descriptions.
- [Browser](Browser), [Code Graph](Code-Graph), and [Library Docs](Library-Docs): the add-on plugins that call the CLIs.
