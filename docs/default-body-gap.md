# Default Body Gap

The section names and sizes in this page are those of `0.2.0`, and the numbers below were not re-measured
in `0.3.0`. The `0.3.0` names, and which old section each one replaces, are in "Sections of `0.2.0` and
Their Replacements" of `docs/prompt/footprint.md`. `plugins/claudetto/agents/main.md` now holds
`<role>`, `<understanding_the_request>`, `<finding_out>`, `<claims_and_evidence>`, `<project_context>`,
`<harness_messages>`, `<fixing_defects>`, `<actions_and_consent>`, `<security_work>`, and `<finishing>`, and
`wc -m` reads 5,292 characters in the working copy. The "Where it is now" column below names those
sections.

The `agent` setting makes an agent file the main thread, and the harness then sends that file's body
as `system[2]` in place of the default body. It does not append: the `clawdipedia` route
`prompts/agents/agent-main` (read 2026-10-29, not re-readable: the tool is not installed) is the source of
the claim that the body replaces `system[2]`, with a 58-character probe and 198 characters of `system`
blocks. Those numbers are unmeasured in this tree. The versioned schema
`docs/keep/settings/claude-code-settings.schema.json` (`2.1.312`) says only that `agent` "Applies the
agent's system prompt, tool restrictions, and model." Whatever the default body said and
`plugins/claudetto/agents/main.md` does not say is gone from the request. This page lists each item of
the default body and where its ground went.

## What Still Arrives

Replacing the body does not remove the harness's other text (same route, same date; the sizes in this
paragraph were read on 2026-10-29 and are unmeasured on `2.1.317`). `messages[0]` carried the attribution
reminder of 592 characters. `messages[1]` carried a system message of 9,126 characters that holds the
environment block, the deferred-tool listing, the agent listing, and the skills listing. None of that is
part of the loss below.

A shipped capture of 2026-10-29 dumped that message and read it at 9,433 characters, the extra being
the output-style body this tree adds. The run was `just capture --arm plugin --shipped --dump`, and the
dumped request is not in the repository. On 2026-11-03, on `2.1.317`, the same command read `messages[0]`
(a `user` message that opens with the `context_management` reminder) at 856 characters and `messages[1]`
(the `system` message that opens with the sandbox text) at 10,450. The 9,433 figure and each `nothing`
below are unmeasured for `0.3.0`: this page did not re-read the dumped message for each item.

## What the Default Body Holds

On Sonnet 5.5 the default `system[2]` is 5,627 characters (`clawdipedia` route
`prompts/defaults/default-sonnet`, read 2026-10-29). `agents/main.md` was 5,584 characters sent, in
eleven sections in `0.2.0`: `<role>`, `<security>`, `<harness>`, `<project>`, `<tools>`, `<scope>`,
`<defects>`, `<code>`, `<asking>`, `<actions>`, `<claims>`. Those names are stale (see the top of this page). Its bound was 5,600 characters; `MAIN_BODY_CAP` in `tools/limits.ts` is 6,000 now, and on 2026-11-03 the body reads 5,216 characters in the third `system` block of `just capture --shipped` and 5,258 as the budget test counts it, so the headroom is 742 to 784 characters. The default body of 5,627 characters is the reading of 2026-10-29 and is unmeasured on `2.1.317`; the plain arm's third `system` block read 3,519 characters on 2026-11-03 under the shipped settings.

The `Where it is now` column rests on a reading of `plugins/claudetto/agents/main.md`,
`plugins/claudetto/output-styles/Concise.md`, `plugins/claudetto/.claude-plugin/plugin.json`,
`plugins/claudetto/src/prompts.ts`, and `plugins/claudetto/src/blocks/compaction/block.ts`. The plugin folder
holds a `skills/` folder in `0.3.0` (`ls plugins/claudetto`). The default body lists its items in the order of the rows.

