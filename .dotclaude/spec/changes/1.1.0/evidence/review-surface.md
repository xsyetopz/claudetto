# Review of the Surface Slice (P98)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dotclaude/slices/surface/`, `tests/dotclaude/surface/`, and the generated lab test `plugins/dotclaude/tests/surface.test.ts`.
The evidence about Claude Code comes from `external/cc-2.1.296/strings.txt` and `external/cc-extract/2.1.296/`.
The fix package is P124.

## Confirmed Findings

### F1. I18: the `Bash` text states facts that Claude Code computes per run

`toolAnswer` in `src/plugins/dotclaude/slices/surface/domain/tools.ts:32-48` replaces the built-in text when the replacement is shorter.
It does not check that the replacement keeps the facts of the built-in text.
Claude Code 2.1.296 builds the `Bash` description at run time from env vars, feature flags, and the platform.
The static text in `src/plugins/dotclaude/slices/surface/texts.ts/tool-bash.md:5-6` states these facts as constants:

- `default 120000, maximum 600000`, but Claude Code reads `BASH_DEFAULT_TIMEOUT_MS` and `BASH_MAX_TIMEOUT_MS`.
- `wakes you when it ends`, but Claude Code says "Nothing notifies you" when `backgroundCompletionNoticeDisabled` is set.
- "A foreground `sleep` is blocked: use `Monitor`", but Claude Code adds this only when the flag `tengu_amber_sentinel` is on (default off).
- On `win32`, the built-in text says that the shell is Git Bash, and the replacement drops this note.

So the model gets wrong facts with no sign of the change.
The tests do not see this, because `tests/dotclaude/surface/extract.test.ts:27-28` and the lab test check only the length.

```bash
cd external/cc-2.1.296
rg -o 'default \$\{x4\(\)\}, max \$\{\$L\(\)\}' strings.txt | head -1
rg -o 'function (x4|\$L)\(\)\{return [a-zA-Z]+\(\)\}' strings.txt
rg -o 'function lre\(n=process.env\)\{let e=n.BASH_DEFAULT_TIMEOUT_MS' strings.txt
rg -o 'function CCe\(n=process.env\)\{let e=n.BASH_MAX_TIMEOUT_MS' strings.txt
rg -o 'if\(DK\(\)&&_e\)ke\+=" Foreground `sleep` is blocked' strings.txt
rg -o 'function DK\(\)\{return k\("tengu_amber_sentinel",!1\)\}' strings.txt
rg -o 'function oce\(\)\{return!Zh\(\).backgroundCompletionNoticeDisabled\}' strings.txt
```

```text
default ${x4()}, max ${$L()}
function x4(){return lre()}
function $L(){return CCe()}
function lre(n=process.env){let e=n.BASH_DEFAULT_TIMEOUT_MS
function CCe(n=process.env){let e=n.BASH_MAX_TIMEOUT_MS
if(DK()&&_e)ke+=" Foreground `sleep` is blocked
function DK(){return k("tengu_amber_sentinel",!1)}
function oce(){return!Zh().backgroundCompletionNoticeDisabled}
```

The probe reads `external/cc-extract/2.1.296/tool/Bash.txt`.
It changes the timeouts to `300000` and `900000` and the background bullet to the "Nothing notifies you" form.
Then it calls `toolAnswer("Bash", ...)` from `plugins/dotclaude/slices/surface/domain/tools.ts`.

```bash
bun run /tmp/claude-501/p98.ldqx/probe.ts
```

```text
300000            in=true out=false
900000            in=true out=false
120000            in=false out=true
Nothing notifies  in=true out=false
wakes you         in=false out=true
Monitor           in=false out=true
```

Failing test, in `tests/dotclaude/surface/tool.test.ts`:

