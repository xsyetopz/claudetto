# Session growth: where the context went

Source: 14 transcripts in `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-dotclaude/` and 40 subagent transcripts.
All sessions ran on 2026-10-07 with Claude Code 2.1.292 or 2.1.293 and model `claude-opus-5-5`.
Window assumed 300,000 tokens.
Context of a request = `input_tokens` + `cache_creation_input_tokens` + `cache_read_input_tokens`.
Requests are deduplicated by `message.id`.
Token estimate = chars / 4.
Labels: **confirmed** = counted from data.
**inferred** = deduced from the counts.

## 1. Sessions at 70% or more (210,000 tokens)

Three of 14 main sessions pass 70% (**confirmed**).
All three are planning sessions of the 0.28.0 change.

| Session | Date | Version | Peak context | Share | Requests |
| --- | --- | --- | --- | --- | --- |
| `00bfd354` | 2026-10-07 | 2.1.293 | 266,067 | 88.7% | 155 |
| `087f5a37` | 2026-10-07 | 2.1.292 | 269,602 | 89.9% | 101 |
| `9523acac` | 2026-10-07 | 2.1.293 | 238,442 | 79.5% | 107 |

Notes:

- `00bfd354` and `9523acac` end at their peak request.
- `087f5a37` ends on a synthetic request with zero usage, so its peak is the last real request.
- The first request of each big session is already 19,900 to 23,300 tokens (**confirmed**), the fixed prefix.

## 2. Split by tool (chars of `tool_result`)

Main-thread tool results only.
All values are chars, with tokens in brackets.

| Tool | `00bfd354` | `087f5a37` | `9523acac` |
| --- | --- | --- | --- |
| Bash | 204,645 (51k) | 50,231 (12.6k) | 153,744 (38.4k) |
| Read | 0 | 0 | 60,932 (15.2k) |
| Agent | 7,911 (2.0k) | 19,440 (4.9k) | 2,160 (0.5k) |
| SendMessage | 1,382 | 0 | 0 |
| Write | 198 | 3,830 | 765 |
| Edit | 245 | 0 | 739 |
| Skill | 0 | 66 | 88 |
| AskUserQuestion | 395 | 1,293 | 1,489 |
| All results | 215,257 (54k) | 74,860 (18.7k) | 219,964 (55k) |

Grep, WebFetch and Glob were not used in the main thread (**confirmed**).

Tool results explain only 7% to 21% of the peak context (**confirmed** by arithmetic).
Other contributors in the same sessions (**confirmed** chars):

| Part | `00bfd354` | `087f5a37` | `9523acac` |
| --- | --- | --- | --- |
| Tool call inputs (commands, Write bodies) | 126,027 | 157,891 | 103,890 |
| Human and injected user text | 39,674 | 244,706 | 58,347 |
| Assistant visible text | 52,522 | 69,450 | 19,451 |

The rest (system prompt, tools, thinking, plugin and skill text) is **inferred**.
About 20,000 to 23,000 tokens of the rest is the prefix of request 1.

### Bash by command kind (chars / calls)

| Kind | `00bfd354` | `087f5a37` | `9523acac` |
| --- | --- | --- | --- |
| `sed -n` | 46,816 / 19 | 691 / 2 | 21,128 / 9 |
| `grep` | 28,240 / 19 | 0 | 24,971 / 8 |
| `openspec` | 19,150 / 3 | 27,152 / 6 | 7,600 / 3 |
| `cat` | 18,073 / 15 | 4,610 / 1 | not top |
| `D=...plugin-authoring;` (bundled skill reads) | 0 | 0 | 26,983 / 5 plus 9,968 / 2 |
| `P=$TMPDIR/probe*` (probe runs) | 0 | 0 | about 27,000 / 14 |

Cross-session Bash totals by purpose (**confirmed**, regex on the command):

| Purpose | `00bfd354` | `087f5a37` | `9523acac` |
| --- | --- | --- | --- |
| `sed -n` slices | 20 calls, 79,619 | 4 calls, 6,434 | 17 calls, 53,097 |
| Bundle, strings, bundled-skill reads | 9 calls, 9,017 | 3 calls, 492 | 12 calls, 40,415 |
| Checks (`bun test`, `just`, lint, `openspec validate`) | 11 calls, 7,720 | 10 calls, 6,781 | 7 calls, 2,162 |
| `git diff`, `show`, `log` | 2 calls, 9,667 | 1 call, 1,802 | 2 calls, 1,626 |
| Whole-file `cat` of `.md`, `.mjs`, `.json` | 2 calls, 5,214 | 0 | 1 call, 657 |

### Six largest single results per session

`00bfd354`:

