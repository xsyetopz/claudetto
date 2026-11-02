# Prompt Footprint

Measured with Claude Code `2.1.312`. Every figure is a reading of `just capture`, which runs
`claude -p` against a local fake Messages API and counts the characters of the first request. No
model is called and no provider is reached.

## Main Prompt

`plugins/claudetto/agents/main.md` is 6,011 characters on disk. On 2026-11-02, before the denial and scope lines were reworded, on Claude Code `2.1.316`,
`just capture --arm plugin --shipped` read the third `system` block at 5,951 characters, the body with
its ends trimmed. As a JSON string the body is now 5,979 characters, 21 under the cap `MAIN_BODY_CAP` of 6,000
in `tools/limits.ts`, which the user set. The cap stands above the earlier budget, the 3,678 characters of the
default body that the file replaces (`DEFAULT_MAIN_BODY_CHARS`). An agent file used as the main thread replaces that body instead of adding to it
(`docs/prompt/overrides.md`, "What This Means for `main.md` and `Concise.md`"). The archived file was
11,135 characters.

The readings below are of earlier files, with a body of 5,572 characters, and stay as the record of how
the counting rules were settled.

### What the Harness Sends

Readings of 2026-10-29, re-read on 2026-10-30 (the table is today's), from the request body that
`just capture --arm plugin --shipped --dump` writes. The shipped settings carry `"agent": "claudetto:main"`, without which the file is unread.

Each arm below is one piece moved aside and the capture re-run, so a row's difference from the **first**
row is that piece's own cost. The rows are not nested, which matters: taking row 3 against row 2 prices
the style at 1,213, and the style's own cost is 1,693. Re-read on 2026-10-30 with both pieces moved
aside at once, the arm gave 22,434, and 480 plus 1,693 is the 2,173 that separates it from the first
row, so the two pieces are additive and the first-row reading is the right one. Every arm carries both
switches of `docs/surfaces.md` ("The Two Switches") and the `dedupe` skill.

| Arm | Total | `system` | Blocks | `tools` | `messages` |
| --- | --- | --- | --- | --- | --- |
| The shipped tree, `agent: claudetto:main` | 24,607 | 5,708 | 74, 62, 5,572 | 12,850 (9) | 5,345 |
| The same, `Artemis.md` and `Athena.md` moved aside | 24,127 | 5,708 | 74, 62, 5,572 | 12,850 (9) | 4,865 |
| The same, `output-styles/` moved aside | 22,914 | 5,708 | 74, 62, 5,572 | 12,850 (9) | 3,652 |
| The same, both of those moved aside | 22,434 | 5,708 | 74, 62, 5,572 | 12,850 (9) | 3,172 |
| The same, `agents/main.md` moved aside | 24,866 | 5,992 | 74, 62, 5,856 | 12,850 (9) | 5,345 |

The first row read 30,462 with a `tools` of 13,021 on 2026-10-29 and 30,450 with 13,009 on the
morning of 2026-10-30. The whole 12 characters were in `tools`, and the row below it was unchanged at
13,009, so the 12 were the roster's contribution to the `ListAgents` description and the roster no
longer reaches it. `just inventory` is what found this, by re-reading the three whole-request totals;
three consecutive readings of the first row gave 30,450 with every column identical. The row then
fell to 30,291 with the three new tool texts, to 24,378 with the two switches, and to 24,607 with the
`dedupe` skill, the end state above; "The Tool Texts" and "Shipped Cuts" of `docs/surfaces.md` hold
those steps.

Three rows of the shipped inventory read differently against the set of 2026-10-30, and
`plugins/claudetto/src/cuts.ts` holds the new figures, so every row of it is a reading of this one
capture set or the named residual. The agent listing is 480 and not 492 and the style is 1,693 and not
1,705, because each is a difference against the first row and the first row fell 12; the 12 left
`tools` once, and the moved-aside arm read 13,009 on both dates, so it was the roster's contribution
to the `ListAgents` description. `agents/main.md` saves 259 request characters and not 27, and it was
67 before the engine moved: the default body the plugin arm sends grew from 5,666 to 5,856 while the
file held at 5,572, so the same file replaces 284 raw characters instead of 94 and earns 259 on the
wire instead of 67. The 38 between the plugin's default and the host's 5,818 is the plugin's own system
text and it is a row of its own, since the chain from the baseline through every other measured step
lands 65 short of the reading without it. What remains in the `tool texts` residual is 3,144 against a
direct `tools` reading of 3,171, and the 27 between them is no longer the same figure as the body's
escaping term, so the residual stays named as the plug and not as a measurement.

- The front matter is not sent. The third `system` block arrived at 5,572, the body with its ends
  trimmed, against 5,648 on disk. That closes the open question of `docs/prompt/overrides.md`, and
  the budget test measures the body alone (`tests/repo/prompt/budget.test.ts:22`).
- The body replaces the default body: 5,572 stands where 5,856 stands in the plugin arm, and no other
  `system` block moves. The request falls 259 and not the 284 of the character count, because the body
  travels as a JSON string and ours escapes characters the default text does not. That is why the
  budget is 5,680 request characters rather than any figure in characters, as "Byte Budgets" below
  sets out. A capture of 2026-10-29 settles that the budget is the body it replaces and not a round
  number: the dumped request carried the default body as 5,628 characters and 5,680 of request JSON.
  The engine's default has grown since, to 5,818 in the `plain` arm, and the budget has not been
  re-read against it.
- An agent file in the plugin costs characters in `messages` whether or not it is in use, because the
  harness names each custom agent in the agent listing of the first message with its description and
  its tools. No session delegates to `main`, and the `agent.offer` event fires "in the agent listing
  and again at dispatch" (`clawdipedia` route `extend/mod-api/calls/agent`), so
  `plugins/claudetto/src/register.ts` refuses that one offer and `main` costs nothing while it is not
  the thread. `Artemis` and `Athena` are delegation targets, so they are listed and they do cost: the
  two entries read 492 characters on 2026-10-29. They read 480 from 2026-10-30, the arm with both files
  present at 24,607 against 24,127 with both moved aside, and 480 is the figure the inventory carries.

`plugins/claudetto/src/cuts.ts` holds the rows as `main agent body` at 528 (259 before the cut of 2026-10-31) and `agent listing` at
-480. The second was 0 while `main` was the only agent file in the tree.

"Byte Budgets" below holds the budget with its reading.
`tests/repo/prompt/budget.test.ts` checks the body of `agents/main.md` against the one budget it
fixes (`tests/repo/prompt/budget.test.ts:30`), reports a body over it by name, size, and budget
(`tests/repo/prompt/budget.test.ts:26`), and holds the counting rule that front matter is free
(`tests/repo/prompt/budget.test.ts:46`).

### Why the Body Is Shaped This Way

Both prompt files are hybrid XML: a named tag per section, prose inside, markdown only where there is
a real list. That is the form `external/please-use-me-often/xml-prompting-guide.md` recommends for a
system prompt, on the grounds that XML gives clear boundaries and a name to point at while prose
inside keeps the instruction natural and pushes the reply toward prose. The guide's own table puts
hybrid first for system prompts and production apps.

Three of its techniques are in use. The reason sits next to the rule where the reason generalizes, as
in "because the same call in other words is the same call", so the model can handle a case the rule
did not anticipate. Failure modes are named rather than gestured at, as in "not a restatement, not
your narration, not a task or plan name" and "never with a shortcut such as `--no-verify`", because
the guide reports that vague negatives do not change behavior and named patterns do. Each rule is a
standing rule set at the start of the conversation, which is the channel the guide assigns them.

Its nine anti-patterns were checked against both files on 2026-10-29 and none is present: no
`<thinking>` or `<scratchpad>` instruction, no "think carefully" or "think harder" line, no blanket
search rule, no vague style negative, no tag per sentence at 11 sections over 5,584 characters, and
no mid-conversation edit of `system`, since the body is fixed at launch by the `agent` setting. This
is a review and not a check: a test may not assert the prose of a prompt, so nothing holds the form
except this record.

### What the File Does Not Carry

The rewrite is 5,616 characters smaller than the archived file. Four groups of text account for it:

- The reply rules, which moved to `output-styles/Concise.md`: the opening rule, the no-padding rule,
  and the `file:line` reference rule. A rule in two files drifts.
- The agent roster, which the `Agent` tool's own description already lists. What stays is one line on
  when to delegate and what a brief carries.
- The "code that only looks wrong" rule. `<asking>` covers it with the two-good-options rule, and
  no recorded failure names it.
- Reasons that only restate their rule. A reason that generalizes stays, as in "because the same call
  in other words is the same call".

### Sections of `0.2.0` and Their Replacements

The `0.3.0` body replaces each `0.2.0` section for the flaw the user named on 2026-10-31. It measures
5,979 characters against the cap `MAIN_BODY_CAP` of 6,000 in `tools/limits.ts`, which the user set.

| `0.2.0` section | Flaw the user named on 2026-10-31 | New section |
| --- | --- | --- |
| `<role>` | "Read an unclear request as a task" turns doubt into unrequested work | `<role>`, `<understanding_the_request>` |
| `<security>` | Refuses destruction and DoS even on the user's own systems | `<security_work>`, decided by ownership and authorization |
| `<harness>` | Names assumed structures, not the literal forms | `<harness_messages>`, quoting `<system-reminder>`, `hook additional context:`, `<pasted_content id="…">`, and the mid-turn message line |
| `<project>` | Mixes reading order, conflicts, and tools | `<project_context>` |
| `<tools>` | Assumes a `just` file | `<project_context>`, with "the task runner the project already has" and the `0.2.0` line "Send independent calls in one turn" |
| `<scope>`, `<asking>` | Send a block to the user as a question | `<finding_out>` (FAFO), `<finishing>` |
| `<defects>` | Limited to "this session" | `<fixing_defects>`, with earlier sessions in scope and `SendMessage` to a live session |
| `<code>` | Code style in a session prompt | `<writing_code>` of `rules/claudetto-code.md`, which `claudetto:setup` offers to write to `~/.claude/rules/` |
| `<actions>` | A paid-run gate, and "ask" as the answer to a block | `<actions_and_consent>` |
| `<claims>` | No source order, no hypothesis before confirmation | `<finding_out>`, `<claims_and_evidence>` |

One `0.2.0` rule has no full replacement: "Approval of a task or plan covers it end to end."
`<finishing>` keeps its half that length is no reason to stop, and `<actions_and_consent>` says that
one approval covers one action, which is about actions others see and not about a task's steps.

The code rules file loads only after a session reads a file. Its `paths:` of `**/*` keeps it out of
the first request, and an unscoped rules file is in it. Claude Code `2.1.316` read this way on
2026-11-02, with `claude -p` on a fake API and a `Read` call: a rule scoped to `inside/**` reached the
request after a `Read` of `inside/a.ts` and not after one of `outside/b.ts`. In `tmux`, the session
printed `Loaded ../config/rules/claudetto-code.md` under the `Read`. A plugin's own `rules/` folder is
not loaded, so the file takes effect only once setup writes it.

## Rules and Cases

The file carries eight behavior rules with an eval case each, every one named by a defect of this
change's history. `B3-7` of `external/please-use-me-often/swe-best-practices.md:122` gives the check
for a prompt, "Prompt review + eval on change", and `W3-4` gives the failure of a prompt whose rules
nothing scores: a rule dump that is silently ignored. Each case in `tools/evals/main-rules.ts` has a
scenario, the decision that passes, and the recorded failure that fails. The comment rule of `0.2.0`
moved to `rules/claudetto-code.md`, and its case is in `tools/evals/conduct/replies.ts`.

| Rule | Codes | Section | State |
| --- | --- | --- | --- |
| Fix a defect at its cause and never route around it | `W5-13`, `W1-8` | `<fixing_defects>` | `main.md` 10/10, default 10/10 |
| Read a failing check for the cause, never edit the check | `W5-1`, `I05` | `<fixing_defects>` | `main.md` 10/10, default 10/10 |
| An instruction of the user outranks a rule of the project | `W5-6` | `<project_context>` | `main.md` 10/10, default 4/10: `bun.lock` did not change |
| Use the surface that exists before building a mechanism | `W5-12`, `I09` | `<project_context>` | `main.md` 10/10, default 10/10 |
| A step inside the scope is taken now, a step outside waits | `W5-11`, `I13` | `<finishing>` | `main.md` 10/10, default 10/10 |
| A question waits until the work it leaves untouched is done | `I13` | `<understanding_the_request>` | `main.md` 1/10, the `0.2.0` `main.md` 1/10, `main.md` with the `report.ts` comment removed 0/10 |
| Conflicting instructions are named and stopped on | `W5-15` | `<project_context>` | `main.md` 10/10, default 9/10 |
| Independent tool calls go in one turn | `I12` | `<project_context>` | `main.md` 10/10, default 10/10 |

Running a case calls a model. A citable arm needs 10 runs
(`EVAL_MIN_RUNS_PER_ARM` of `tools/limits.ts`, the floor the paid probe printed), and the arms are
the shipped `main.md` against the default body, so a citable run of the eight cases is 160 sessions.
`just eval --run` runs them. The results above are from one run of 160 sessions on 2026-11-02,
on `claude-opus-5-5`, at $14.39 and 11,933,697 tokens, regraded after grader fixes. `I13` and
`W5-15` were run again with fixed fixtures, 40 sessions at $4.18 and 3,303,607 tokens. A `-p`
session has no `AskUserQuestion`, so `I13` grades the question in the final reply. The `main.md` arm of
all eight cases was run again on 2026-11-02 after `main.md` changed, 80 sessions at $6.80 and
5,776,926 tokens, and the `main.md` scores above are from that run.
The `I13` row is from a later run of three arms of 10, 30 sessions at $3.38 and 2,937,989 tokens.
Of its 28 failures, 9 stopped to ask before any edit, so `report.ts` did not parse `--json`, 10
picked a shape and asked nothing, and 9 picked a shape and edited `docs/report.md`.
Both `main.md` bodies score 1/10, so the rewrite of `main.md` does not explain the lower score.
The denial line of `<harness_messages>` changed after these runs, and no case covers it.
The `main.md` arm of all eight cases was run again on 2026-11-02, after eval sessions stopped
inheriting the running session's `CLAUDE_EFFORT` and `CLAUDE_CODE_SUBAGENT_MODEL`: 80 sessions at
$6.37 and 4,992,343 tokens, 0.16% of the 3.20B-token week and 0.57% of the weekly limit at $11.19 a
percent. Seven cases scored 10/10 as before, and `I13` scored 2/10, so the `main.md` scores stand.
The default arm was not run again, so its scores are from sessions that inherited those variables.

`tools/evals/__tests__/main-rules.spec.ts` checks the inventory: no case has an empty field, and
every case names a section the shipped file has. A case whose section the file lacks is reported as
`CODES: agents/main.md has no <SECTION> section`.

## Output Style

Readings of 2026-11-02 on Claude Code `2.1.316`, `just capture --arm plugin` with the shipped settings,
and the same settings without `outputStyle`. A style adds to the body and does not replace it.

| Reading | Characters |
| --- | --- |
| `output-styles/Concise.md` on disk | 2,098 |
| Its front matter, which is not sent | 160 |
| Its body, trimmed, which is what the harness sends | 1,936 |
| The same body as a JSON string | 1,958 |
| The first request with the style against without it | 32,565 against 30,464, so +2,101 |

The body lands in `messages`, not in `system`: `messages` went from 10,228 to 12,329, and `system`
stayed at 6,087 with blocks 74, 62, and 5,951. The 2,101 is the JSON body, the harness's header
`# Output Style: claudetto:Concise`, and its reminder on each user message.

The cap `OUTPUT_STYLE_CAP` of `tools/limits.ts` is 1,936, the measured trimmed body, and
`tests/repo/prompt/budget.test.ts` checks it. The earlier cap was 1,540, the cost of the built-in
`Concise` style (`docs/prompt/overrides.md`). The file passes it by 396, because it also carries the
rules of the built-in `Proactive` style in `<acting>`, and an output style replaces the built-in one.
The `0.2.0` body was 1,477 characters, and the archived file was 2,649.

The sections, each with the failure it answers:

- `<first_sentence>`: the opening is the outcome, the fact, or the next action, and a fact from the
  user that contradicts the last reply gets the next action or the changed fact, not agreement
  (`W5-18`, `I06`).
- `<acting>`: start at once, take the reasonable reading of a low-risk, reversible step, and ask only
  between two good options (`I13`).
- `<sentence_style>`: short literal sentences, the actor as the subject, code items in backticks, and
  `file:line` references (`W5-16`).
- `<reporting_results>`: a piece is working only after its check ran this session (`W5-10`, `I04`), a
  defect of its own is a bug report (`W5-4`), no sentence rates anyone, and the reply ends on the result
  with no offer.
- `<requests_to_the_user>`: each decision in `AskUserQuestion`, and a "What I Need from You" list only for
  steps only the user can take.

### The Built-in Styles of `2.1.316`

Read on 2026-11-02 with `just capture`, which answers from a fake API on `127.0.0.1` and costs
nothing. The bodies were decoded from the UTF-16 text of the program near byte offset `127214406`.

| Arm | Total | `system` | `messages` |
| --- | --- | --- | --- |
| No style (`Default`) | 43,003 | 5,858 (blocks 74, 62, 5,722) | 8,050 |
| `Proactive` | 44,526 | 5,896 | 9,533, so +1,483 |
| `Concise` | 44,570 | 5,896 | 9,577, so +1,527 |

The decoded `Proactive` body is 1,125 characters and the `Concise` body 1,165. A style also swaps the
identity line of `system` for one that names the output style, +38, and adds a per-turn reminder of
about 104 characters. `Proactive` tells the agent to start at once, to take a reasonable reading of
low-risk work over a question, and to treat a course correction as normal input. `Concise` tells it to
lead with the result, cut narration, and keep error text and requested detail in full. The lean
`system` already asks for confirmation of a hard-to-undo action and a faithful report of outcomes, so
a style need not repeat either.

## Byte Budgets

A budget is the text the piece stands in for, read from a stock session. A piece over its budget makes
every request larger than a stock session, so the figure is a bound and not a target. What counts is
what the harness sends: for a prompt file the body with the front matter removed and the ends trimmed,
and for a tool text the description string itself.

The table below holds the budget and the reading of each piece. No check parses it now. Two rows are
caps that a test checks, in `tests/repo/prompt/budget.test.ts`: the body of `agents/main.md` against
`MAIN_BODY_CAP` and the body of `output-styles/Concise.md` against `OUTPUT_STYLE_CAP`, both in
`tools/limits.ts`. Both stand above the text they stand in for. A row is meant to carry a
reading, to name a file that ships, and for a tool to agree with the stock reading it cites, and
nothing fails when one drifts.

| Piece | Kind | Budget | Measured as | Reading |
| --- | --- | --- | --- | --- |
| `agents/main.md` | file | 6,000 | `request JSON` | 5,979 on 2026-11-02. The earlier budget was 5,680, the default body as the request carried it on 2026-10-29: 5,628 characters plus the 52 it escapes |
| `output-styles/Concise.md` | file | 1,936 | `characters` | 1,936 on 2026-11-02. The earlier budget was 1,540, the built-in `Concise` style in `messages[1]` (`docs/prompt/overrides.md`) |
| `Agent` | tool text | 1,047 | `characters` | The stock description it replaces, the smaller of docs 3,227 and capture 2,906 (`plugins/claudetto/src/blocks/tool-describe/tools.ts:19`) |
| `Bash` | tool text | 1,085 | `characters` | The stock description it replaces, the smaller of docs 1,934 and capture 1,267 |
| `Read` | tool text | 538 | `characters` | The stock description it replaces, docs and capture both 790 |
| `Skill` | tool text | 975 | `characters` | The stock description it replaces, docs and capture both 1,417 |
| `ToolSearch` | tool text | 656 | `characters` | The stock description it replaces, docs and capture both 953 |

`agents/main.md` is the one row bounded on the request and not on the file, because its budget began
as "no larger than the text it replaces". A newline and a quote each cost one
character in the file and two in the request, so the two units move apart as the file is edited. The
edit of 2026-10-29 is the proof: the body lost one character, 5,585 to 5,584, while gaining one
newline, so its request length held at 5,664 and the request total held at the 29,080 of that
reading, which later readings on the same date moved to 30,462. A bound in
characters would have reported a saving that the request never received, and a file of 5,600
characters with enough newlines would pass that bound while making every request larger than a stock
session.

Two kinds of always-loaded piece get no budget.

- Skill `description:` lines. The tree ships one skill, `docs`. It replaces no stock text, so there is
  no figure to bound it by; "The Two Switches" of `docs/surfaces.md` holds what a skill costs a request.
- Hook-injected strings. `plugins/claudetto/hooks/hooks.json` names one module, and
  `plugins/claudetto/src/register.ts` registers one handler, `tool.describe`, which replaces a
  description instead of adding text. No hook of the new tree injects a string into a request.

## Skill Listing

`disable-model-invocation: true` keeps a skill out of the request. The harness lists each other skill
in the first message, under "The following skills are available for use with the Skill tool:", as one
line of `- <plugin>:<name>: <description>`.

### What the Flag Changes

Readings of 2026-10-29, from `just capture --arm plugin --shipped` over the shipped tree with one
skill planted in `plugins/claudetto/skills/` and removed after the run. The planted description was
44 characters and the planted name 10. The finding here is the difference between the rows and not
the absolute total, which a later reading of the same date moved from 29,080 to 30,462 as the agent
files and the handoff context block were added.

| Arm | Total | `messages` | The skill in the request |
| --- | --- | --- | --- |
| The shipped tree, no skill | 29,080 | 9,754 | none to find |
| One skill with `disable-model-invocation: true` | 29,080 | 9,754 | absent: neither its name nor its description is in the body |
| The same skill without the flag | 29,150 | 9,824 | the line `- claudetto:probe-auto: PROBEAUTOMARKER, a skill the model may call.` in the skill listing |

So a listed skill costs its name, its description, and 14 characters of markup, and a skill with the
flag costs nothing. This also settles the figure of D11 in `architecture.md`, which counted the ten
`description:` lines of the archived tree at 1,720 characters: the listing those lines would have
written is larger than 1,720, by 14 plus the name of each skill.

### The Skills and Their Flags

The tree ships one skill, `docs`; the `dedupe` skill was removed.

| Skill | Model may call | Reason |
| --- | --- | --- |
| `docs` | yes | The model looks up library docs at a moment the user does not name, so the description has to be in context |

A row says whether the model is meant to start the skill, and why. No check reads
the table now. It is meant to hold a row with a reason and a `SKILL.md` for each skill, to leave the
flag unset for a skill that only the user starts, and to set it for a skill the model may call, and
nothing fails when a row drifts from that.

## Cache Stability

A prompt edit is a pure function of its inputs: no time, no counter, and no usage number in a shared
section (`architecture.md`, "Cache stability"). Cache writes are 49.8% of the cost of this machine's
80 transcripts at Anthropic's official prices while being 5.21% of its tokens (`references.md`), so a
character that moves between two sessions is paid at the write price every session.

The new tree makes one prompt edit, `tool.describe`, so there is one section to hold stable, and two
checks hold it.

- Byte identity of a build. `plugins/claudetto/tests/tool-describe.test.ts` drives the shipped mod
  through `$.tool.describe` twice for each of the five described tools and compares the two
  descriptions character for character. The lab runs the registration of `plugins/claudetto/src/register.ts`
  and not a copy of its rule.
- No impure reading on the prompt path. The prompt modules, `plugins/claudetto/src/blocks/tool-describe/texts.ts`
  and `plugins/claudetto/src/blocks/tool-describe/tools.ts`, read no clock (`Date.now`, `new Date`,
  `performance.now`, `process.hrtime`, `$.clock`), no counter (`Math.random`, `randomUUID`), and no
  usage number (`session.usage`, `session.measure`), found by grep on 2026-10-30. `tools.ts:8`
  imports `texts.ts` and nothing else. No check scans for it now, and the window recorder of group 7
  reads usage numbers by design and is not on this path.

What the two checks do not cover: a counter that moves once per session rather than once per call.
The lab case compares two builds inside one process, so it catches a per-call counter and not a
per-session one, and the source scan catches such a counter only when it is written with one of the
names above.

A third check runs on a whole session. `bun claudekit/prefix/main.ts claudetto` drives a session
against the fake Messages API, 4 and 7 requests in two runs because the scenario waits a fixed time, with the plugin, the shipped settings, the `Concise` style, the status
line, a `Read` and `Edit` turn, and a plan-mode switch. Each request kept the earlier `tools`,
`system`, and `messages` byte for byte, on Claude Code `2.1.316` on 2026-11-02. What claudetto adds is
appended: the `context_management` block sits in `messages[0]` from the start, and the style
reminder and the budget line arrive as new `system`-role messages. The status line is in no request.
So in `2.1.316` the cache-safe way to add context is a new message at the end. `system[0]` carries
`cc_version` with a suffix taken from the first user message, so anything that replaces that message,
a compaction or a `/clear`, changes `system[0]`.

## Context Enters Once

The framework adds no text on a user message. Context enters at the first message of a conversation or
at a compaction, and nothing after that.

One block of the framework rides that first message. `prompt.context` carries `context_management`,
which shows the handoff file name pattern and the whole template of a handoff that Claude writes: the
title, the source line, and the nine headings. The code-built handoff renders the same template.

| Build | Characters | Request JSON |
| --- | --- | --- |
| Headings as one inline list (`544088f7`) | 673 | 681 |
| Template as a fenced block (`0.3.0`) | 810 | 842 |
| Handoff as the reply, with the compaction line | 943 | 977 |
| Handoff through the tool, with the reply as fallback | 1,157 | 1,191 |

The first two rows come from `just capture --shipped --dump DIR` on 2026-10-31, and the third from
`just capture --arm plugin --shipped --dump DIR` on 2026-11-02. Each counts the block from
`# context_management` up to `</system-reminder>`, without the closing tag. The third row asks for the
handoff as the reply and says what a reply that starts with `# Handoff` sets off, 133 characters more
than the second. The fourth row, from the same command on 2026-11-02, asks for the `handoff` tool with
its fields and keeps the reply as the fallback, 214 characters more than the third. The tool's
description (445 characters) and input schema (812) join the tool list. The `544088f7` row was
captured from a worktree of that commit. The whole request grew by 188 characters: 161 from this block
and 27 from the plugin's folder path in the sandbox block, because the two builds ran from different
folders. It is bought and not free: no hook can write that file,
because both writers make no model call and code reads no decision off a transcript, so the only way
to get the nine sections is to ask the session for them once per conversation.

The block takes one engine text out. Core's own `context_management` system section tells the model
that the context is summarized and that it need not "wrap up early or hand off mid-task", which
contradicts the block. A `prompt.section` hook of the same block leaves it out, and system block 2
fell from 5,760 to 5,478 characters in a session on the fake API on 2026-11-02
(`/tmp/probe-shared/run.sh`).

Two events carry per-message text, and the lab holds both.
`plugins/claudetto/tests/handoff/prompt-quiet.test.ts` drives the shipped mod and fails for a hook that adds
anything beyond that one block on either.

- `prompt.context` "fires once for each conversation, when the engine computes the context blocks
  that its first user message carries" (`clawdipedia` route `extend/mod-api/calls/turn-prompt`, read
  2026-10-29). The case passes three blocks in and asserts that the three come back unchanged with
  `context_management` appended and nothing else, which read as
  `claudeMd,userEmail,currentDate,context_management`.