- Input: `toolAnswer("Bash", { description })`, with `description` the extract `Bash.txt` with `default 300000, max 900000` and "Nothing notifies you when the command finishes".
- Expected: the answer keeps `300000`, `900000`, and "Nothing notifies you", or `toolAnswer` returns `undefined` and the built-in text passes on.
- Actual: the answer says `120000`, `600000`, `wakes you`, and `Monitor`.

## Unconfirmed Findings

- I18, `src/plugins/dotclaude/slices/surface/texts.ts/tool-agent.md:13`: the text says "Agents run in the background" with no condition.
  The built-in background note is in a conditional branch (`strings.txt:328938`, `Pe&&!V?`).
  The condition was not resolved, so this is not confirmed.
- I18, `src/plugins/dotclaude/slices/surface/domain/agents.ts:6`: the slice drops `statusline-setup`, but the built-in `/statusline` command tells the model to "Create an Agent with subagent_type "statusline-setup"" (`strings.txt:327840`).
  So `/statusline` can fail.
  This can be the intended result, because `prompt/slice.ts:152` also denies `Agent(statusline-setup)`.
  A `just sandbox` session must show the failure.
- I09, `src/plugins/dotclaude/slices/surface/domain/agents.ts:4-7`: this is a second copy of the `Agent(...)` deny rules in `src/plugins/dotclaude/slices/prompt/slice.ts:151-152`.
  No test checks that the two lists match.
  Claude Code already removes a denied agent type from the listing and from dispatch (`function cms`, `strings.txt:323319`).
  But the deny rules apply only after setup, so it is not clear that the handler is redundant.
- I11, `tool-agent.md`: the replacement drops the built-in note that `SendMessage` continues an agent that you started before.
  No command shows the effect of this omission.
- I05, `tests/dotclaude/surface/extract.test.ts:19`: `test.skipIf(!present)` skips each test in CI, so only a local run with `external/` checks the transforms.

## Dossier Check

- I01: Found in F1. The replacement uses the default timeouts, not the values of the run.
- I02: The tool text puts the rule about checks into each request, which is the recipe step 2 of I02. The drop list has no check against the deny list (see Unconfirmed).
- I03: Passes. The slice makes the tool texts shorter, and the evals give `requests: 0` and `tokens: 0`.
- I04: Not applicable. The slice makes no claim of completion.
- I05: No test was made weaker. The extract test is skipped in CI (see Unconfirmed).
- I06: Not applicable.
- I07: Passes. The handlers have no side effects and write no files.
- I08: Found in F1. The text names `Monitor` and a blocked `sleep` when the flag is off.
- I09: Possible second copy of the drop list (see Unconfirmed). The slice has no dead code, and `DROPPED_AGENTS` has one user (`isDropped`).
- I10: Passes. The tool id and the agent type come from the engine, and they go to no sink.
- I11: Possible loss of the `SendMessage` note (see Unconfirmed).
- I12: Passes. Shorter tool texts and the deferral of `ListAgents` reduce the tokens at startup.
- I13: Not applicable.
- I14: The drop of `statusline-setup` has no opt-out, so a user who removes the deny rule still cannot use the agent (see Unconfirmed).
- I15: Passes. No test checks the words of a text. The tests check length, `isDeferred`, `isOffered`, and the filter ids.
- I16: The extract test measures length only, so it misses the loss of facts in F1.
- I17: Not applicable.
- I18: Found in F1. The text is replaced with no sign of the change, and the model reasons from wrong facts.

Smells: there is no copy of kernel code, no bound in a `limits.ts` file of the slice, no silent `catch`, no tool error read as a negative, and no test of prose.
The bounds in `tool-bash.md:5` belong to Claude Code (F1).

Checked: `just test tests/dotclaude/surface` (6 pass), the probe above, `rg` on `external/cc-2.1.296/strings.txt`, `external/cc-extract/2.1.296/tool/{Bash,Read,Agent}.txt`, every file of the slice, `00-INDEX.md`, the I02 and I18 sections, `CLAUDE.md`, and `.claude/rules/`.
