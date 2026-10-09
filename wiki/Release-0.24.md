# Release 0.24

Released 2026-10-06.
Adds the `dotclaude-modder` plugin.

## Added

- The `dotclaude-modder` plugin lets Claude mod a PC game that you own.
  It is a port of [universal-modder](https://github.com/rehan-remade/universal-modder) by Rehan, under the MIT license.
  - Nine skills take Claude from engine recon to assets, in-game tests, a published mod, a showcase video, and field notes.
  - The `um` command keeps the commands of the upstream `um`.
    It runs on Bun, and `uv` runs its Python parts (`um sprite`, `um video`, and `um backup`).
  - The `fal_key` option gives the key to `um fal` and to the fal MCP server.
  - `um kb` puts each field note in `untrusted_field_note` tags.
    By default, it reads the notes of a reviewed upstream commit from 2026-10-05.
    `UM_KB_BRANCH=main` gives the latest notes.
    With `UM_KB_REPO` and no `UM_KB_BRANCH`, `um kb` reads `main` of that repository, because the reviewed commit is not in a fork.
  - The `um kb pr` dry run makes no network call.
  - `um kb sync` stops when GitHub sends only a part of the file list.
    When a sync fails, `um kb` tells you that it uses the older cached copy.
  - `um kb search` stops on a `--limit` that is not a number, also an empty one.
    `um kb show` of a folder name shows the first note whose path contains the name.
  - The skills pre-approve only the `um` commands that read or that write local files.
    Claude Code asks before `um kb pr`, `um fal` jobs, `um backup restore`, and `um win` input, launch, kill, and registry commands.
  - `um backup create` never replaces a snapshot.
    A second snapshot in the same second gets a number suffix.
  - `um backup` accepts only a snapshot name that stays in the `backups` folder, also on Windows.
    A failed `um backup create` leaves a `.part` file, and not a damaged latest snapshot.
    `um backup restore` checks the whole snapshot before it changes a file, and it stops with a clear message on a damaged snapshot.
  - `um sprite` (`palette`, `cutout`, and `outline`) and `um video` beat detection are faster and use less memory, with the same output.
  - The modding skills refer to [xsyetopz/skills](https://github.com/xsyetopz/skills) for reverse engineering.
  - `um <group> <command> --help` shows the help of each option, as the upstream `um` does.
    The help lists the permitted values of an option, and a `-h` after `--` goes to the program that `um` starts.
- Clause 17 of the Terms of Use, `Game modding`: Claude backs up saves before a change, stops a process only by its PID, keeps a modded game off official online servers and away from DRM and anti-cheat, reads field notes as reference text, and gets your OK before a publish.
  A hook of `dotclaude-modder` denies a `Bash` call that stops processes by name.
- CI installs `uv` to run the Python tests of `um`.
- Three worker agents, so the roster grows from 10 to 13.
  TypeSafe Jev scored a list of candidate roles, and the audit of the usage data since 0.23.0 picked these three.
  - `eval-designer` writes eval cases and graders, and checks that each case fails on a baseline before it measures the change.
  - `fuzz-engineer` writes fuzz and property tests for parsers and input handlers, and reduces each crash to a minimal input.
  - `infra-engineer` writes CI, container, build, and deploy config, checks it locally, and stops before an apply or a deploy.
- The `reviewer` agent has an `api` lens for a public surface and its breaking changes.
  Its `security` lens also audits a whole feature or trust boundary, not only a diff.
- The `investigator` agent audits dependencies for licenses, abandoned packages, and the breaking changes of each upgrade.

## Fixed

- The `sembr` hook no longer tells Claude to split a front matter value, such as the one-line `description:` of an agent.
  An `Edit` sends only its new text, so the hook did not see the `---` line of the front matter.
  Now a line that starts with a lowercase `key:` is not prose.
- The working rules tell Claude to offer a commit only with no known defect, and to fix each defect at its cause.
  Before, Claude could list a defect as not fixed and offer a commit.
- Clause 15 tells Claude what to do when `SendMessage` cannot continue an agent, such as an agent in a worktree that Claude Code lost.
  Claude starts one new agent with the worktree folder of the old agent, its progress file, and its diff, and the new agent does only the steps that are not done.