- `prompt.attachment` "fires once for each message the engine adds for the model on its own (a
  reminder, a mode change, a mentioned file)" (same page). The case passes a `plan_mode` reminder in
  and asserts the text comes back unchanged.

The `prompt.attachment` case has teeth for later: a hook that a later group registers on that event
turns it red. The `prompt.context` case keeps its teeth by naming the one block that is allowed, so a
second block or a changed harness block still fails it.

The harness's own per-message text is not in scope here. The style reminder of 102 characters that
rides on each user message is the harness's, not the framework's, and
"Output Style" above prices it.

## Why Each Always-Loaded Piece Is There

A piece in this table is paid on every request of every session. The rule it has to pass is that it
names a behavior it changes and a check that would catch its absence. A piece that names neither is
cut, and no piece is kept on the ground that it reads well.

Two sources set the rule. A placebo study of 2026-10-12 (`claude-opus-5-5`, 15 tasks, 30 runs in each
arm, 450 in all) found that "None of the 9 made Claude Code measurably cheaper than running with no
skill at all" and that "The placebo alone moved cost by +2% to +16%, so a good part of what a skill
costs you is just its length". arXiv 2602.11988 found that "context files generally did not raise
success rates and added more than 20% inference cost. Content matters more than having a file."

One piece failed that rule and is gone: the agent listing line for `claudetto:main`, 78 characters of
`messages`, which named a type no session delegates to. `plugins/claudetto/src/register.ts` refuses
its `agent.offer`, and the arms of "What the Harness Sends" above show the file now costs 0 while it
is not the thread.