| Chars | Tool | Command or path |
| --- | --- | --- |
| 18,006 | Bash | `wc -l proposal.md design.md task...` (multi-file listing in the change folder) |
| 11,674 | Bash | `openspec instructions apply --change dotclaude-0-28-0 --json > $TMPDIR/apply.json; jq ...` |
| 9,191 | Bash | `cat research/probes.md && git di...` |
| 7,395 | Bash | `grep -n -i 'tool.check\|allow\|deny\|approve' research/mods-api.md ...; for f in research/dropins/*.json` |
| 6,964 | Bash | `sed -n 188,256p design.md; cat specs/plugin-layout/spec.md \| sed -n 1,75p` |
| 5,960 | Bash | `sed -n 1,60p tools/capture.mjs; cat research/capture.md \| head -53` |

`087f5a37`:

| Chars | Tool | Command or path |
| --- | --- | --- |
| 8,978 | Bash | `openspec instructions specs --change dotclaude-0-28-0 --json \| jq ...` |
| 8,633 | Bash | `openspec context --json \| head -20 && openspec new change "dotclaude-0-28-0" && openspec status ...` |
| 4,610 | Bash | `cat templates/managed-settings.json && cat lib/b...` (budget.mjs) |
| 3,572 | Bash | `openspec validate dotclaude-0-28-0 --strict; openspec status ...; bunx markdownlint-cli2` |
| 3,226 | Bash | `claude plugin eval --help 2>&1 \| head -40; git log --oneline --diff-f...` |
| 3,021 | Bash | `openspec instructions tasks --change dotclaude-0-28-0 --json \| jq -r ...` |

`9523acac`:

| Chars | Tool | Command or path |
| --- | --- | --- |
| 22,833 | Read | `.../dotclaude-0-28-0/design.md` |
| 20,843 | Read | `.../research/mods-api.md` |
| 18,422 | Bash | `D=/private/tmp/claude-501/bundled-skills/2.1.293/.../plugin-authoring; grep -nE "env_info_s...` |
| 10,504 | Read | `.../dotclaude-0-28-0/proposal.md` |
| 9,231 | Bash | `D=.../plugin-authoring/types/claude-code.d.ts` read |
| 7,186 | Bash | `grep -n "prompt.section\|context_management" plugins/dotclaude/hooks/mod.mjs \| head; P=$TMPDIR/probe21 ...` |

The largest single result in all three sessions is 22,833 chars (5.7k tokens) (**confirmed**).
No single result passes 6k tokens, so the growth comes from many medium results, not one outlier.

## 3. The 0.27.0 session near 267k with Bash near 80.5k tokens

Not found as described (**confirmed** by scanning all 14 main and 40 subagent transcripts).
The project folder holds only 2026-10-07 sessions of the 0.28.0 plan.
No session has Bash results near 322,000 chars (80.5k tokens).
The Bash maximum is 204,645 chars (51.2k tokens) in `00bfd354`.

Closest match: `00bfd354` with a peak of 266,067 tokens.
Its Bash results are 204,645 chars, 51.2k tokens by chars / 4, so 29k tokens below the figure.
Possible causes for the gap (**inferred**):

- The 80.5k figure may come from an older transcript that Claude Code removed, or from a different folder.
- The figure may count `tool_use` inputs together with results.
  For `00bfd354` that sum is 204,645 + 126,027 = 330,672 chars, about 82.7k tokens, which is close to 80.5k.
  This reading is the most likely one (**inferred**).

Breakdown of `00bfd354` (155 requests, 21:26 to 22:11 UTC, version 2.1.293):

- Bash: 204,645 chars over about 150 calls.
- Top kinds: `sed -n` 46.8k, `grep` 28.2k, `wc` 21.8k, `openspec` 19.2k, `cat` 18.1k, `jq` 17.1k.
- Agent: 8 results of 1,112 chars (launch stubs, 385 for one).
- Biggest context jumps per request: 8,043 (four Agent stubs), 7,706 (Bash 4.5k tokens), 5,524, 5,022 and 4,564.

## 4. Techniques

### Techniques that drove growth

