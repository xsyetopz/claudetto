# Attributions

dotclaude uses ideas from the projects below.
Each part below is a new implementation.

## Licenses

| Project | License | What dotclaude uses |
| --- | --- | --- |
| DensePack, agent-skills, Ponytail, `jev` CLI | MIT | ideas only |
| GitNexus | PolyForm Noncommercial | its design only, no code or text |

## Projects

| Project | Idea | dotclaude part |
| --- | --- | --- |
| [DensePack](https://github.com/Fabian-Galvez/DensePack) by Fabian-Galvez | `plugin/scripts/edit_gate.py`: when an `Edit` fails, show the lines that are closest to `old_string` | none: 0.20.0 removed `show-closest-lines.mjs`, the part that reimplemented it |
| [agent-skills](https://github.com/addyosmani/agent-skills) by Addy Osmani | a skill description that says what the skill does and when to use it | the "Use" part of each skill and agent description, and a "Not for" part where a neighbor can match the same request |
| [Ponytail](https://github.com/DietrichGebert/ponytail) by DietrichGebert | an order of steps that builds the minimum code: no code, reuse, the standard library, one line, then the minimum | none: 0.27.0 removed the minimal-code text and the `ponytail` option (0.20 to 0.26 history) |
| [GitNexus](https://github.com/abhigyanpatwari/GitNexus) by abhigyanpatwari | hooks that add code graph context to the searches that the agent already runs | none: 0.27.0 removed the CodeGraph augment (0.20 to 0.26 history) |
| [`jev` CLI](https://gist.github.com/pedramamini/014676fa8684d91bf7000f4623701ada) by pedramamini | short verbs (`yes`, `pick`, `rate`, `ask`) over the TypeSafe API, and keys in place of list positions | `plugins/dotclaude-jev/features/jev/cli.mjs` |

dotclaude adopts none of the workflow skills of these projects.
The [xsyetopz/skills](https://github.com/xsyetopz/skills) collection already covers those workflows.

## Related pages

- [Parts](Parts): each part, its event, and its bound.
- [Second opinion](Second-Opinion): the part that uses the `jev` verbs.
- [Home](Home): the overview.
