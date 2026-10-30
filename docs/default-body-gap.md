# Default Body Gap

The `agent` setting makes an agent file the main thread, and the harness then sends that file's body
as `system[2]` in place of the default body. It does not append: the `clawdipedia` route
`prompts/agents/agent-main` (read 2026-10-29) states "The agent file body replaces the body
(`system[2]`), like `--system-prompt`", and shows a 58-character probe body arriving as the whole of
`system[2]`, with the `system` blocks totalling 198 characters. Whatever the default body said and
`plugins/claudetto/agents/main.md` does not say is gone from the request. This page lists each item of
the default body and where its ground went.

## What Still Arrives

Replacing the body does not remove the harness's other text (same route, same date). `messages[0]`
carries the attribution reminder of 592 characters. `messages[1]` carries a system message of 9,126
characters that holds the environment block, the deferred-tool listing, the agent listing, and the
skills listing. None of that is part of the loss below.

A shipped capture of 2026-10-29 dumped that message and read it at 9,433 characters, the extra being
the output-style body this tree adds. Its text was then searched for each item of the table below, so
the `nothing` of a row is a reading of the request and not an inference from the route. The run was
`just capture --arm plugin --shipped --dump`, and the dumped request is not in the repository.

## What the Default Body Holds

On Sonnet 5.5 the default `system[2]` is 5,627 characters (`clawdipedia` route
`prompts/defaults/default-sonnet`, read 2026-10-29). `agents/main.md` is 5,584 characters sent, in
eleven sections: `<role>`, `<security>`, `<harness>`, `<project>`, `<tools>`, `<scope>`, `<defects>`,
`<code>`, `<asking>`, `<actions>`, `<claims>`. Its bound is 5,600 characters (`docs/prompt/footprint.md`).

The `Where it is now` column rests on a reading of `plugins/claudetto/agents/main.md`,
`plugins/claudetto/output-styles/Concise.md`, `plugins/claudetto/.claude-plugin/plugin.json`,
`plugins/claudetto/src/prompts.ts`, and `plugins/claudetto/src/compaction/compaction.ts`. The plugin folder holds
no `skills/` folder. The default body lists its items in the order of the rows.

| Default body item | Where it is now | Decision |
| --- | --- | --- |
| Opening identity sentence | `agents/main.md` `<role>`, "a senior software engineer in the user's project" | moved: the file states its own identity |
| `IMPORTANT:` paragraph on authorized security work | `agents/main.md` `<security>` | kept: same policy, shorter |
| Harness bullet: output outside tool use renders as GitHub-flavored markdown in a terminal | nothing | dropped: no reason recorded |
| Harness bullet: a denied call means the user declined it, do not retry verbatim | `agents/main.md` `<harness>`, first sentence | kept: same rule, with the reason that the same call in other words is the same call |
| Harness bullet: mid-conversation system turns are system-controlled, hook output is user feedback | `agents/main.md` `<harness>`, third sentence says a fact in a `system-reminder` or hook message is true and that approval still needs the user's own message; nothing for "system-controlled" or "user feedback" | moved: reworded, and the claim about who controls a system turn is dropped |
| Harness bullet: dedicated file and search tools over shell, independent calls in parallel | `agents/main.md` `<tools>`, first sentence | kept: same rule |
| Harness bullet: code is referenced as `file_path:line_number` because it is clickable | `output-styles/Concise.md` `<shape>`, "reference code as `file:line`"; nothing for the clickable reason | moved: the rule left the body, loads only when `outputStyle` is `claudetto:Concise` (`src/prompts.ts`), reason dropped |
| Line on writing code that reads like the surrounding code, comment density, naming, idiom | `agents/main.md` `<code>`, "in the style of the code near it" | kept: comment density is narrowed to a comment rule ("says why, never what"); naming and idiom are not named |
| Paragraph on they/them when pronouns have not been stated | nothing | dropped: no reason recorded |
| Paragraph on hard-to-reverse and outward-facing actions: confirm first; approval in one context does not extend to the next; sending content to an external service is publication; look at a target before deleting or overwriting; report outcomes faithfully | `agents/main.md` `<actions>` carries confirm first ("hard to undo or that others see"), "One approval covers one action", and "Look at the target before you delete or overwrite it"; `output-styles/Concise.md` `<honesty>` carries faithful reporting; nothing for "sending content to an external service is publication" | kept: three of five clauses stand in `<actions>`, one moved to the style, one dropped |
| `# Session-specific guidance` line: a `/<skill-name>` typed by the user is invoked through `Skill`, only from the user-invocable listing | nothing | dropped: no reason recorded |
| `# Memory` block of roughly 1,900 characters: directory, file format and front matter, the four types, `[[name]]` links, the `MEMORY.md` index rule, the rules on duplicates, on not saving what the repo records, and on verifying a recalled file, function, or flag | nothing | dropped: no reason recorded |
| `# Environment` block: Claude 5 model IDs, the places Claude Code runs, `/fast` | nothing; the harness's own `# Environment` in `messages[1]` was dumped and holds the working directory, whether it is a git repository, the platform, the shell, the OS version, the untrusted-download paragraph, and the running model's name, ID and cutoff, and holds no model list, no list of places Claude Code runs, and no `/fast` | dropped: no reason recorded |
| `# Context management` block: a long conversation is summarized and carried into the next window so work need not wrap up early; when there is enough information to act, act | `agents/main.md` `<scope>` ("through to done", "A step inside that scope is yours to take now") and `<asking>` ("Otherwise decide, state the assumption, and go on") carry the act half; nothing for the summarized-and-carried half, since `src/compaction/compaction.ts` and `plugin.json` choose the compaction path and send the model no text | moved: the act half stands in two sections, the summary half is dropped |