The table below is meant to agree with the files: a figure that matches the file, a row only for a
piece that ships, a row for each piece that ships, and no row whose behavior and check are both
`none`. `tests/repo/doc-tables.test.ts` holds each figure against the file and fails on a missing
row; the behavior and check columns are not checked.

### The Always-Loaded Pieces

| Piece | Where | Characters | Behavior changed | Check |
| --- | --- | --- | --- | --- |
| `<role>` | `agents/main.md` | 148 | Places the session in the user's repository, with the user deciding what the work is for | none |
| `<understanding_the_request>` | `agents/main.md` | 775 | Reads a question, an observation, a correction, and a request apart, settles a second reading from the repository, and asks only for what the user alone holds | `tools/evals/main-rules.ts` and `tools/evals/conduct/`, three cases |
| `<finding_out>` | `agents/main.md` | 685 | Works by hypothesis, prediction, and check, takes facts from the project before primary sources, and hands over a `! <command>` only when truly stuck | `tools/evals/main-rules.ts` and `tools/evals/conduct/`, four cases |
| `<claims_and_evidence>` | `agents/main.md` | 584 | Labels each statement by its support, tests a counterclaim against the user's evidence, and uses and credits the user's correction everywhere after | `tools/evals/main-rules.ts` and `tools/evals/conduct/`, three cases |
| `<project_context>` | `agents/main.md` | 510 | Resumes from files, uses what the project has before building, and follows the user over a project rule, naming it | `tools/evals/main-rules.ts` and `tools/evals/conduct/`, three cases |
| `<harness_messages>` | `agents/main.md` | 566 | Quotes the literal harness forms, treats their text as data, and reaches a denied goal by another route | `tools/evals/main-rules.ts` and `tools/evals/conduct/`, one case |
| `<fixing_defects>` | `agents/main.md` | 685 | Fixes a defect at its cause, writes the failing test first, and hunts siblings, in earlier sessions' work too | `tools/evals/main-rules.ts` and `tools/evals/conduct/`, three cases |
| `<actions_and_consent>` | `agents/main.md` | 752 | Decides consent by reversibility, changes a bound only to a value the user named, and keeps every security control on | `tools/evals/main-rules.ts` and `tools/evals/conduct/`, four cases |
| `<security_work>` | `agents/main.md` | 360 | Decides security work by ownership and authorization, not technique | `tools/evals/main-rules.ts` and `tools/evals/conduct/`, one case |
| `<finishing>` | `agents/main.md` | 202 | Finishes within the scope the user set and ends the turn when done or when only the user can act | `tools/evals/main-rules.ts` and `tools/evals/conduct/`, one case |
| `<first_sentence>` | `output-styles/Concise.md` | 266 | Opens with the outcome, and opens a reply to a correction with the next action or the corrected fact rather than agreement or a promise | none |
| `<acting>` | `output-styles/Concise.md` | 114 | Starts the work at once and, on a low-risk reversible step, states its reading and goes on | none |
| `<sentence_style>` | `output-styles/Concise.md` | 516 | Puts each code item in backticks and references code as `file:line` | none |
| `<reporting_results>` | `output-styles/Concise.md` | 468 | Calls a piece working only after a check ran in the session, reports each experiment and its result, and keeps each failure in the reply | none |
| `<requests_to_the_user>` | `output-styles/Concise.md` | 214 | Ends with a numbered list only for a step only the user can take, with the exact `! <command>` | none |
| `Agent` | tool text | 444 | Briefs a subagent with the objective, the format, and the limits, reports its result only after it returns, and picks `Artemis` or `Athena` by what the task produces rather than by its topic | `plugins/claudetto/tests/tool-describe.test.ts`, and `tests/repo/agent-roster.test.ts` for the roster |
| `AskUserQuestion` | tool text, interactive only | 829 | Asks only for a decision the request, the code, and sensible defaults leave open, and otherwise picks, says so, and goes on | `plugins/claudetto/tests/tool-describe.test.ts` |
| `Bash` | tool text | 870 | Writes a description a reader understands without the command, and uses the `timeout` parameter rather than a `sleep` | `plugins/claudetto/tests/tool-describe.test.ts` |
| `Edit` | tool text | 243 | Reads a file in this conversation before editing it, and strips the `Read` line prefix from `old_string` so an edit does not fail on a line number | `plugins/claudetto/tests/tool-describe.test.ts` |
| `ListAgents` | tool text, deferred | 261 | Sends to the name a row prints rather than looking for an address syntax, and reads a cloud session's answer in its own transcript instead of asking it to reply | `plugins/claudetto/tests/tool-describe.test.ts` |
| `Read` | tool text | 283 | Reads a part of a large file instead of the whole, and trusts a successful edit | `plugins/claudetto/tests/tool-describe.test.ts` |
| `SendMessage` | tool text | 3,008 | Addresses a peer by the name its `ListAgents` row prints rather than looking for an address syntax, reads a successful send as delivery and not as agreement, waits for a reply on other work instead of looping on `ListAgents`, and refuses to hand a peer work this session denied | `plugins/claudetto/tests/tool-describe.test.ts` |
| `Skill` | tool text | 195 | Starts a skill by name instead of restating its steps | `plugins/claudetto/tests/tool-describe.test.ts` |
| `ToolSearch` | tool text | 234 | Gets a deferred tool's schema before calling it | `plugins/claudetto/tests/tool-describe.test.ts` |
| `Write` | tool text | 196 | Writes a whole file only for a new file or a full replacement, and uses `Edit` for a partial change | `plugins/claudetto/tests/tool-describe.test.ts` |