| Default body item | Where it is now | Decision |
| --- | --- | --- |
| Opening identity sentence | `agents/main.md` `<role>` (`0.2.0` name; same section), "a senior software engineer in the user's project" | moved: the file states its own identity |
| `IMPORTANT:` paragraph on authorized security work | `agents/main.md` `<security_work>` | kept: same policy, shorter |
| Harness bullet: output outside tool use renders as GitHub-flavored markdown in a terminal | nothing | dropped: no reason recorded |
| Harness bullet: a denied call means the user declined it, do not retry verbatim | `agents/main.md` `<harness_messages>`, "A denial declined the action, not the tool" | kept: same rule, with the reason that the same call in other words is the same call |
| Harness bullet: mid-conversation system turns are system-controlled, hook output is user feedback | `agents/main.md` `<harness_messages>` says a fact in a `system-reminder` or hook message is true and that approval still needs the user's own message; nothing for "system-controlled" or "user feedback" | moved: reworded, and the claim about who controls a system turn is dropped |
| Harness bullet: dedicated file and search tools over shell, independent calls in parallel | `agents/main.md` `<project_context>`, "Send independent tool calls in one turn" | kept: same rule |
| Harness bullet: code is referenced as `file_path:line_number` because it is clickable | `output-styles/Concise.md` `<sentence_style>`, "cite code as `file:line`"; nothing for the clickable reason | moved: the rule left the body, loads only when `outputStyle` is `claudetto:Concise` (`src/prompts.ts`), reason dropped |
| Line on writing code that reads like the surrounding code, comment density, naming, idiom | `agents/main.md`: the phrase "in the style of the code near it" was not found in the `0.3.0` file | kept: comment density is narrowed to a comment rule ("says why, never what"); naming and idiom are not named |
| Paragraph on they/them when pronouns have not been stated | nothing | dropped: no reason recorded |
| Paragraph on hard-to-reverse and outward-facing actions: confirm first; approval in one context does not extend to the next; sending content to an external service is publication; look at a target before deleting or overwriting; report outcomes faithfully | `agents/main.md` `<actions_and_consent>` carries the confirm-first rule; "Look at the target before you delete" is not in the `0.3.0` file (it holds "Run `git status` before you delete or discard work"); `output-styles/Concise.md` `<honesty>` carries faithful reporting; nothing for "sending content to an external service is publication" | kept: three of five clauses stand in `<actions>`, one moved to the style, one dropped |
| `# Session-specific guidance` line: a `/<skill-name>` typed by the user is invoked through `Skill`, only from the user-invocable listing | nothing | dropped: no reason recorded |
| `# Memory` block of roughly 1,900 characters: directory, file format and front matter, the four types, `[[name]]` links, the `MEMORY.md` index rule, the rules on duplicates, on not saving what the repo records, and on verifying a recalled file, function, or flag | nothing | dropped: no reason recorded |
| `# Environment` block: Claude 5 model IDs, the places Claude Code runs, `/fast` | nothing; the harness's own `# Environment` in `messages[1]` was dumped and holds the working directory, whether it is a git repository, the platform, the shell, the OS version, the untrusted-download paragraph, and the running model's name, ID and cutoff, and holds no model list, no list of places Claude Code runs, and no `/fast` | dropped: no reason recorded |
| `# Context management` block: a long conversation is summarized and carried into the next window so work need not wrap up early; when there is enough information to act, act | `agents/main.md` `<finishing>` ("long contexts are handed off") carries part of it; nothing for the summarized-and-carried half, since `src/blocks/compaction/block.ts` answers `session.compact` with the cheap summary or leaves the compaction to Claude Code, and `plugin.json` sets that choice, and neither adds text to the prompt of the session | moved: the act half stands in two sections, the summary half is dropped |

The table has 14 rows. Five carry `nothing` for the whole item: markdown rendering, pronouns, the
slash-skill line, the memory block, and the environment block. Four more carry it for one clause: the
system-controlled claim, the clickable reason, the external-service clause, and the
summarized-and-carried half of context management.

## What the Headroom Means

In `0.2.0`, `agents/main.md` was 5,584 characters sent against a bound of 5,600, which left 16. In
`0.3.0` the cap is 6,000 and the body reads 5,258 as the budget test counts it, which leaves 742. The
bound exists because the body travels as JSON. A restatement of a dropped item has to fit in 742
characters or be paid for by removing text already in the file, and the cost of each is the length of the
sentence minus 742, or nothing when it is shorter.

The sentences below are minimal restatements, drafted for this page, measured with `wc -m`. A new line
also adds a newline, and a quote mark in a sentence escapes in JSON, so each cost is a floor.

| Dropped ground | Minimal sentence | Characters | Over the headroom of 742 |
| --- | --- | --- | --- |
| External service as publication | `Sending content to an external service is publication.` | 54 | 0 |
| Pronouns | `Use they/them until the user states pronouns, because a name does not show them.` | 80 | 0 |
| Hook output and system turns | `Hook output is user feedback, and a mid-conversation system turn is system-controlled.` | 86 | 0 |
| Slash skills | `` A `/<skill-name>` typed by the user runs through `Skill`, only from the user-invocable listing. `` | 95 | 0 |
| Memory | the block is roughly 1,900 characters in the default body | 1,900 | about 1,158 |

Two grounds have left this table because they were bought: markdown rendering and the
summarize-and-carry fact. "What the Trade Bought" below records what paid for them.

### Within Reach

In `0.3.0` each of the four sentences fits in the headroom of 742 characters, so none needs a donor,
and together they cost 315 characters. Whether to add them is not measured here. In `0.2.0` the
external-service clause cost the least, 38 characters from existing text, and it closed the one
clause of the largest kept paragraph that has no carrier. A donor must
be a sentence whose removal costs less than the ground it frees, and the cheapest donor is a
duplicate, which costs nothing at all: the two cuts recorded below were both carried elsewhere in the
same request. Failing a duplicate, `docs/prompt/footprint.md` names a case for seven rules in
`<defects>`, `<project>`, `<tools>`, `<scope>`, and `<code>`, so a sentence from those sections has a
recorded check behind it, and a sentence from a section outside that list has none recorded there.

