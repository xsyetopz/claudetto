# Claude Code Internals

This section describes how Claude Code works.
Read it if you maintain claudetto, because it covers the facts that claudetto depends on.
It does not replace the official docs of Claude Code.
Where the docs and the binary differ, this section gives the binary, and it names the source.

## Scope

- The section covers the request that Claude Code builds, the tools, the hook events, and the plugin loader.
  It also covers the settings, the subagents, the compaction, and the auto mode.
- It also lists the reads that the docs do not name.
- Each page states what the binary does.
  It gives the code path or the text id where it has one.
- Each page gives a bound by name, value, and file when a bound exists.
- The section does not describe the Claude Code user interface, except where a setting changes it.

## Version

- The facts of this section were extracted from Claude Code `2.1.296`, unless a page names another version.
  A page that gives a later version names it in the text.
- The minimum Claude Code for claudetto is `2.1.301`.
  The constant `MIN_CLAUDE_CODE_VERSION` in `tools/limits.ts` holds it.
- Two checks follow the constant:
  - The CI job in `.github/workflows/ci.yml` installs the same version.
  - The test `tests/tools/claude-code-release.test.ts` pins that job to the constant.
- `src/kernel/budget.ts` names `2.1.301` in comments, where a bound comes from the bundle of that version.
  A change of the minimum version therefore needs a check of those comments too.

## Where the Binary Lives

- The native installer keeps each version at `~/.local/share/claude/versions/<version>`, as [Sandbox](Sandbox) states.
- The `claudetto-schema` command reads the file that `claude` on `PATH` resolves to.
  It reads another file when `--bundle FILE` names one.
  See [Lab](Lab).

## How the Facts Were Extracted

The facts come from four kinds of source.
The label of a fact names its kind, as the [Home](Home) page explains.

- **`binary`**: the text of the bundle.
  The bundle is the JavaScript that the installed binary holds.
  A text dump of its strings is the file `external/cc-<version>/strings.txt`, such as `external/cc-2.1.301/strings.txt`.
  The `strings` command made the dump.
  The repository has no recipe for that dump.
  To repeat it, run `strings` on the binary and write the output to a file in a folder of your own (inference).
  Search the dump with `grep -n` and read a line range.
  Do not print the whole file, because it is about 60 MB.
- **`extract`**: the text of each part of the built-in prompt, cut from the bundle.
  The folder `external/cc-2.1.299/cc-extract-2.1.299/` holds the extract of `2.1.299`, with one subfolder for each kind:
  - `section/` holds each section of the system prompt, as `<id>.txt`.
    Some ids also have a `<id>.full.txt` file.
  - `tool/` holds the description of each built-in tool, as `<Tool>.txt`.
    Some tools also have a `<Tool>.full.txt` file.
  - `compaction/` holds the compaction prompts: `entire.txt`, `full.txt`, and `recent.txt`.
  - `style/` holds the built-in output styles, such as `Concise.txt`.
  - `listing/` holds the agent types, the skills, and the deferred tools, as `agent_types.txt`, `skills.txt`, and `deferred_tools.txt`.
- **`capture`**: the request body that Claude Code sent to a local listener.
  The command `just capture` starts a logging proxy with `bun plugins/claudetto-lab/bin/claudetto-capture`.
  The proxy writes each request body to a folder in the temp folder.
  It never writes a header, because a header carries the credential.
  For the first request with tools, it also sizes each part with the `count_tokens` endpoint.
  The command `just sandbox` runs Claude Code in a separate config, and `just sandbox-alone` runs one plugin in it.
  See [Lab](Lab).
- **`measured`**: a count from a run or from a transcript on the maintainer's machine.
  The command `just measure` sizes the start of a session from a transcript.

The `claudetto-schema` command reads the settings schema out of the bundle.
Run `just schema` to write the schema files into `schemas/`.
The command never changes the bundle.
The decision is in [Decisions Settings](Decisions-Settings), under D10.

## Rule: Read, Never Patch

- Read the bundle for evidence.
- Never patch the Claude Code binary or its npm package, even though the bundle is readable JavaScript.
- A patch breaks Anthropic's terms of service, as `CLAUDE.md` states.
- Use only the documented extension points: settings, environment variables, hooks, and the plugin API.

## Source Labels

The pages of this section use the labels of the [Home](Home) page.

- A fact that comes from the bundle has the label **`binary`**.
- A fact from a request body has the label **`capture`**.
- A count from a run has the label **`measured`**.
- A conclusion from those facts has the label **`inference`**, and the page says so.
- A choice with no label is a maintainer decision.
  The page links it when a decision page exists.

## Pages of This Section

- [Request Build](Request-Build): the system prompt sections, the attachments, and the cache.
- [Tools and Deferral](Tools-And-Deferral): the built-in tools, and which of them Claude Code defers.
- [Hook Events](Hook-Events): the hook events, their payloads, and the map to the 14 claudetto events.
- [Plugin Loader](Plugin-Loader): how Claude Code finds and loads a plugin.
- [Settings Resolution](Settings-Resolution): how Claude Code merges the settings files and the env vars.
- [Subagents](Subagents): how Claude Code starts a subagent.
- [Compaction and Context](Compaction-And-Context): the compaction prompts, the context window, and the blocking limit.
- [Auto Mode](Auto-Mode): the classifier of the auto mode, and its defaults.
- [Undocumented Reads](Undocumented-Reads): the settings and env vars that the binary reads and the docs do not name.

## Related Pages

- [Request Build](Request-Build)
- [Home](Home)
