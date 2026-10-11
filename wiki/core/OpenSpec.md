# OpenSpec

dotclaude turns compaction and auto memory off, so `/clear` is the only reset of a long session.
[OpenSpec](https://github.com/Fission-AI/OpenSpec) keeps the state of long work in the repository:
specs, a proposal, a design, and task checkboxes.
A fresh session after `/clear` reads them again, and nothing is lost.

The facts on this page come from the OpenSpec `main` branch and the npm registry, read 2026-10-07.

## Install

OpenSpec 1.14.1 is the latest version of `@fission-ai/openspec`, and it needs Node 20.19.0 or later.

```bash
npm install -g @fission-ai/openspec@latest
# or
brew install openspec
```

`/dotclaude:setup` checks `openspec --version` and `node --version`.
When `openspec` is missing or old, setup offers the install command.
It runs the command only after you say yes, because a global install changes your computer.

## Set up a project

Setup does four steps, and it runs them only after you say yes:

1. It turns OpenSpec telemetry off.
1. It runs `openspec init --tools claude` when the project has no `openspec/` folder.
1. It runs `openspec config set delivery skills`.
1. It runs `openspec update`, which removes the command copies in `.claude/commands/opsx/`.

The `init` command writes `openspec/specs/`, `openspec/changes/`, and `openspec/config.yaml`.
After the four steps, only the six `openspec-*` skills in `.claude/skills/` remain, and the `/opsx:*` commands do not.
It writes no `CLAUDE.md` block and no `openspec/AGENTS.md`.
Those come from older OpenSpec versions.

## Skills

| Skill | What it does |
| --- | --- |
| `openspec-propose` | Makes a new change and writes its planning artifacts in one step. |
| `openspec-explore` | Reads the codebase and compares options before you start a change. It writes no code. |
| `openspec-apply-change` | Does the tasks of a change, writes the code, and checks off each task. |
| `openspec-update-change` | Revises the planning artifacts of a change. It never edits code. |
| `openspec-sync-specs` | Merges the delta specs of a change into the main specs. Optional, because archive asks to sync. |
| `openspec-archive-change` | Finalizes a completed change and moves it to the archive folder. |

A change is the folder `openspec/changes/<id>/`
with `proposal.md`, `design.md`, `tasks.md`, and its delta specs.

## Work across `/clear`

1. For work of more than one session, start with the `openspec-propose` skill.
1. Work through the tasks with the `openspec-apply-change` skill.
   The agent checks off each task in `tasks.md` when it is done.
1. When the status line turns yellow or red, let Claude tick the finished tasks in `tasks.md` and put the decisions in `design.md`.
   Then run `/clear`.
   dotclaude writes no handoff file, because the artifacts of the change hold the state.
1. In the fresh session, run the `openspec-apply-change` skill with `<id>`.
   It reads the artifacts and continues at the first unchecked task.
1. When all tasks are done, run the `openspec-archive-change` skill.

The status line shows the newest active change and its task count, such as `add-login 2/4`.
It reads `openspec/changes/*/tasks.md` directly and skips `archive/`, so it does not start the CLI on each refresh.

## Measured flow

On 2026-10-07, OpenSpec 1.14.1 and Claude Code 2.1.292 ran this flow in `just sandbox` with `-p` (**measured**):

1. `openspec init --tools claude` wrote `openspec/config.yaml`, `openspec/specs/`, `openspec/changes/archive/`, 6 skills in `.claude/skills/openspec-*`, and 6 commands in `.claude/commands/opsx/`.
   It said that `openspec config profile` adds 6 more workflows.
1. The `openspec-propose` skill (as `/opsx:propose`, before setup removed the commands) made the change `add-login` with 4 tasks, in 10 turns for $0.16.
   One Bash write with a heredoc (`mkdir … && cat > … <<EOF`) was denied in `acceptEdits` mode.
   The model then wrote the file with a write tool and finished.
1. Task 1.1 was checked off by hand, to stand for an earlier session.
1. A fresh session ran `/opsx:apply add-login` (the `openspec-apply-change` skill).
   It ran `openspec list`, `openspec status`, and `openspec instructions apply`, and read the artifacts.
   It did not do 1.1 again.
   It did 2.1, 3.1, and 4.1, checked off each one, and ended with all tasks done, in 13 turns for $0.14 with 0 denials.
1. The status line showed `add-login 1/4` before the apply run.

## Upgrade

After you upgrade the CLI, run `openspec update` in each project.
The generated files in `.claude/` come from the CLI version, and OpenSpec owns them.
Setup offers this step after an upgrade.
dotclaude does not edit or wrap the generated files,
and no dotclaude hook enforces OpenSpec.