| Technique | Evidence (**confirmed**) |
| --- | --- |
| Many `sed -n` slices of the same design files | `00bfd354`: 20 calls, 79.6k chars (19.9k tokens). `9523acac`: 17 calls, 53.1k chars. |
| Re-reading plan files in parts | `design.md` read 8 times and `sandbox.mjs` 7 times in `00bfd354`. `tasks.md` 4 times in `9523acac`. |
| Multi-file `wc` and `cat` batch in one command | One result of 18,006 and one of 21,731 chars (ce160872) from a single `wc -l` plus `head` listing. |
| Whole-file `Read` of the plan | `9523acac`: `design.md` 22.8k, `mods-api.md` 20.8k and `proposal.md` 10.5k chars. Read total 60.9k chars (15.2k tokens). |
| Bundled skill and type reads | `9523acac`: 40.4k chars for 12 calls (10k tokens). Includes a `grep` result of 18.4k chars. |
| `openspec` CLI JSON output | `087f5a37`: 27.2k chars in 6 calls. `00bfd354`: 19.2k in 3 calls. One call printed 11.7k chars. |
| Probe runs that echo logs | `9523acac`: about 27k chars over `probe21`, `probe24` and `probe27`. |
| Cross-session injected messages | `087f5a37`: 18 messages of 5.4k to 16k chars, about 170k chars (about 42k tokens) as user text. |
| Tool inputs (Write bodies, heredocs, long commands) | 56k to 158k chars per session, 14k to 40k tokens. |
| Fixed prefix | 19.9k to 23.3k tokens at request 1, 8% of the window before any work. |

### Techniques not present or small

- Large `git diff`: 2 calls, 9.7k chars at most (**confirmed**).
- Test output: 11 check calls, 7.7k chars at most in the biggest session (**confirmed**).
- Bundle `strings` greps: 0.5k to 9k chars in these sessions (**confirmed**), but 40k in `9523acac` for bundled-skill reads.
- Skill bodies as tool results: 66 and 88 chars (**confirmed**).
  The skill text itself enters as hook or system text, so its token cost is **inferred** and not measured here.
- Subagent reports pasted back: none over 1,300 chars (**confirmed**, see section 5).

### Techniques that kept sessions small

| Technique | Evidence (**confirmed**) |
| --- | --- |
| Background subagents that return a stub | Main thread got 1,112 chars per Agent call. 40 subagents ran, one reached 222,716 context in its own thread. The main thread never saw it. |
| Short final subagent report | Median final text 31 chars, maximum 4,766 chars. |
| Few whole-file `cat` calls | 0 to 2 calls per big session, at most 5.2k chars. |

## 5. Re-reads and large Agent results

### Re-reads of the same file (Read tool and Bash `cat`, `sed -n`, `head`, `tail`, `wc` by file name)

Corrected 2026-10-09 to the figures of `just measure` (`repeatReads` in `tools/measure/usage.mjs`).
The rule counts each `tool_use` block of the main transcript that is a `Read` call or a `Bash` command that prints a file, after it strips output redirects and heredocs.
A read is a repeat when a file with the same basename was read before in the session.
Subagent transcripts are not counted, because their reads do not enter the main context.
The first version of this table had 56 and 32 for `00bfd354` and 131 and 64 in total.
No counting rule reproduces those figures, so they probably came from an older printer rule (**inferred**).

| Session | File reads | Repeat reads | Most read files |
| --- | --- | --- | --- |
| `00bfd354` | 40 | 26 | `design.md` 11, `tasks.md` 7, `sandbox.mjs` 7, `proposal.md` 6 |
| `087f5a37` | 4 | 0 | none |
| `9523acac` | 29 | 16 | `Sandbox.md` 6, `tasks.md` 4, `proposal.md` 4, `sandbox.mjs` 4 |
| `ce160872` | 13 | 6 | `capture.mjs` 6, `tasks.md` 3 |
| Total | 86 | 48 | 56% of file reads are repeats |

Only the `Read` tool: 1 repeat in all main sessions (`ce160872`).
Almost all repeats are Bash slices (**confirmed**).

### Agent results over 5,000 chars

- Main-thread `Agent` tool results over 5,000 chars: 0 of 41 (**confirmed**).
  Each is a 1,112-char launch stub, except one of 385 chars.
- Task notifications over 5,000 chars in big sessions: 0.
  The largest is 1,290 chars.
- Final subagent messages over 5,000 chars: 0 of 40 (maximum 4,766 chars).
- Two other items over 5,000 chars exist.
  A notification of 119,782 chars in `3dee021f` (51k peak, version 2.1.292) and one of 18,584 chars in `9523acac`.
  Their source was not traced (not measured).

## Read dedup on a range (run of 2026-10-08, 2.1.293)

- `Read` of `research/surfaces.md` with `offset` 1 and `limit` 5, two times: the second call returned "Wasted call — file unchanged since your last Read. Refer to that earlier tool_result instead." (**confirmed**)
- A third `Read` of the same file with `offset` 3 and `limit` 2, a range inside the first one, returned the lines in full (**confirmed**).
- So the dedup is keyed on the exact range, and a Bash slice gets no dedup.

## Measured context figure (task 2.26)

By default, Claude Code gives the model no measured context figure.
The evidence, with the bundle names and the two opt-in switches, is in [probes-3.md](probes-3.md), section 2.26.
