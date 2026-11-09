## ADDED Requirements

### Requirement: One Channel per Question

A question for the person SHALL go only through the popup, and a `- [ ]` item under `## What I Need from You` SHALL hold only a `! <command>` the person must run. The output style, the Stop check, and the `claudetto-you-should-know` agent SHALL agree on this, so one question reaches the person once.

#### Scenario: A Question Written as an Item

- **WHEN** a reply holds `- [ ] Say "add them" and I'll write items 11 to 13`
- **THEN** the Stop block says to ask it through the popup and to drop the item, and the resend shows the popup only

#### Scenario: One Question, One Prompt

- **WHEN** the agent asks one question through the popup
- **THEN** no checklist item and no side-agent nudge repeats it

### Requirement: One Command at a Time

A reply SHALL hold at most one `- [ ] ! <command>` item, the one the work needs first, and the next SHALL come in a later reply after the person has run it, because the person's `!` runs and messages queue while the agent works (the person, 2026-11-09). `output-styles/Concise.md` SHALL say so.

#### Scenario: Several Commands Only the Person Can Run

- **WHEN** the work needs three commands only the person can run
- **THEN** the reply lists the first as its one `- [ ] ! <command>` item, and the next reply, after the person's run, lists the second

### Requirement: Text Between Tool Calls Holds a Finding

`output-styles/Concise.md:7` SHALL tell the model to open with the outcome or the deciding fact, and to put a finding, a result, or an error in the text between tool calls, because the next call shows itself. When the user disputes the last reply, the style SHALL tell it to open with the check that decided it and the fact it kept, or to say the reply was wrong and give the corrected fact, in place of agreement, praise, apology, or a promise.

#### Scenario: Narration between Calls

- **WHEN** a turn holds the text "Now I will read the file" before a `Read` call
- **THEN** the text breaks the rule, and "The hook has no retry; `hooks/gate.ts:234` registers one check." passes

### Requirement: Low-Risk Work Starts at Once

`output-styles/Concise.md:11` SHALL tell the model to start the work at once, and on a low-risk reversible step to state the reasonable reading and go on. A question or a request to check SHALL be answered with a finding and a proposed fix. The model SHALL change a file only for a change the user asked for in this conversation that is not yet done.

#### Scenario: A Question

- **WHEN** the user asks "why does the check fail?"
- **THEN** the reply reports the finding and proposes the fix, and edits no file

### Requirement: A Message to an Agent Holds Task, Inputs, and Done-Check

`output-styles/Concise.md:15` SHALL tell the model that a message to an agent (an `Agent` prompt or a `SendMessage`) holds only the task, the inputs the agent lacks, and the done-check, with no greeting, thanks, or context the agent can read. The model SHALL send one message per agent, and a follow-up only when the report leaves the task undone. A reply to a person SHALL be plain English a non-expert can follow, with each code item in backticks and cited as `file:line`.

#### Scenario: A Greeting in an Agent Prompt

- **WHEN** an `Agent` prompt opens with "Hi, thanks for helping"
- **THEN** the prompt breaks the rule

### Requirement: Working Is Called Only After a Check Ran

`output-styles/Concise.md:19` SHALL tell the model to call a piece working only after its check ran this session, with the command and output, and to mark the rest proposed. It SHALL report each experiment and its result, keep every failure, skipped step, workaround, and error text, and source each number or mark it unmeasured. It SHALL answer a request for detail in full.

#### Scenario: An Unrun Check

- **WHEN** the model changed code and ran no test
- **THEN** the reply marks the change proposed, and does not call it working

### Requirement: A Rule Edit Updates the Docs It Makes Old

`rules/noUnrequestedEdits.md:6` SHALL tell the model to change only the lines the task names, to update the docs that describe the old behavior, and to ask before any other code edit, because unrequested work costs a review and a revert.

#### Scenario: A Behavior Change

- **WHEN** a task changes a behavior that `README.md` describes
- **THEN** the diff updates that `README.md` text, and edits no other code the task did not name