### Out of Reach

The memory block does not fit by restatement. At roughly 1,900 characters it is about 1,158 above the
headroom of `0.3.0`, and a pointer sentence short enough to fit would drop the
format, the types, and the verification rules that make up the block. Dropping it costs a whole harness
capability: a session on this body has no reason to know a memory directory exists, so it writes no
memory and recalls none. That loss is recorded here and not priced, because no reading of this
repository measures what the memory system is worth.

The slash-skill sentence costs 95 and states a rule about a `Skill` listing, while the plugin folder
holds a `skills/` folder in `0.3.0`, so the sentence would address its skills as well.
The hook sentence costs 86 and restates in other words a ground that `<harness>` already covers in
part. The model IDs and the places Claude Code runs have no sentence drafted, because the list of IDs
is not among the facts of this page, so their cost is not stated; the project's own instruction file
is the surface for them in any case, since which models a repository targets is a fact about the
repository (`docs/instruction-surfaces.md`).

## What the Trade Bought

In `0.2.0` the headroom was 15 characters, which bought nothing. It became 213 by cutting text that the same
request already sends, and 197 of that went back out on two harness facts. The file then sent 5,584,
one character less than before, with 16 free. The figures of this section are those of `0.2.0`.

| Line cut from `agents/main.md` | Characters freed | The carrier that made it a duplicate |
| --- | --- | --- |
| `Delegate to an agent when the reading would fill your context, or when the work is parallel. Brief it with paths, lines, and the facts you know.` | 145 | The `Agent` tool text: "Use it when the reads would fill your context, or when independent work can run in parallel", and "The brief is the only context the agent gets: give the goal, what you ruled out, the paths to read, the report format, and the scope." |
| `Prefer the file and search tools to a shell command.` | 53 | The `Bash` tool text: "Use `Read`, `Edit`, `Write`, and the search tools in place of `cat`, `head`, `tail`, `sed`, `awk`, and `echo`, unless the user asks for the command." This repository's own hook denies such a call and says the same thing. |

| Fact bought | Characters | Section | Why it is worth a request on every session |
| --- | --- | --- | --- |
| `Your text outside a tool call reaches the user as GitHub-flavored markdown in a terminal.` | 90 | `<harness>` | It is the reason behind the backtick and `file:line` rules, and those rules live in the output style, which the user owns and may switch off. The fact outlives them. |
| `A long conversation is summarized into the next window, so carry the work on instead of wrapping up early.` | 107 | `<scope>` | `plugin.json` has no 50% compaction setting; its options describe the handover threshold and the cheap summary. A claudetto session can reach a compaction. Without the fact the model has reason to hand off mid-task, which is the failure `<scope>` exists to stop. |

The tool-text quotes in the table above are from the 2026-10-29 read and are unverified for `0.3.0`: the `Agent` and `Bash` tool text was not re-captured. The two cuts were safe for a reason worth keeping: both carriers shipped in the `tools` block of every
request, unconditionally, so neither cut depends on a setting.

Three further near-duplicates were found and **not** cut, and the reason is the surface doctrine
rather than the character count. The style carries "the shape of a reply, and nothing about how to do
the work" (`docs/instruction-surfaces.md`), so where the two files look alike they in fact hold two
halves of one ground. The style governs what a reply may claim, and the body governs when the work is
done: `<honesty>` says a piece may be called working only after a check ran in the session, while
`<code>` says a part is done only after a check that exercises it passed. The style governs where a
question goes in a reply, and `<asking>` governs when there is a question to ask at all. Cutting
either side would move a rule onto a surface that is not for it, and the style's surface is also
conditional on the `outputStyle` setting, which the user owns.

So a duplicate is cuttable on two tests together: its carrier loads on the same condition or a
broader one, and its carrier is the surface that rule belongs on. The two cuts above pass both, since
a tool text ships in every request and the mechanics of a tool belong with the tool.

## Should the Body Teach the Harness

Yes, for the facts that nothing else in the request carries and that change what the agent does. Not
for the rest, and the dump above is what separates the two.

The harness sends its own runtime facts in `messages[1]` every session no matter what our body says:
the working directory, whether it is a git repository, the platform, the shell, the OS version, the
untrusted-download rules, the running model's name and ID and cutoff, the deferred tools with the rule
that a schema must be fetched before a call, the agent types with the rule that independent agents go
in one message, and the skills under the line "The following skills are available for use with the
Skill tool:". Restating any of these in `system[2]` pays twice for one fact. The tool texts carry the
mechanics of each tool at the point where the model decides to call it, which is a better place for
them than a system-prompt bullet.

The skills line is the one near miss. It names the `Skill` tool, so the mechanism is carried, but the
dump holds neither the `/<skill-name>` convention nor the clause that only a listed skill may be
invoked. Those two are still dropped, and the table above prices them.

What is left is the set in that table: facts about the runtime that the harness stated only in the
default body it replaced. Those are the ones worth buying, and they are bought at the price of other
text, which is why each one has to name the behavior it changes.
