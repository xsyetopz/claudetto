# Claude Code internals

This section describes how Claude Code works.
It covers the facts that dotclaude depends on.
It does not replace the official docs of Claude Code.
Where the docs and the binary differ, this section gives the binary, and it names the source.

## Scope

- The section covers the request that Claude Code builds, the tools, the hook events, the plugin loader, the settings, the subagents, the compaction, and the auto mode.
- It also lists the reads that the docs do not name.
- Each page states what the binary does, with the code path or the text id where it has one.
- Each page gives a bound by name, value, and file when a bound exists.
- The section does not describe the Claude Code user interface, except where a setting changes it.

## Version

- The version of this section is `2.1.296`.
- The constant `TESTED_VERSION` in `src/plugins/dotclaude/slices/setup/domain/facts.ts` holds that version.
- Three checks follow the constant:
  - The CI job in `.github/workflows/ci.yml` installs the same version, and `tests/tools/claude-code-release.test.ts` pins that job to the constant.
  - The schema `$comment` in the test `tests/dotclaude/setup/drift.test.ts` names the constant.
  - The drift check in `src/plugins/dotclaude/slices/setup/domain/drift.ts` warns when the installed version differs from the constant.
- `src/kernel/budget.ts` does not import `TESTED_VERSION`.
  It names `2.1.296` only in comments, on `CONTEXT_WINDOW` and `CONTEXT_BLOCK_MARGIN`.
  A change of the version therefore needs an edit of those comments too.

## Where the binary lives

- The native installer keeps each version at `~/.local/share/claude/versions/<version>`, as [Sandbox](Sandbox) states.
- On the maintainer's machine, the folder holds the binaries `2.1.295` and `2.1.296`.
- The `dotclaude-schema` command reads the file that `claude` on `PATH` resolves to, unless `--bundle FILE` names another file.
  See [Lab](Lab).

## How the facts were extracted

The facts come from four kinds of source.
The label of a fact names its kind, as the [Home](Home) page explains.

1. **binary**: the text of the bundle.
   The bundle is the JavaScript that the installed binary holds.
   A text dump of its strings is the file `external/cc-2.1.296/strings.txt`.
   The dump came from the `strings` command, as the change record of 1.0.0 names it in `.dotclaude/spec/changes/1.0.0/evidence/inventory.md`.
   The repository has no recipe for that dump.
   To repeat it, run `strings` on the binary and write the output to a file in a folder of your own (inference).
   Search the dump with `grep -n` and read a line range.
   Do not print the whole file, because it is about 59 MB.
2. **extract**: the text of each part of the built-in prompt, cut from the bundle.
   The folder `external/cc-extract/2.1.296/` holds them, with one subfolder for each kind:
   - `section/` holds each section of the system prompt, as `<id>.txt`.
     Some ids also have a `<id>.full.txt` file.
   - `tool/` holds the description of each built-in tool, as `<Tool>.txt`.
     Some tools also have a `<Tool>.full.txt` file.
   - `compaction/` holds the compaction prompts: `entire.txt`, `full.txt`, and `recent.txt`.
   - `style/` holds the built-in output styles, such as `Concise.txt`.
   - `listing/` holds the agent types, the skills, and the deferred tools, as `agent_types.txt`, `skills.txt`, and `deferred_tools.txt`.
3. **capture**: the request body that Claude Code sent to a local listener.
   The command `just capture` starts a logging proxy with `bun plugins/dotclaude-lab/bin/dotclaude-capture`.
   The proxy writes each request body to a folder in the temp folder.
   It never writes a header, because a header carries the credential.
   For the first request with tools, it also sizes each part with the `count_tokens` endpoint.
   The command `just sandbox` runs Claude Code in a separate config, and `just sandbox-alone` runs one plugin in it.
   See [Lab](Lab).
4. **measured**: a count from a run or from a transcript on the maintainer's machine.
   The command `just measure` sizes the start of a session from a transcript.

The `dotclaude-schema` command reads the settings schema out of the bundle.
Run `just schema` to write the schema files into `schemas/`.
It never changes the bundle.
The decision is in [Decisions-Settings](Decisions-Settings), under D10.

## Extract tests

Two test files check the extracts against the code:

- `tests/dotclaude/prompt/extract.test.ts` runs each prompt transform against the section files.
- `tests/dotclaude/surface/extract.test.ts` checks that each surface transform finds its built-in tool text.

Both tests read `external/`, which git ignores.
When the folder is absent, both tests skip.
So CI runs neither test on real text, and a checkout with `external/` runs both.

## Rule: read, never patch

- Read the bundle for evidence.
- Never patch the Claude Code binary or its npm package, even though the bundle is readable JavaScript.
- A patch breaks Anthropic's terms of service, as `CLAUDE.md` states.
- Use only the documented extension points: settings, environment variables, hooks, and the plugin API.

## Source labels

The pages of this section use the labels of the [Home](Home) page.
Each fact that comes from the bundle has the label **binary**.
A fact from a request body has **capture**.
A count from a run has **measured**.
A conclusion from those facts has **inference**, and the page says so.
A choice with no label is a maintainer decision, and the page links it when a decision page exists.

## Pages of this section

- [Request-Build](Request-Build): the system prompt sections, the attachments, and the cache.
- [Tools-And-Deferral](Tools-And-Deferral): the built-in tools, and which of them Claude Code defers.
- [Hook-Events](Hook-Events): the hook events, their payloads, and the map to the 11 dotclaude events.
- [Plugin-Loader](Plugin-Loader): how Claude Code finds and loads a plugin.
- [Settings-Resolution](Settings-Resolution): how Claude Code merges the settings files and the env vars.
- [Subagents](Subagents): how Claude Code starts a subagent.
- [Compaction-And-Context](Compaction-And-Context): the compaction prompts, the context window, and the blocking limit.
- [Auto-Mode](Auto-Mode): the classifier of the auto mode, and its defaults.
- [Undocumented-Reads](Undocumented-Reads): the settings and env vars that the binary reads and the docs do not name.