### Requirement: Each Rule File Applies to Every Path

Each file under `plugins/claudetto/rules/` SHALL hold frontmatter `paths: ["**/*"]` and one rule sentence. The shipped files SHALL be `noImpossibleStateGuards.md`, `noNarratingComments.md`, `noUnrequestedEdits.md`, `useEdgeCaseReport.md`, and `useLeastCode.md`. Setup SHALL copy each to `~/.claude/rules/claudetto/<name>.md` on the user's answer.

#### Scenario: A Rule File

- **WHEN** any file under `plugins/claudetto/rules/` is read
- **THEN** its frontmatter holds `paths` with `**/*`, and its body is one sentence

### Requirement: Each Agent Has a Body and a Model

The agents under `plugins/claudetto/agents/` SHALL each hold a plain body of two paragraphs. Artemis and Metis SHALL set `model: claude-sonnet-5-5` and `tools: Read, Grep, Glob`. Heracles SHALL set no `model` and no `tools`.

#### Scenario: Agent Reports

- **WHEN** the three bodies are read
- **THEN** Artemis ends with one `path:line` and excerpt per finding, Metis returns steps, files, risks, and the check command, and Heracles ends with what it did, what it checked and the result, and what is left

#### Scenario: Read-Only Agents

- **WHEN** the frontmatter of Artemis and Metis is read
- **THEN** each holds `tools: Read, Grep, Glob` and `model: claude-sonnet-5-5`

#### Scenario: Heracles

- **WHEN** the frontmatter of Heracles is read
- **THEN** it holds no `model` and no `tools`

## MODIFIED Requirements

### Requirement: Code Rules Guard Only Trust Boundaries

The code rules, one file each under `plugins/claudetto/rules/`, SHALL tell the model to write the least code that does the whole task, in the style of the code around it (`useLeastCode.md`). The model SHALL rely on what the types, structures, and validated boundaries already guarantee, and guard only where input crosses a trust boundary (`noImpossibleStateGuards.md`). The report SHALL name the edge cases that the change handles (`useEdgeCaseReport.md`). A comment SHALL say why the code is the way it is, never what it does (`noNarratingComments.md`).

#### Scenario: Impossible State

- **WHEN** an eval case has a function whose type already rules out `null`
- **THEN** the passing diff adds no `null` check, and a diff that adds one fails

#### Scenario: Comment That Restates the Code

- **WHEN** a diff adds `// loop over the rows` above a `for`
- **THEN** the passing reply drops it, and a reply that keeps it fails

### Requirement: Comments State a Reason

The rule file `rules/noNarratingComments.md` SHALL allow a comment only for a reason the code cannot show, and SHALL NOT allow a comment that narrates what the code does or who reads it.

#### Scenario: Narrating Comment

- **WHEN** an eval case's diff adds "This function reads the file and returns its lines" above a function
- **THEN** the case fails

### Requirement: The Output Style Names the Sentence Form to Use

The output style SHALL name the sentence form to use: the actor is the subject, with its own verb, and each clause is spelled out, so a reply can be checked against it. Each rule of `output-styles/*.md` SHALL lead with what to do. A negation word (`not`, `no`) MAY appear only inside a sentence that names the act, to bound it, as in "Change a file only for a change the user asked for ... that is not yet done" (`Concise.md:11`) and "with no greeting, thanks, or context it can read" (`Concise.md:15`). A rule SHALL NOT be a bare prohibition with `never`, `don't`, `do not`, `without`, `avoid`, `nothing`, `none`, or `nor`.

#### Scenario: Animate Verb

- **WHEN** an eval case's reply says "The check surfaces a gap that the plan wants to address"
- **THEN** the case fails, and "The check shows a gap. Task 4.3 fixes it." passes

#### Scenario: A Bound inside an Action

- **WHEN** `Concise.md` holds "with no greeting" inside a sentence that names the message's content
- **THEN** the rule is kept, and a line that only says "never greet" fails
