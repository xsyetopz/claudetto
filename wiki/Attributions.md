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

## Research for the Spec Store

These works are the research for the redesign of the spec store of 1.0.0.
dotclaude cites them and copies no text from them.
The redesign is a plan, so this table says what each work gives the plan, and not what dotclaude ships.

| Work | Link | License | What the plan of 1.0.0 takes from it |
| --- | --- | --- | --- |
| Bruno Claudino, Ruizhe Xing, Yuanhao Zuo, Tyler Menezes, Anita Sarma, Kostadin Damevski, and Zixuan Feng, "The EPIC Framework for Spec-Driven Development", 2026 | [arXiv:2610.07534](https://arxiv.org/abs/2610.07534) | CC BY 4.0 | Gates that a tool checks before a state change, a blocking clarification marker, and the practices of a good spec. |
| Deepak Babu Piskala, "Spec-Driven Development: From Code to Contract in the Age of AI Coding Assistants", 2026 | [arXiv:2602.00180](https://arxiv.org/abs/2602.00180) | CC BY 4.0 | The phases specify, plan, implement, and validate, and the choice to fix the code or to change the spec after a failed check. |
| Subham Panda, "Citation Discipline in Spec-Driven Development: A Cross-Model Empirical Study of Output Determinism and Automated Hallucination Detection in LLM-Generated Code", 2026 | [arXiv:2606.30689](https://arxiv.org/abs/2606.30689) | CC BY 4.0 | `traceSDD`: stable requirement IDs, and a check that finds IDs in the code with no requirement in the spec. |
| Vu Hung Nguyen and Thanh Nguyen, "SDAD: Spec-Driven Agentic Development for the AI-Native SDLC", 2026 | [arXiv:2608.20341](https://arxiv.org/abs/2608.20341) | CC BY-SA 4.0 | Human merge authority, and a provenance log of each step. |
| Jessica Diaz, Joaquin Gayoso, Andrea Cimminio, and Jorge Perez, "Spec-Driven Development for Agentic Software Engineering: Harnessing Human-Agent Teamwork", 2026 | [arXiv:2609.00252](https://arxiv.org/abs/2609.00252) | arXiv non-exclusive distribution license 1.0 | An evidence pack for each change. |
| Srinivas Rao Marri, "Constitutional Spec-Driven Development: Enforcing Security by Construction in AI-Assisted Code Generation", 2026 | [arXiv:2602.02584](https://arxiv.org/abs/2602.02584) | CC BY 4.0 | A brief that holds only the requirements of its package, and spec text as untrusted input. |
| Jimmy Song, "YAML to Markdown: Exploring Specification Driven Development and AI-Native Paradigms", 2025 | [jimmysong.io](https://jimmysong.io/blog/from-yaml-to-markdown-devops-vs-collabops/) | CC BY 4.0, as the page footer states | Markdown as the format that people and agents both read. |

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
