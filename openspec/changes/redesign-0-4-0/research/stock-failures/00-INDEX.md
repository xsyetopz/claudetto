# Failures of the Stock Claude Code 2.1.310 Texts: Index

This dossier maps each failure of the stock descriptions, instructions, and prompts of Claude Code 2.1.310 against the reference set in `external/please-use-me-often/`, and gives a rewrite for each failure (the user, 2026-10-26).
The rebuild of `plugins/claudetto/agents/main.md` and the rewrites of the other claudetto texts use it as a reference (`rewrites.md`, "Rebuild of `main.md` and Audit of Each Text", step 7).
The companion example book is `research/prompt-examples.md`.

## Parts

| File | IDs | Entries | Direct rule match | Inferred | Stock texts |
| --- | --- | --- | --- | --- | --- |
| `01-sections.md` | `SF-S-01` to `SF-S-32` | 32 | 17 | 15 | the system prompt of a `claude -p` request and 20 sections |
| `02-tools.md` | `SF-T-01` to `SF-T-29` | 29 | 12 | 17 | 23 tool descriptions and schemas |
| `03-agents-skills.md` | `SF-A-01` to `SF-A-28` | 28 | 11 | 17 | 7 built-in agents and 31 bundled skills |

The counts come from `grep -c` of `### SF-`, `Strength: direct`, and `Strength: inferred` on 2026-10-26.
Each entry has the fields `Stock`, `Breaks`, `Effect`, `Scope`, `Strength`, and `Should be`.

## Sources

- The stock texts are in `.claudetto/research/stock-2.1.310/`.
  - `request/` and `tools/`: a real request of `claude -p --model claude-opus-5-5`, sent to the local stub of `.claudetto/probe/` with a fake key, so the capture cost nothing. A second stub run loaded the deferred tools through `ToolSearch`.
  - `sections/`, `agents/`, and `skills/`: extracted from the 2.1.310 binary by `.claudetto/research/scripts/audit-sections.ts`. The extractor follows constant references, so these files hold some code noise, and the parts skip it.
- The references are the files of `external/please-use-me-often/` (the 2 files in `claude-ai/` are copies of the root files) and `research/prompting.md`.

## Limits

- A `claude -p` request leaves out `tone`, `communication`, `doing_tasks`, `actions`, `autonomy_append`, and `task_continuity` (`01-sections.md`). The section files hold each flag variant side by side, so a conflict inside one file can be absent from a real request.
- 11 sections hold only a name in the binary, because a remote flag gives their text. See `research/text-audit.md`, "Not Covered".
- The capture has no `AskUserQuestion`, `TaskCreate`, `EnterPlanMode`, or `TodoWrite` tool, because `-p` does not offer them. Their texts are not in `02-tools.md`.
- `03-agents-skills.md` dropped some planned entries for lack of an exact quote. Its "Texts with No Failure" part and its notes list them.

## Failures That Claudetto Must Resolve

The user named these on 2026-10-26. `rewrites.md` steps 8 and 9 carry them into the rebuild.

1. Verification for all work: the stock text asks for a check only for a UI change (`SF-S-21`).
2. No stall when no user can answer: the stock text says "when in doubt, ask before acting" (`SF-S-16`). claudetto works in the TUI and in `-p` mode, and `-p` offers no `AskUserQuestion` tool.