The table has 14 rows. Five carry `nothing` for the whole item: markdown rendering, pronouns, the
slash-skill line, the memory block, and the environment block. Four more carry it for one clause: the
system-controlled claim, the clickable reason, the external-service clause, and the
summarized-and-carried half of context management.

## What the Headroom Means

`agents/main.md` is 5,584 characters sent against a bound of 5,600, which leaves 16
(`docs/prompt/footprint.md`). The bound exists because the body travels as JSON and ours escapes 27
characters more than the default text, so a file above 5,600 makes every request larger than a stock
session. A restatement of a dropped item therefore cannot simply be added. It has to be paid for by
removing text already in the file, and the cost of each is the length of the sentence minus 16.

The sentences below are minimal restatements, drafted for this page, measured with `wc -m`. A new line
also adds a newline, and a quote mark in a sentence escapes in JSON, so each cost is a floor.

| Dropped ground | Minimal sentence | Characters | Must come from the file |
| --- | --- | --- | --- |
| External service as publication | `Sending content to an external service is publication.` | 54 | 38 |
| Pronouns | `Use they/them until the user states pronouns, because a name does not show them.` | 80 | 64 |
| Hook output and system turns | `Hook output is user feedback, and a mid-conversation system turn is system-controlled.` | 86 | 70 |
| Slash skills | `` A `/<skill-name>` typed by the user runs through `Skill`, only from the user-invocable listing. `` | 95 | 79 |
| Memory | the block is roughly 1,900 characters in the default body | 1,900 | about 1,884 |

Two grounds have left this table because they were bought: markdown rendering and the
summarize-and-carry fact. "What the Trade Bought" below records what paid for them.

### Within Reach

The external-service clause costs the least, 38 characters from existing text, and it closes the one
clause of the largest kept paragraph that has no carrier. The pronoun sentence costs 64. Both are one
sentence, so each trade is one sentence of the file for one sentence of the default body. A donor must
be a sentence whose removal costs less than the ground it frees, and the cheapest donor is a
duplicate, which costs nothing at all: the two cuts recorded below were both carried elsewhere in the
same request. Failing a duplicate, `docs/prompt/footprint.md` names a case for seven rules in
`<defects>`, `<project>`, `<tools>`, `<scope>`, and `<code>`, so a sentence from those sections has a
recorded check behind it, and a sentence from a section outside that list has none recorded there.

### Out of Reach

The memory block does not fit by restatement. At roughly 1,900 characters it is about 1,884 above the
headroom, which is 34% of the whole file, and a pointer sentence short enough to fit would drop the
format, the types, and the verification rules that make up the block. Dropping it costs a whole harness
capability: a session on this body has no reason to know a memory directory exists, so it writes no
memory and recalls none. That loss is recorded here and not priced, because no reading of this
repository measures what the memory system is worth.

The slash-skill sentence costs 79 and states a rule about a `Skill` listing, while the plugin folder
holds no `skills/` folder, so the sentence would address skills of other plugins and the user only.
The hook sentence costs 70 and restates in other words a ground that `<harness>` already covers in
part. The model IDs and the places Claude Code runs have no sentence drafted, because the list of IDs
is not among the facts of this page, so their cost is not stated; the project's own instruction file
is the surface for them in any case, since which models a repository targets is a fact about the
repository (`docs/instruction-surfaces.md`).

## What the Trade Bought

The headroom was 15 characters, which buys nothing. It became 213 by cutting text that the same
request already sends, and 197 of that went back out on two harness facts. The file now sends 5,584,
one character less than before, with 16 free.

| Line cut from `agents/main.md` | Characters freed | The carrier that made it a duplicate |
| --- | --- | --- |
| `Delegate to an agent when the reading would fill your context, or when the work is parallel. Brief it with paths, lines, and the facts you know.` | 145 | The `Agent` tool text: "Use it when the reads would fill your context, or when independent work can run in parallel", and "The brief is the only context the agent gets: give the goal, what you ruled out, the paths to read, the report format, and the scope." |
| `Prefer the file and search tools to a shell command.` | 53 | The `Bash` tool text: "Use `Read`, `Edit`, `Write`, and the search tools in place of `cat`, `head`, `tail`, `sed`, `awk`, and `echo`, unless the user asks for the command." This repository's own hook denies such a call and says the same thing. |

| Fact bought | Characters | Section | Why it is worth a request on every session |
| --- | --- | --- | --- |
| `Your text outside a tool call reaches the user as GitHub-flavored markdown in a terminal.` | 90 | `<harness>` | It is the reason behind the backtick and `file:line` rules, and those rules live in the output style, which the user owns and may switch off. The fact outlives them. |
| `A long conversation is summarized into the next window, so carry the work on instead of wrapping up early.` | 107 | `<scope>` | The shipped settings compact at 50% of the window (`plugin.json`), so a claudetto session reaches a compaction by design. Without the fact the model has reason to hand off mid-task, which is the failure `<scope>` exists to stop. |

The two cuts are safe for a reason worth keeping: both carriers ship in the `tools` block of every
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
