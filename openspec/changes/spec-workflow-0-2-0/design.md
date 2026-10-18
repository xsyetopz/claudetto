# `claudetto` 0.2.0: The Spec Workflow

A plan for a second `/goal` run, after the run of `openspec/changes/trim-0-2-0/design.md` is done.
It replaces `minispec` with one workflow that merges OpenSpec, GitHub Spec Kit, and the BMAD Method.
It costs few tokens, and it uses the commands and files that these tools already have.

## `/goal` Condition

```text
The plan openspec/changes/spec-workflow-0-2-0 is done when the final turn shows these, run after the last commit on feat/0.2.0: `bunx @fission-ai/openspec schema validate` passes for each preset schema; `bunx @fission-ai/openspec validate --all --strict` passes; `just docker check` exits 0; `ls minispec` fails; `git status --short -- src tools tests plugins openspec` is empty.
```

## The Design

The engine is the OpenSpec CLI, run with `bunx @fission-ai/openspec`.
claudetto ships no CLI of its own for specs.
It ships three OpenSpec schemas, one for each preset, and the skill text that picks one.

Why OpenSpec is the engine:

- Its layout already is the layout of `minispec`: `openspec/specs/` holds the current truth, and `openspec/changes/<name>/` holds the deltas (`ADDED`, `MODIFIED`, `REMOVED`).
- It supports custom schemas in `openspec/schemas/<name>/schema.yaml`, and global schemas for all projects (`docs/customization.md:9`, `:165`).
  So each preset is one schema file and its templates, with no code.
- Its commands are known to its users: `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:verify`, `/opsx:archive`.
- It installs with `bunx`, and it has a `claude` tool id (`docs/cli.md:117`).

The parts that come from each tool:

| From | Part | Where it goes |
| --- | --- | --- |
| OpenSpec | Delta specs, living specs, and the `/opsx:*` commands | The engine |
| Spec Kit | The constitution (project principles) | `openspec/config.yaml` with `context:` and `rules:` (`docs/customization.md:15-41`). No `.specify/` folder. |
| Spec Kit | `[NEEDS CLARIFICATION: …]` markers in a spec, and the clarify step | An instruction of the `specs` artifact: write a marker in place of a guess, and stop before `tasks` while a marker is open. |
| Spec Kit | `analyze`, a check that the proposal, the specs, the design, and the tasks agree | A `review` artifact before `tasks` in the two larger presets. |
| BMAD | Scale-adaptive planning: the size of a change sets the depth of the plan | The three presets |
| BMAD | The PRD and the architecture document | Artifacts of the largest preset only |
| BMAD | The PM, architect, and QA roles | Checklists in the `review` artifact, not personas. A persona costs a whole skill in context, and a checklist costs a few lines. |

## The Presets

The names are a proposal of Claude, not a choice of the user.
They are the work item sizes of agile teams, so most developers know them.
Change the names before step 2 if you want others, such as `patch`, `minor`, and `major`.

| Preset | Use it for | Artifacts |
| --- | --- | --- |
| `task` | A bug fix, a small change, or a refactor with no change of behavior | `proposal.md` and `tasks.md`. `skip_specs: true` when no behavior changes. |
| `story` | One feature in an existing codebase | `proposal.md`, the delta specs with clarify markers, `design.md`, `review.md` (analyze), and `tasks.md` |
| `epic` | A new project, a large feature, or a regulated system that needs an audit trail | All of `story`, plus `prd.md` and `architecture.md` before the specs, and the PM, architect, and QA checklists in `review.md` |

The skill picks the preset from facts of the project, and it states the facts that it used:

- No `openspec/specs/` and a near-empty repository: `epic`.
- A change that touches one capability: `story`.
- A change with no change of behavior: `task`.
- The user names a preset: that preset.

## Token Budget

The sizes of the prompt texts in the pinned repositories of `external/sdd/repos/`, measured on 2026-10-17:

| Tool | Prompt text |
| --- | ---: |
| OpenSpec, 12 skills | about 190 KB |
| Spec Kit, commands and templates | 158 KB |
| BMAD, 33 skills | about 1.2 MB |
| `minispec` of 0.1.0, all skills | 12.5 KB |

Rules for the budget:

- Install the OpenSpec profile `core` only (`propose`, `explore`, `apply`, `update`, `sync`, `archive`, from `docs/cli.md:85`), and add `verify`.
- Pick one delivery mode, skills or commands, so that each workflow is listed once.
  The default `both` lists each one twice.
- A schema instruction loads only when its artifact is made, so the `epic` text costs nothing in a `task` change.
- Measure the bytes of each installed skill and each schema instruction, and report them next to the 12.5 KB of `minispec`.

## Steps

### 1. Install and Pin OpenSpec

- Pin a version of `@fission-ai/openspec` in the `devDependencies` of `package.json`, and run it with `bunx`.
- Run `bunx @fission-ai/openspec init --tools claude --profile core` in a temporary folder, and list the files that it makes.
- Check: the list of files, and the byte size of each one.

### 2. Write the Three Schemas

- Fork `spec-driven` three times with `bunx @fission-ai/openspec schema fork spec-driven <preset>`, and edit each one as in the table of presets.
- Keep the instructions short, and cut each line of the forked text that the preset does not need.
- Put the schemas in `src/` and ship them in `plugins/claudetto/`, so that `just generate` copies them.
- Check: `bunx @fission-ai/openspec schema validate <preset>` for each preset.

### 3. Write the Constitution Template

- A template of `openspec/config.yaml` with a short `context:` and the `rules:` of each artifact.
- Check: `bunx @fission-ai/openspec validate` on a sample project that uses it.

### 4. Write the Skill That Picks the Preset

- One skill of claudetto that reads the facts of the project, picks a preset, copies the schemas into `openspec/schemas/` when they are missing, and then hands off to the `/opsx:*` commands.
- It has no workflow steps of its own.
- Check: a lab test for each rule of the preset choice.

### 5. Move the Changes of This Repository

- Move `minispec/specs/` to `openspec/specs/` and the open changes to `openspec/changes/`.
  Fix each file that the OpenSpec validator rejects.
- Delete `minispec/`.
- Check: `bunx @fission-ai/openspec validate --all --strict`.

### 6. Samples and Docs

- Add one sample change for each preset under `tests/`, and validate it in `just check`.
- Write the wiki page of the workflow, with the token sizes of step 1 and step 2.
- Check: `just check`.

## Out of Scope

- An install of Spec Kit or BMAD.
  Their ideas come in as schema text only.
- A paid run to measure the token cost in a live session.
  Write its command for the user.
