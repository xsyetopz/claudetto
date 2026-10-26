# Attributions

`claudetto` uses work from other projects.
The table names each work and its license, as the source states it.
Where the source states no license, the row says `not stated`.

## Outside Works

| Work | Link | License | What `claudetto` uses it for |
| --- | --- | --- | --- |
| Context7 with the `ctx7` CLI | [context7.com](https://context7.com), [upstash/context7](https://github.com/upstash/context7) | MIT for `upstash/context7`. Not checked for the `ctx7` package. | The `find-docs` skill of `claudetto` runs `ctx7` with `bunx` to read the current docs of a library. |
| agent-browser | [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) | Apache-2.0 | The `browse` skill of `claudetto-browser` runs it. |
| OpenSpec | [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) | MIT | The `spec` slice keeps the OpenSpec file layout and the format of its schemas, and runs no OpenSpec package. |
| jscpd | [kucherenko/jscpd](https://github.com/kucherenko/jscpd) | MIT | The `dry` slice merges the config of `jscpd`, and `just dry` runs it. |
| `jev` CLI by pedramamini | [gist](https://gist.github.com/pedramamini/014676fa8684d91bf7000f4623701ada) | MIT, as the gist README states | An idea. The verbs of the CLI `claudetto-decide` are `yes`, `pick`, and `ask`. The TypeSafe API gives the answers. |

## Not Shipped

`claudetto` ships no npm package.
The packages in the root `package.json` are dev tools for the repository.
These are `@biomejs/biome`, `@fission-ai/openspec`, `@types/node`, `bun-types`, `jscpd`, `markdownlint-cli2`, and `yaml`.
The shipped code in `plugins/` imports only relative files, the `node:` and `bun:` built-in modules, and the `claude-code` plugin types.

## Related Pages

- [Overview](Overview)
- [Decide](Decide)
- [Browser](Browser)
- [Library Docs](Library-Docs)
