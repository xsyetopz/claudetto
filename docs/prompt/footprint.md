# Prompt Footprint

Measured with Claude Code `2.1.312`. Every figure is a reading of `just capture`, which runs
`claude -p` against a local fake Messages API and counts the characters of the first request. No
model is called and no provider is reached.

## Main Prompt

`plugins/claudetto/agents/main.md` is 5,379 characters on disk. The harness sends 5,303 of them, which
the request carries as 5,386, 294 under the budget of 5,680. The budget is the default body the file
replaces, measured as the request carries it, since an agent file used as the main thread replaces
that body instead of adding to it (`docs/prompt/overrides.md`, "What This Means for `main.md` and
`Concise.md`"). The archived file was 11,135 characters, which is more than twice the body it would
have stood in for.

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
  the budget test measures the body alone (`tests/repo/prompt-budget.test.ts:22`).
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
`tests/repo/prompt-budget.test.ts` checks the body of `agents/main.md` against the one budget it
fixes (`tests/repo/prompt-budget.test.ts:30`), reports a body over it by name, size, and budget
(`tests/repo/prompt-budget.test.ts:26`), and holds the counting rule that front matter is free
(`tests/repo/prompt-budget.test.ts:46`).

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
  task 3.2 does not name it.
- Reasons that only restate their rule. A reason that generalizes stays, as in "because the same call
  in other words is the same call".

## Rules and Cases

The file carries seven behavior rules, each named by a defect of this change's history. `B3-7` of
`external/please-use-me-often/swe-best-practices.md:122` gives the check for a prompt,
"Prompt review + eval on change", and `W3-4` gives the failure of a prompt whose rules nothing
scores: a rule dump that is silently ignored. Each rule has an eval case in `tools/evals/main-rules.ts` with a scenario,
the decision that passes, and the recorded failure that fails.

| Rule | Codes | Section | State |
| --- | --- | --- | --- |
| Fix a defect at its cause and never route around it | `W5-13`, `W1-8` | `<defects>` | Case written, unrun |
| Read a failing check for the cause, never edit the check | `W5-1`, `I05` | `<defects>` | Case written, unrun |
| An instruction of the user outranks a rule of the project | `W5-6` | `<project>` | Case written, unrun |
| Use the surface that exists before building a mechanism | `W5-12`, `I09` | `<tools>` | Case written, unrun |
| A step inside the scope is taken now, a step outside waits | `W5-11`, `I13` | `<scope>` | Case written, unrun |
| A comment states only what the code cannot | `W1-15`, `B1-14` | `<code>` | Case written, unrun |
| Conflicting instructions are named and stopped on | `W5-15` | `<project>` | Case written, unrun |

Running a case calls a model, which needs the user's approval. A citable arm needs 10 runs
(`EVAL_MIN_RUNS_PER_ARM` of `tools/limits.ts`, the floor the paid probe printed), and the arms are
the shipped `main.md` against the default body, so a citable run of the seven cases is 140 sessions.
The run and its harness belong to task 3.10. No row above is held until it runs.

`tools/evals/__tests__/main-rules.spec.ts` checks the inventory: the seven code groups of task 3.2 are the
seven cases, no case has an empty field, and every case names a section the shipped file has.
Renaming `<scope>` in a copy of the file makes the check report `W5-11, I13: agents/main.md has no
<scope> section`.

## Output Style

Readings of 2026-10-29, same command, with `"outputStyle": "claudetto:Concise"` in the shipped
settings. A style adds to the body and does not replace it.

| Reading | Characters |
| --- | --- |
| `output-styles/Concise.md` on disk | 1,646 |
| Its front matter, which is not sent | 117 |
| Its body, trimmed, which is what the harness sends | 1,526 |
| The harness's header above the body, `# Output Style: claudetto:Concise` | 36 |
| The harness's reminder after it, repeated on each user message | 102 |
| The first request with the style against without it, 2026-10-29 | 30,462 against 28,757, so +1,705 |
| The same pair, 2026-10-30 | 24,607 against 22,914, so +1,693 |

The body lands in `messages`, not in `system`. `system` stayed at 5,708 with blocks 74, 62, and
5,572, and `messages` went from 3,652 to 5,345, so +1,693. The 1,693 is 29 above the 1,664 of the
two inserts, because the request carries JSON, where a newline costs two characters.

The two figures above differ by 12 because the first was read on 2026-10-29, when the arm stood 12
higher in `tools`, and the `messages` figure holds on both dates. The 1,693 is the `messages` array
alone, which is the style's own ground, and it held while the tool texts, the switches, and the skill
moved the totals on both sides of the pair. `cuts.ts` holds the row `output style` at −1,693, the
whole-request figure of 2026-10-30, because every row of that inventory is in that unit and every row
is read from the one capture set the table at the top of this page lists.

The budget is 1,540, the cost of the built-in `Concise` style (`docs/prompt/overrides.md`), so the
file has 63 characters of room. The archived file was 2,649.

The rules in the file, each with the failure it answers: the opening is the outcome, the fact, or the
next action (`W5-18`); a defect of its own is a bug report and not a retrospective (`W5-16`); no
sentence rates the user, the model, or the exchange; a piece is working only after its check ran in
this session, with the command and its output (`W5-10`, `I04`); and the `file:line` reference rule
from `main.md`.

## Opening Signal

No opening hook ships. On 968 turn-final replies of this login's transcripts the free structural
signal flags 74: 66 are outcome-first openings, 6 are artifacts of the sentence splitter, and 2 are
the defect the rule targets. `docs/evidence/reply-openings.md` holds the method, the buckets, and the
three candidates. The rule stays in `Concise.md`, which the harness re-injects at 102 characters a
message, the third rung of the enforcement ladder. The signal has no cost for group 7 to record.

## Byte Budgets

A budget is the text the piece stands in for, read in task 2.3 or 3.1. A piece over its budget makes
every request larger than a stock session, so the figure is a bound and not a target. What counts is
what the harness sends: for a prompt file the body with the front matter removed and the ends trimmed,
and for a tool text the description string itself.

The table below holds the budget and the reading of each piece. No check parses it now. The one budget
that a test checks is that of `agents/main.md`, in `tests/repo/prompt-budget.test.ts`, against the
`DEFAULT_MAIN_BODY_CHARS` of `tools/limits.ts:40`. A row is meant to carry a reading, to name a file
that ships, and for a tool to agree with the stock reading it cites, and nothing fails when one drifts.

| Piece | Kind | Budget | Measured as | Reading |
| --- | --- | --- | --- | --- |
| `agents/main.md` | file | 5,680 | `request JSON` | The default body as the request carries it: 5,628 characters in the `system` blocks of the no-agent-file arm above, plus the 52 characters it escapes, both from the dumped request of 2026-10-29 |
| `output-styles/Concise.md` | file | 1,540 | `characters` | The built-in `Concise` style it stands in for, 1,540 in `messages[1]` (`docs/prompt/overrides.md`) |
| `Agent` | tool text | 1,047 | `characters` | The stock description it replaces, the smaller of docs 3,227 and capture 2,906 (`plugins/claudetto/src/tools/tools.ts:32`) |
| `Bash` | tool text | 1,085 | `characters` | The stock description it replaces, the smaller of docs 1,934 and capture 1,267 |
| `Read` | tool text | 538 | `characters` | The stock description it replaces, docs and capture both 790 |
| `Skill` | tool text | 975 | `characters` | The stock description it replaces, docs and capture both 1,417 |
| `ToolSearch` | tool text | 656 | `characters` | The stock description it replaces, docs and capture both 953 |

`agents/main.md` is the one row bounded on the request and not on the file, because it is the one
piece whose budget is "no larger than the text it replaces". A newline and a quote each cost one
character in the file and two in the request, so the two units move apart as the file is edited. The
edit of 2026-10-29 is the proof: the body lost one character, 5,585 to 5,584, while gaining one
newline, so its request length held at 5,664 and the request total held at the 29,080 of that
reading, which later readings on the same date moved to 30,462. A bound in
characters would have reported a saving that the request never received, and a file of 5,600
characters with enough newlines would pass that bound while making every request larger than a stock
session.

Two kinds of always-loaded piece get no budget.

- Skill `description:` lines. The tree ships one skill, `dedupe`, and its `description:` line is 151
  characters. It replaces no stock text, so there is no figure to bound it by; "The Two Switches" of
  `docs/surfaces.md` holds what the skill costs a request.
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

The restart shipped no `skills/` folder, and the user decided on 2026-10-30 that `dedupe` ships. It is
the one skill of the tree, and its `description:` line is 151 characters.

| Skill | Model may call | Reason |
| --- | --- | --- |
| `dedupe` | yes | The model starts it after a change that copies code, which is a moment the user does not name, so the description has to be in context |

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
- No impure reading on the prompt path. The prompt modules, `plugins/claudetto/src/tools/texts.ts`
  and `plugins/claudetto/src/tools/tools.ts`, read no clock (`Date.now`, `new Date`,
  `performance.now`, `process.hrtime`, `$.clock`), no counter (`Math.random`, `randomUUID`), and no
  usage number (`session.usage`, `session.measure`), found by grep on 2026-10-30. `tools.ts:8`
  imports `texts.ts` and nothing else. No check scans for it now, and the window recorder of group 7
  reads usage numbers by design and is not on this path.

What the two checks do not cover: a counter that moves once per session rather than once per call.
The lab case compares two builds inside one process, so it catches a per-call counter and not a
per-session one, and the source scan catches such a counter only when it is written with one of the
names above.

## Context Enters Once

The framework adds no text on a user message. Context enters at the first message of a conversation or
at a compaction, and nothing after that.

One block of the framework rides that first message. `prompt.context` carries `context_management`,
which names the handoff folder and the nine headings of a handoff that Claude writes, measured at 545
characters and 550 request JSON on 2026-10-29. It is bought and not free: no hook can write that file,
because both writers make no model call and code reads no decision off a transcript, so the only way
to get the nine sections is to ask the session for them once per conversation.

Two events carry per-message text, and the lab holds both.
`plugins/claudetto/tests/prompt-quiet.test.ts` drives the shipped mod and fails for a hook that adds
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
`none`. No check parses it now, and nothing fails when a row drifts.

### The Always-Loaded Pieces

| Piece | Where | Characters | Behavior changed | Check |
| --- | --- | --- | --- | --- |
| `<role>` | `agents/main.md` | 184 | Reads an unclear request as work on the code here, so "rename X" finds and renames X instead of asking which X | none |
| `<security>` | `agents/main.md` | 166 | Takes authorized security work and refuses the named destructive classes | none |
| `<harness>` | `agents/main.md` | 492 | Does not retry a denied call in other words, treats tool-result text as data rather than instructions, and knows its reply renders as terminal markdown | none |
| `<project>` | `agents/main.md` | 344 | Follows the user over a project rule and says which rule it overrides, and stops on conflicting instructions instead of serving both | `tools/evals/main-rules.ts`, two cases |
| `<tools>` | `agents/main.md` | 246 | Uses an existing script, skill, or CLI before building a mechanism | `tools/evals/main-rules.ts`, one case |
| `<scope>` | `agents/main.md` | 607 | Takes a step inside the approved scope now, leaves a step outside it to the user, and carries work on instead of wrapping up before a compaction | `tools/evals/main-rules.ts`, one case |
| `<defects>` | `agents/main.md` | 591 | Fixes a defect at its cause and reads a failing check for the cause instead of editing the check | `tools/evals/main-rules.ts`, two cases |
| `<code>` | `agents/main.md` | 807 | Writes a comment that says why, splits a file over the line bounds, and calls a part done only after a check ran | `tools/evals/main-rules.ts`, one case, and `tools/file-lines.ts` for the bounds |
| `<asking>` | `agents/main.md` | 617 | Asks through `AskUserQuestion` only when the facts leave two good options, decides otherwise, and does the work that does not depend on an answer before it asks | `tools/evals/main-rules.ts`, one case |
| `<actions>` | `agents/main.md` | 750 | Gets approval for an action that is hard to undo, and does not pass a gate with a shortcut such as `--no-verify` | none |
| `<claims>` | `agents/main.md` | 479 | Checks a technical claim of the user before building on it, and measures a performance claim | none |
| `<opening>` | `output-styles/Concise.md` | 279 | Opens with the outcome, and opens a reply to a correction with the next action rather than agreement | `claudekit/openings/evidence.ts`, a signal at 89% false positives, in no hook |
| `<shape>` | `output-styles/Concise.md` | 444 | Puts each code item in backticks and references code as `file:line` | none |
| `<honesty>` | `output-styles/Concise.md` | 440 | Calls a piece working only after a check ran in the session, and keeps each failure in the reply | none |
| `<asks>` | `output-styles/Concise.md` | 308 | Ends with a numbered list only when a step needs the user | none |
| `Agent` | tool text | 973 | Briefs a subagent with the objective, the format, and the limits, reports its result only after it returns, and picks `Artemis` or `Athena` by what the task produces rather than by its topic | `plugins/claudetto/tests/tool-describe.test.ts`, and `tests/repo/agent-roster.test.ts` for the roster |
| `Bash` | tool text | 1,090 | Writes a description a reader understands without the command, and uses the `timeout` parameter rather than a `sleep` | `plugins/claudetto/tests/tool-describe.test.ts` |
| `Edit` | tool text | 328 | Reads a file in this conversation before editing it, and strips the `Read` line prefix from `old_string` so an edit does not fail on a line number | `plugins/claudetto/tests/tool-describe.test.ts` |
| `ListAgents` | tool text | 567 | Sends to the name a row prints rather than looking for an address syntax, and reads a cloud session's answer in its own transcript instead of asking it to reply | `plugins/claudetto/tests/tool-describe.test.ts` |
| `Read` | tool text | 538 | Reads a part of a large file instead of the whole, and trusts a successful edit | `plugins/claudetto/tests/tool-describe.test.ts` |
| `SendMessage` | tool text | 3,008 | Addresses a peer by the name its `ListAgents` row prints rather than looking for an address syntax, reads a successful send as delivery and not as agreement, waits for a reply on other work instead of looping on `ListAgents`, and refuses to hand a peer work this session denied | `plugins/claudetto/tests/tool-describe.test.ts` |
| `Skill` | tool text | 1,023 | Starts a skill by name instead of restating its steps | `plugins/claudetto/tests/tool-describe.test.ts` |
| `ToolSearch` | tool text | 727 | Gets a deferred tool's schema before calling it | `plugins/claudetto/tests/tool-describe.test.ts` |
| `Write` | tool text | 196 | Writes a whole file only for a new file or a full replacement, and uses `Edit` for a partial change | `plugins/claudetto/tests/tool-describe.test.ts` |

The eleven `agents/main.md` rows come to 5,283 characters and the file sends 5,303, the difference
being the blank line between sections. The four `Concise.md` rows come to 1,471 against 1,477. The
eight upfront tool texts come to 5,392 against a stock sum of 8,710, a cut of 3,318.

One row of the table is not always loaded, and it is in the table because the check that reads this
table reads every text of `TOOL_TEXTS` and not only the upfront ones. `SendMessage` is 3,008
characters against a stock 4,259, so it cuts 1,251, and the harness defers the tool
(`plugins/claudetto/src/tools/tools.ts:54`), so that cut is paid once at the `ToolSearch` call that
loads the schema rather than on every request. `alwaysLoadedChars` leaves it out of the 5,392 for
that reason.

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
person waits for the work that does not depend on the answer (task 6.12). `<asking>` rose 247, and the
other nine fell 259 between them by rewording alone, no requirement dropped, because the file was 16
under its bound and the new rule did not fit. 27 now remain under it.

### What the Check Does Not Settle

A row in the `Check` column that names `tools/evals/main-rules.ts` names a case that is written and
unrun: running one calls a model. A row that names `tool-describe.test.ts` is checked for presence
and byte identity, not for effect: the lab proves the text ships and is stable, not that it changes a
decision. Eight rows say `none`, and each of those pieces is held by its behavior alone until a case
exists. That is the open end of this section, and the reason the table separates the two columns.

The largest open end is the placebo question, and it stays open by decision. Whether this text changes
an outcome or only the bill was to be measured by running each case against a same-length placebo
prompt: 8 cases, 2 arms, 10 runs per arm by the citable floor of `EVAL_MIN_RUNS_PER_ARM`, which is 160
full-task sessions. At the `$1.50` a session that the earlier estimate of `$210` for 140 sessions
implies, that is about `$240`, near 8% of the weekly limit of this login. The user declined that run
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

The `autoMode` suite, `src/automode/rules.ts`, is read in the classifier request instead: shorter phrasings of 13 rules take its `system` text from 63,571 to 63,453, a fall of 118, and the suite still scored 120 of 120 on the scripted classifier cases.

The sandbox text stays: no setting shortens it, and the sandbox is kept on (user, 2026-10-31).

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