The ten `agents/main.md` rows come to 5,267 characters and the file sends 5,285, the difference
being the blank line between sections. The five `Concise.md` rows come to 1,578 against 1,586. The
seven upfront tool texts come to 3,294 against a stock sum of 10,016, a cut of 6,722. The `-p` request
carries six of them, 2,465 against 7,933, because `AskUserQuestion` is in the interactive request only.

Two rows of the table are not always loaded. `SendMessage` is 3,008 characters against a stock 4,259,
so it cuts 1,251, and the harness defers the tool, so that cut is paid once at the `ToolSearch` call
that loads the schema rather than on every request. `ListAgents` is upfront in stock, and the
`tool.describe` answer of `plugins/claudetto/src/blocks/tool-describe/tools.ts:90` sets `isDeferred`
on it, so its 261 characters are paid in a session that messages a peer and loads it beside
`SendMessage`. Moving it took 633 characters off the interactive request, 40,344 to 39,711, and 641
off the `-p` request, 28,527 to 27,886. `alwaysLoadedChars` leaves both out of the 3,294.

The `Edit`, `ListAgents`, and `Write` rows were written on 2026-10-30, when the user asked for more
of this. They are the last upfront tools that had no text: of the nine definitions a shipped request
carries, the other six now have one and `DeferredToolPlaceholder` is 83 characters and has nothing to
give. Their three cuts are 32, 82, and 44 characters, and the shipped first request fell 159, 30,450
to 30,291, with the `tools` array carrying the whole fall, 13,009 to 12,850. The yield is small
because each of the three stock texts is already near its floor, which is also why `ListAgents` had
been left alone: the first draft of its text came out at exactly 777 characters, the stock length,
and `deadTexts` rejected it until a second pass reached 695.

The request then fell on the same day to 24,607. The two switches of `plugins/claudetto/src/builtins.ts`,
`disableBundledSkills` and the twelve built-in plugins set to `false`, took it to 24,378 with every
character out of `messages`, and the `dedupe` skill put 229 back. `docs/surfaces.md` ("The Two
Switches") holds the rows.

Three of those figures moved on 2026-10-29, when two duplicated lines were traded for two harness
facts the replacement had dropped (`docs/default-body-gap.md`, "What the Trade Bought"). `<tools>`
fell 198, `<harness>` rose 90, and `<scope>` rose 107, so the file was one character smaller than
before.

Ten of the eleven moved again the same day, when `<asking>` took the rule that a question needing a
person waits for the work that does not depend on the answer. `<asking>` rose 247, and the
other nine fell 259 between them by rewording alone, no requirement dropped, because the file was 16
under its bound and the new rule did not fit. 27 now remain under it.

### What the Check Does Not Settle

A row in the `Check` column that names `tools/evals/main-rules.ts` names a case whose result is in
"Rules and Cases" above, from a paid run. A row that names `tool-describe.test.ts` is checked for presence
and byte identity, not for effect: the lab proves the text ships and is stable, not that it changes a
decision. Eight rows say `none`, and each of those pieces is held by its behavior alone until a case
exists. That is the open end of this section, and the reason the table separates the two columns.

The largest open end is the placebo question, and it stays open by decision. Whether this text changes
an outcome or only the bill was to be measured by running each case against a same-length placebo
prompt: 7 cases, 2 arms, 10 runs per arm by the citable floor of `EVAL_MIN_RUNS_PER_ARM`, which is 140
full-task sessions, about `$210` at `$1.50` a session, near 7% of the weekly limit of this login. The user declined that run
on 2026-10-29, at 7 cases, and the decline is recorded rather than the result. So every behavior in the
table above rests on the recorded failure it was written against, and on no measurement of this
prompt against a placebo. The two published results in the section opening are the nearest evidence
there is, and neither tested this prompt.

When the question is reopened, the graders are ready. Each case names how it is decided, seven of the
eight by a command over the tree rather than by a model reading the reply
(`docs/evidence/grader-blindness.md`), and the `check` of each is prose that a runner has to
implement.

## Surface Baseline of `0.1.0`

Read on 2026-10-31 with Claude Code `2.1.314`. Every surface claudetto reaches, read before any cut.
`just inventory` held its three rows: baseline 46,105, deny list 33,684, shipped 32,039.

The first request comes from `just capture --shipped --dump DIR`, in the `plugin` arm, and reads
32,039 in total: `system` 5,708, `tools` 13,801 (9), `messages` 11,848. Each row is the JSON length
of its piece as the request carries it.

| Surface | Where it travels | Characters |
| --- | --- | --- |
| Session prompt, `agents/main.md` body | third `system` block | 5,715 (5,572 text) |
| Tool texts | `tools` | 13,801 |
| `Bash` / `Agent` / `Read` / `Skill` | `tools` | 3,699 / 3,021 / 1,665 / 1,403 |
| `ToolSearch` / `ListAgents` / `Edit` / `Write` / placeholder | `tools` | 1,204 / 1,070 / 931 / 594 / 204 |
| Sandbox notes and configuration | last message | 6,422 (995 notes, 5,427 configuration) |
| Output style `Concise` | last message | 1,939 |
| Agent listing, four agents | last message | 1,155 |
| Environment block | last message | 847 |
| Skill listing, three skills | last message | 481 |
| Hook output, the `handoff` block's reminder | first message | 819 |

The sandbox rows appear only because the shipped settings turn the sandbox on, and the plain arm
carries none. The configuration lists paths of the capture's temp folder and the user's home, and the
harness cuts it at a fixed count with "... and 153 more", so its length depends on the machine.

The classifier request is read with `just capture --classifier --arm ARM --settings FILE`. A
`--shipped` run sends no classifier request, because the shipped sandbox runs the played
`git push` without the classifier. The file holds the shipped `autoMode` alone, or the shipped
settings with `sandbox.enabled` set to `false`.

| Classifier arm | Total | `system` |
| --- | --- | --- |
| `plain`, built-in lists | 141,962 | 140,337 |
| `plugin`, shipped `autoMode` suite | 65,340 | 63,893 |
| `plugin`, all shipped settings, sandbox off | 66,075 | 64,628 |

A `-p` run now writes Claude Code's classifier billing notice to stderr whenever the base URL is not
`*.anthropic.com`. The remote flag `tengu_velvet_heron` gates the notice. The notice does not
stop the classifier, so it changes no reading.

### Cuts of `0.1.0`

One surface at a time, each read with `just capture --shipped` against the reading before it.

| Surface | Before | After | Fall | Change |
| --- | --- | --- | --- | --- |
| Session prompt, `agents/main.md` | 32,039 | 31,770 | 269 | Reasons that only restate their rule, and wordier phrasings, cut; every rule kept. Body 5,572 to 5,303 |
| Output style, `Concise.md` | 31,770 | 31,721 | 49 | Shorter phrasings; every rule kept. File 1,646 to 1,597 |
| Tool texts, `blocks/tool-describe/texts.ts` | 31,721 | 31,424 | 297 | `Agent` 1,092 to 1,047, `Bash` 1,090 to 1,085, `ListAgents` 695 to 567, `Skill` 1,023 to 975, `ToolSearch` 727 to 656 |
| Hook output, the `handoff` reminder | 31,424 | 31,352 | 72 | Six lines merged to four; the folder, the nine headings, the path rule, `[REDACTED]`, and the decisions rule kept |
| Agent and skill listings | 31,352 | 31,237 | 115 | Four agent descriptions 110 shorter ("Use for" in place of "Use when the product is"), `dedupe` 5 |
| `/init` interview, `blocks/init-interview/block.ts`, read with `--prompt "/init"` | 32,735 | 32,511 | 224 | The guide's three cuts: the file list the model reads unasked, the repeated "ask nothing a file answers", and the move rule folded into the approval step. Text 1,383 to 1,159 |
| Plan mode reminder, `blocks/plan-mode/block.ts`, read with `permissions.defaultMode: "plan"` | 46,455 | 46,413 to 46,417 | 38 to 42 | The commit line that read-only covers, and the second `AskUserQuestion` line, cut. Text 1,160 to 1,117, a fall of 43; the plan file's random name moves each reading by a few characters; the built-in reminder it replaces reads 50,205 |

The `autoMode` suite, `src/automode/rules.ts`, is read in the classifier request instead: shorter phrasings of 13 rules take its `system` text from 63,571 to 63,453, a fall of 118, and the suite still scored 120 of 120 on the scripted classifier cases.

The sandbox text stays: no setting shortens it, and the sandbox is kept on (user, 2026-10-31).

Read again on 2026-10-31 with Claude Code `2.1.316`, the shipped first request is 31,213: `system`
5,439, `tools` 13,504 (9), `messages` 11,588. The 24 under 31,237 are the engine's, all in the sandbox
block, and "The Baseline Moved a Third Time" of `docs/surfaces.md` holds the readings. The
`/statusline` label adds nothing: the tree of `0.1.0` reads the same request from a working folder
path of the same length.

With the `agents/main.md` of 2026-11-02, the shipped first request is 27,886 at a working folder path of
34 characters and a checkout path of 47: `system` 5,421, `tools` 10,172 (8), `messages` 11,650. The
sandbox block of `messages` names the plugin folder once by its real path, so each character of the
checkout path adds one: a copy of the tree at `/tmp/` plus 42 characters reads 27,894, since `/tmp`
resolves to `/private/tmp`. With the file moved aside it is
26,591, with a `system` of 3,499, so the file costs 1,936 where an earlier, shorter body saved 72.
The interactive arm reads 41,628: `system` 5,412, `tools` 15,871 (10), `messages` 12,231, `safeguards` 7,457, and
`bun claudekit/context-split/main.ts` sums the parts of the request that `/context` counts as system
prompt to 17,176 characters there, 16,617 for `-p`.

## Empty Session by Owner

Two readings of 2026-10-31, before any cut of `0.3.0`. Each splits what an empty session costs among
the engine, the repository, and claudetto.

`/context all`, in a fresh `tmux` session in this repository, ran `claude --settings FILE` with the
output of `shippedSettings()` of `tools/capture/settings.ts` and the installed `0.2.0` plugin. It
showed 9k of 300k tokens:

| Row | Tokens | Engine | Repository | claudetto |
| --- | --- | --- | --- | --- |
| System prompt | 1.3k | the identity line | none | the `agents/main.md` body, which replaces the default body |
| System tools | 6k | the schemas, and the `AskUserQuestion` text | none | the tool texts of `blocks/tool-describe/texts.ts` |
| MCP server instructions | 36 | none | none | all |
| Custom agents | 289 | none | none | `Artemis` 73, `Hephaestus` 66, `Athena` 63, `Hermes` 61, `main` 26 |
| Memory files | 550 | none | `AGENTS.md` 515, `CLAUDE.local.md` 19, `CLAUDE.md` 16 | none |
| Skills | 786 | none | the seven `openspec-*` skills, about 690 | `dedupe` about 50, `docs` about 20, `setup` under 20 |
| Messages | 10 | all | none | none |

`/context` lists neither the output style, the sandbox block, nor the `context_management` reminder.
The capture holds them, so it gives the claudetto share in characters.
`just capture --shipped --interactive --dump DIR` ran the plain arm at 42,752 characters and the plugin arm at 43,517.
Its working folder is empty, so the repository share there is 0. The claudetto share is the 765 the
plugin arm adds plus the 12,482 characters of engine text it replaces (the default body and eight
tool texts), 13,247 in all. The pieces, in request JSON characters:

| Piece | Where | Characters |
| --- | --- | --- |
| Tool texts | `blocks/tool-describe/texts.ts`, 8 tools | 5,446 |
| Session prompt body | `agents/main.md` | 3,604 |
| Output style | `output-styles/Concise.md` | 1,540 |
| Agent listing | the `description:` of the four subagents | 1,045 |
| `context_management` reminder, with the content-block wrapper it adds | `blocks/handoff/handoff.ts` | 934 |
| Skill listing | the three skill `description:` lines | 343 |
| MCP server instructions | `src/register.ts` | 210 |
| Style reminder, which the engine adds for a plugin output style | the engine | 104 |
| Deferred tool name `mcp__claudetto__setup` | `src/register.ts` | 23 |
| Sum | | 13,249 |

The sum is 2 over the share. In the plugin arm, the write-deny list of the sandbox block names the
plugin folder. The engine cuts that list at a fixed count with "... and N more", so other paths drop
out, and the block comes out 2 characters shorter. The sandbox block itself, 6,856 characters, is in
neither arm's difference, because both arms run the shipped settings. The engine sends it only when
`sandbox.enabled` is `true`, which claudetto's settings set, so all 6,856 are claudetto's.

### After the Cuts of `0.3.0`

`just capture --shipped --interactive --dump DIR` on 2026-11-02 first read the plain arm at 42,061
and the plugin arm at 46,020. The plain arm is 691 below the reading above, from the engine, and its
replaced engine text is still 12,482 characters, so the claudetto share was 3,959 plus 12,482, 16,441
in all. The session prompt had grown to 5,979 and the output style to 1,936 under the rewrite of the
session prompt.

After the cuts below, the same command read the plain arm at 42,061 and the plugin arm at 42,710, so
the claudetto share is 649 plus 12,482, 13,131 in all. That is 116 below the reading above. The
pieces, in request JSON characters:

| Piece | Before `0.3.0` | After | Change |
| --- | --- | --- | --- |
| Tool texts, `blocks/tool-describe/texts.ts`, 8 tools | 5,446 | 3,613 | −1,833 |
| Session prompt body, `agents/main.md` | 3,604 | 5,327 | +1,723 |
| Output style, `output-styles/Concise.md`, with its heading | 1,540 | 1,756 | +216 |
| Agent listing | 1,045 | 551 | −494 |
| `context_management` reminder, with its wrapper | 934 | 942 | +8 |
| MCP server instructions | 210 | 206 | −4 |
| Other pieces | 468 | 736 | +268 |
| Share | 13,247 | 13,131 | −116 |

The "Other pieces" row is the remainder of the share, not a measurement of each piece. It holds the
skill listing, the style reminder, and the two deferred tool names.

Later the same day, after the `AskUserQuestion` text and the move of `ListAgents` behind
`ToolSearch`, the same command read the plain arm at 42,129 and the plugin arm at 39,711. The plugin
arm carries eight tool texts, 3,323 request JSON characters: `Agent` 447, `AskUserQuestion` 838,
`Bash` 877, `Edit` 245, `Read` 287, `Skill` 195, `ToolSearch` 237, and `Write` 197.

The 39,711 by owner, read from the request of `just capture --shipped --interactive --dump DIR` on
2026-11-02. "Settings" is engine text whose size claudetto's settings decide. The output style and
the skill entries are read to about 10 characters, so the claudetto and engine rows are close
figures, and the sum is exact:

| Owner | Characters | Pieces |
| --- | --- | --- |
| claudetto | 12,687 | the `agents/main.md` body 5,285, eight tool texts 3,323, the output style about 1,750, `context_management` 914, the agent entries 720, the MCP instruction 452, the skill entries 243 |
| Settings | 12,481 | the sandbox block 6,675, the `autoMode` text 4,969, the allow and deny rules in `safeguards` 837 |
| Engine | 14,516 | the tool schemas and wrappers 10,639, the rest of `safeguards` 1,651, the rest of `messages` 1,442, the top-level keys 657, the two first `system` blocks 127 |
| Test input | 27 | the user text `hi` |

The sandbox block is not a lever: it is the sandbox itself, as
"The Sandbox Block by Setting" below shows.

`env.CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` drops every `CLAUDE.md` and memory file from the request. For
this repository's 1,904 characters of `CLAUDE.md` and `AGENTS.md` it saved 2,419 characters, about
1.27 request characters per character of memory file, in a capture whose working folder held those
files. It is not a claudetto default, because it also drops the user's and the project's own
instructions.

`/context all` on 2026-11-02, Claude Code `2.1.316`, ran `claude --settings FILE` with the output
of `shippedSettings()` and `--plugin-dir plugins/claudetto`. It showed 11.6k of 300k tokens:

| Row | Before `0.3.0` | After | What moved |
| --- | --- | --- | --- |
| System prompt | 1.3k | 4.4k | the row now counts the injected reminders, see below |
| System tools | 6k | 5.5k | the tool texts |
| MCP server instructions | 36 | 36 | none |
| Custom agents | 289 | 201 | `Artemis` 51, `Athena` 51, `Hephaestus` 43, `Hermes` 30, `main` 26 |
| Memory files | 550 | 742 | `AGENTS.md`, 515 to 707, which is the repository's |
| Skills | 786 | 786 | none |
| Messages | 10 | 10 | none |

The System prompt row cannot be compared across the two readings. The before reading listed neither
the output style, the sandbox block, nor the `context_management` reminder. In the capture of the
same settings, the plugin arm's `system` blocks are 5,412 characters, about 1.35k tokens at 4
characters a token. Its injected reminders are 12,047 characters, about 3.0k tokens: the sandbox
block 6,676, the environment 910, the output style 1,735, the deferred tool names 411, the agent
types 727, the MCP server instructions 669, and `context_management` 919. Their sum, 17,459
characters or about 4.36k tokens, is the row's 4.4k, so this `/context` counts the reminders under
System prompt. The share is measured by
the capture above, in characters, and is 116 below the reading of `0.2.0`.

Each cut keeps every rule:

- A tool text drops a fact that the tool's input schema already states, such as the `timeout`
  ceiling, `replace_all`, `offset` and `limit`, `isolation`, and `args`. It also drops a fact that
  the tool's own output states, such as the kinds of a `ListAgents` row and the error for a missing
  file.
- An agent description drops its "Use for" sentence, which the roster of the `Agent` text already
  gives, and drops a limit that the listing's `(Tools: …)` already shows.
- The reminder points at the fields of the handoff tool in place of listing them, and shows the
  empty layout without blank lines.
- `agents/main.md` and `Concise.md` keep each section and each rule in fewer words. `Concise.md`
  drops the own-defect sentence and the `AskUserQuestion` sentence, because `<fixing_defects>` and
  `<understanding_the_request>` of `agents/main.md` carry them.

### The Sandbox Block by Setting

`just capture --arm plugin --interactive --settings FILE` on 2026-11-02, Claude Code `2.1.316`, with
the shipped settings and one sandbox key removed per run:

| Settings | Total | `tools` | `messages` | Against shipped |
| --- | --- | --- | --- | --- |
| Shipped: `enabled`, `allowUnsandboxedCommands: false`, `filesystem.denyRead` | 46,498 | 18,570 | 13,135 | 0 |
| Without `allowUnsandboxedCommands` | 47,904 | 18,570 | 14,541 | +1,406 |
| Without `filesystem.denyRead` | 46,342 | 18,570 | 12,979 | −156 |
| `enabled` only | 47,748 | 18,570 | 14,385 | +1,250 |
| No `sandbox` key | 38,810 | 17,738 | 6,279 | −7,688 |

The sandbox costs 7,688 characters: 6,856 in the block and 832 in the `Bash` tool text. No key is
cut, and the sandbox stays on:

- `enabled` is the sandbox itself.
- `allowUnsandboxedCommands: false` makes the request 1,406 characters shorter, all of it in
  `messages`. With the key at its default `true`, the engine's sandbox text carries its rules on when
  to set `dangerouslyDisableSandbox: true`. At `false` the engine drops those rules and writes one
  line that says the parameter is disabled in this session.
- `filesystem.denyRead` costs 156, and no other layer enforces it. The gate's `HOME_SECRETS` of
  `src/blocks/gate/paths.ts` reads the command text only, so a script that `Bash` starts can still
  open `~/.ssh`. The sandbox denies that read to every child process.

## History

This section reads the archived tree, which no longer ships. Each reading explains why the current
shape was chosen.

- The archived `agents/main.md` was 11,135 characters on disk, and its body reached the model whole
  as the third `system` block at 10,734 characters, 1.9 times the 5,627 of the default body it
  replaced. It was the largest always-loaded piece, so the rewrite in "Main Prompt" above began there.
- The archived file had 15 tagged sections, and four of them (`<intro>`, `<environment>`,
  `<task_continuity>`, `<user_steps>`) named no behavior they changed and no check that would catch
  their absence, which is the rule "Why Each Always-Loaded Piece Is There" now applies.
- The archived tree sent two skill `description:` lines, `dedupe` and `find-docs`, that named a
  behavior with no check on the trigger. The tree now ships one skill, `dedupe`, with a 151-character
  `description:` line.
- The archived tree had a `Write` tool text of 261 characters against a stock text of 240. Our text
  is kept only while it is shorter than the stock text, so the harness always sent its own and the
  string was dropped, not shortened. `SendMessage` was counted as always loaded until the harness
  page showed it deferred, which took 2,096 bytes out of the total. Neither change altered a request.
