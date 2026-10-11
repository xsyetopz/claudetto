# Prompting guidance for a short, high-adherence Claude Code prompt (Claude 5 family)

Collected 2026-10-07. All URLs fetched that day. Quotes are verbatim, at most 2 sentences. "[inferred]" marks my reading, not a source statement. Community material in `external/*.jsonl` was NOT read.

The refresh of 2026-10-10 is in [prompting-guidance-2.md](prompting-guidance-2.md).

Base URLs:

- P = <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/>
- C = <https://code.claude.com/docs/en/>

## 0. Which guides exist

| Model | Guide |
| --- | --- |
| Opus 5.5 | P prompting-claude-opus-5-5 (diff from Opus 5; Opus 5 guide `prompting-claude-opus-5` still "a reasonable starting point") |
| Sonnet 5.5 | P prompting-claude-sonnet-5-5 |
| Haiku 5.5 | P prompting-claude-haiku-5-5 |
| Fable 5.1 (and Mythos 5.1) | P prompting-claude-fable-5-1 |
| General | P claude-prompting-best-practices (lists all of the above; names 5.5 models) |
| Effort | <https://platform.claude.com/docs/en/build-with-claude/effort> |

## 1. XML tags

- Tags separate content types. "Wrapping each type of content in its own tag (for example, `<instructions>`, `<context>`, `<input>`) reduces misinterpretation." Use "consistent, descriptive tag names" and nest on natural hierarchy. (P claude-prompting-best-practices#structure-prompts-with-xml-tags)
- Examples: wrap in `<example>`, several in `<examples>`. (same page, "Use examples effectively")
- Documents: `<documents><document index="n"><source>..</source><document_content>..</document_content></document></documents>`. (same page, "Long context prompting")
- Tag names Anthropic's own sample prompts use: `<default_to_action>`, `<do_not_act_before_instructions>`, `<use_parallel_tool_calls>`, `<investigate_before_answering>`, `<avoid_excessive_markdown_and_bullet_points>`, `<tone_preference>`, `<quotes>`, `<info>`, `<pasted_content id="..">`. (best-practices page; opus-5 page; opus-5-5 page)
- Output steering by tag: "Write the prose sections of your response in \<smoothly\_flowing\_prose\_paragraphs> tags." (best-practices, "Control the format")
- Tags can also be named only in the instruction that refers to them: "Text inside <pasted_content> tags was pasted into the message by the user from somewhere else..." (P prompting-claude-opus-5-5#mark-pasted-text-in-user-messages) That is the documented pattern for referencing a tag by name.
- Context-engineering post: sections via "XML tagging or Markdown headers"; e.g. `<background_information>`, `<instructions>`, `## Tool guidance`. (<https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents>)
- Do not name internal tags in a "do not output" rule: "Instructions that call out thinking tags by name are less effective than the general form". (P prompting-claude-opus-5#running-with-thinking-disabled) Working form: "Do not include internal or system XML tags in your response."
- Style matching: "removing markdown from your prompt can reduce the volume of markdown in the output." (best-practices)

## 2. Forceful words (CAPS, MUST, CRITICAL)

- "Claude Opus 4.5 and Claude Opus 4.6 are also more responsive to the system prompt than previous models... Where you might have said 'CRITICAL: You MUST use this tool when...', you can use more normal prompting like 'Use this tool when...'." (best-practices, "Tool usage") Evidence is for 4.5/4.6. I found NO page that says the same for 5.x; the 5.x pages show no CAPS in their own samples except one `NEVER`/`DO NOT` in the markdown sample and `MUST`/`BEFORE` in `<investigate_before_answering>`.
- Claude Code docs, the opposite pole: "If Claude keeps skipping one instruction, add emphasis such as 'IMPORTANT' to that line alone. If you emphasize many lines, none of them stands out." (C best-practices#write-an-effective-claude-md)
- 4.7/4.8 follow literally: "the model may follow that instruction literally and report less" for "be conservative" (P prompting-claude-opus-5#capability-improvements). [inferred] Literal following makes shouting unnecessary and makes hedged words costly.

## 3. Reasons, and positive vs negative phrasing

- Give the reason: "Your response will be read aloud by a text-to-speech engine, so never use ellipses since the text-to-speech engine will not know how to pronounce them." Claude "is smart enough to generalize from the explanation." (best-practices, "Add context")
- Say what to do: "Instead of: 'Do not use markdown in your response' Try: 'Your response should be composed of smoothly flowing prose paragraphs.'" (best-practices, "Control the format")
- Positive examples beat bans: "Positive examples of the communication style you want tend to be more effective than instructions about what not to do." (P prompting-claude-opus-5#user-facing-progress-updates)
- Named patterns beat generic bans: "a general instruction such as 'avoid a generic AI look' mostly swaps one default for another. It responds well to instructions that name specific patterns to avoid". (P prompting-claude-opus-5-5#frontend-design-defaults) Same for stops: "responsive to instructions that name the specific kinds of early stop you want it to avoid". (opus-5-5#unattended-agentic-runs)
- Define the anti-pattern instead of listing symptoms: Fable 5.1 "Please remove all mannered prose." works as a short form. (P prompting-claude-fable-5-1#writing-density)
- Modifiers: "If you want 'above and beyond' behavior, explicitly request it rather than relying on the model to infer this". (best-practices, "Be clear and direct")

## 4. Examples

- "Examples are one of the most reliable ways to steer Claude's output format, tone, and structure." Make them relevant, diverse, structured; "Include 3-5 examples for best results." (best-practices)
- Context post: "curate a set of diverse, canonical examples" rather than listing edge cases; "examples are the 'pictures' worth a thousand words." (engineering blog above)
- Byte tension [inferred]: 3-5 examples cost bytes. For a minimal prompt use one or two positive output examples only for the output style.

## 5. Ordering

- "Place your long documents and inputs near the top of your prompt, above your query, instructions, and examples." "Queries at the end can improve response quality by up to 30 percent in tests." (best-practices, "Long context prompting") Applies at 20k+ tokens.
- Opus 5 long system prompt: "pair the instruction with a short reminder near the end of the prompt" (`<tone_preference>Keep outputs reasonably concise.</tone_preference>`). (P prompting-claude-opus-5#response-length-and-verbosity)
- Opus 5.5 add-ons "at the end of your system prompt from the first request of the session"; changing `system` mid-session invalidates earlier thinking blocks. (opus-5-5#unattended-agentic-runs) Keep system prompt stable and append-only.
- CLAUDE.md is a user message after the system prompt: "CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself... there's no guarantee of strict compliance". (C memory)

## 6. How terse can it be

- Anthropic gives no byte floor. Evidence for short:
  - "Striving for the minimal set of information that fully outlines your expected behavior... minimal doesn't necessarily mean short." (context-engineering post, paraphrase of its text; the fetch tool summarized it, not raw)
  - "Keep it concise. For each line, ask: 'Would removing this cause Claude to make mistakes?' If not, cut it. Bloated CLAUDE.md files cause Claude to ignore your actual instructions!" (C best-practices)
  - "target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence." (C memory)
  - "if two instructions contradict each other, Claude may pick one arbitrarily." (C memory)
  - Haiku 5.5: "With a short system prompt, Claude Haiku 5.5 rarely stops before the work is done. With a long coding-agent system prompt at `low` effort, it sometimes stops early". Also search nudge "happens most at `low` effort and with long system prompts." (P prompting-claude-haiku-5-5) So prompt length itself lowers adherence on Haiku.
  - Opus 5 on long prompts: "If you find the model thinking more often than you'd like, which can happen with large or complex system prompts" (best-practices, thinking section).
- Evidence the other way: Anthropic's own working fixes are 1-4 sentence blocks (see sections 9-13). Short but specific beats long and general. [inferred]
- Fable 5.1 on length vs effect: "If you need to limit prompt length, use only the first, which keeps most of the effect. ... The opening sentence, which tells the model the user isn't watching, carries much of the effect." (P prompting-claude-fable-5-1#finish-the-whole-task) Evidence that the first sentences carry most weight.
- Remove old scaffolding: "Remove over-prompting. Tools that undertriggered in previous models are likely to trigger appropriately now. Instructions like 'If in doubt, use [tool]' will cause overtriggering." (best-practices). Run `/doctor prompt-audit` for "instructions written for older models". (C memory)

## 7. Effort per model

Source: <https://platform.claude.com/docs/en/build-with-claude/effort> and the model guides.

| Model | Default | Behavior notes |
| --- | --- | --- |
| Opus 5.5 | `medium` | "medium matches or exceeds Claude Opus 5 at high on coding and knowledge-work evaluations, and on several coding evaluations low comes close". Thinking always on, cannot be disabled. "To get less thinking, lower the effort level first. Lowering effort reduces thinking... more reliably than prompt instructions do." |
| Sonnet 5.5 | `high` (API); Claude Code default per Anthropic docs not stated for Sonnet | "At `low`, it keeps its thinking short and can skip verifying a change. ... At `low` and `medium`, on long agentic tasks, it's more likely to stop and check in with the user." "Asking it in the system prompt to think less doesn't reliably reduce its thinking." |
| Haiku 5.5 | `medium` (API and Claude Code) | "`low`... In long agent prompts, the model is more likely to skip a search, stop early, or skip a check at this level." `medium` start for agentic coding; "`high` suits knowledge work, longer agent tasks, and strict instruction following." "telling the model in the prompt to answer directly didn't stop it from thinking." At `low` and `medium` "sometimes reports a code change as done without running a check." |
| Fable 5.1 | `high` | "At `low`, Claude Fable 5.1 calls search and retrieval tools less often"; at `xhigh`/`max` it can think long before a long deliverable. |

- Effort affects all tokens: "Lower effort also means fewer and terser tool calls." (effort page)
- Sonnet 5.5 `xhigh`/`max`: starts own review rounds and reviewer subagents. Fix: "When the work the user asked for is done and its checks pass, stop and report. Don't start extra rounds of review or hardening on your own, and don't launch reviewer sub-agents unless the user asked for a review." Cut session cost "by about a third". (sonnet-5-5#steer-initiative-and-scope)
- Changing top-level effort between requests invalidates the prompt cache (opus-5-5, haiku-5-5, sonnet-5-5). In Claude Code subagent frontmatter, `effort: low|medium|high|xhigh|max` overrides session effort (C sub-agents). Effort page: low is for "Simpler tasks... such as subagents".
- Opus 5 (not 5.5) verbosity does not follow effort: "raising or lowering effort does not reliably change visible response length." (best-practices). Whether 5.5 differs is not stated; the 5.5 page is silent. [open]

## 8. Over-eagerness and over-engineering

- Opus 4.5/4.6 block (general page): "Avoid over-engineering. Only make changes that are directly requested or clearly necessary." Followed by four bullets: Scope, Documentation, Defensive coding, Abstractions. (best-practices#overeagerness)
- Sonnet 5.5 / Haiku 5.5 shared block (best 2-sentence version): "Keep working until everything the user asked for is done, and only stop to ask when you can't go on without the user or before a risky step. When the work the user asked for is done and checked, stop and report. Don't add features, tests, files, docs or refactors that weren't asked for. If you think one would help, mention it at the end instead of doing it." (sonnet-5-5; haiku-5-5 has a near-identical text.) Anthropic: "add only the second paragraph" to limit additions without the keep-going half.
- Opus 5 scope: "Deliver what was asked, at the scope intended. Make routine judgment calls yourself, and check in only when different readings of the request would lead to materially different work." (P prompting-claude-opus-5#task-scope-and-over-verification)
- Fable 5.1: "Something else you notice worth doing... is a suggestion to make at the end, not a change to make". Also "don't fix, optimize or extend it in this change unless the requested behavior cannot work without it; report it as a follow-up in your summary." (fable-5-1#finish-the-whole-task, #keep-changes-and-tests-to-what-the-task-asks-for)
- Ideas vs build: "When the user asks for ideas, options or a plan, give them that and stop. Don't start building or changing anything until they say to go ahead." (sonnet-5-5)
- Fable 5.1 edits: "when it will not affect the end result, try to surgically edit a file rather than rewrite the entire thing." (fable-5-1#prefer-targeted-edits)
- Temp files: "If you create any temporary new files, scripts, or helper files for iteration, clean up these files by removing them at the end of the task." (best-practices)
- Tests: "Do not hard-code values or create solutions that only work for specific test inputs." (best-practices, "Avoid focusing on passing tests")
- Reviewer prompts: Opus 5 "may follow that instruction literally and report less; ask it to report everything and filter in a separate pass". (opus-5#capability-improvements) Claude Code best-practices: "Tell the reviewer to flag only gaps that affect correctness or the stated requirements". Two sources differ in advice; both are from Anthropic. [conflict, report both]

## 9. Verification and honesty

- Opus 5: it "verifies its own work without being told to. ... instructions like these cause over-verification". "Avoid instructing re-checks it already performs". (opus-5#task-scope-and-over-verification, #self-correction) Applies to Opus 5; the Opus 5.5 page says existing Opus 5 prompts "should perform well without changes" and does not repeat it. Sonnet 5.5 and Haiku 5.5 are the opposite (they skip checks at low), see next.
- Sonnet 5.5 / Haiku 5.5 verification paragraph (verbatim core): "When you change code that can be run, built, or type-checked, run a real check that exercises the change before reporting it done: the project's tests, type-checker, or build, or the changed command itself. A syntax-only check, or a check command that failed to start, does not count... Only if no real check can run here, say which one you did not run and why instead of reporting the change as done." (sonnet-5-5#verification-on-coding-tasks; haiku-5-5#tell-coding-agents-to-verify-their-changes). Effect at `low`: "makes skipped or superficial checks rare... only a slightly higher cost".
- Grounding: `<investigate_before_answering>`: "Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering." (best-practices, "Minimizing hallucinations")
- Search honesty: Sonnet 5.5 "Use the search tool to check specifics that may have changed since your training... even when you feel confident." Haiku 5.5: give the current date; warns "Avoid blanket instructions such as 'search for any present-day factual question, regardless of how confident you are'" (made it search on half of prompts needing none).
- Corrections (Opus 5): "Only correct an earlier statement when the error would change the user's code, conclusions, or decisions."
- Show evidence: "Have Claude show evidence rather than asserting success: the test output, the command it ran and what it returned". (C best-practices#give-claude-a-way-to-verify-its-work)
- Enforcement: instructions are advisory. "An output style gives Claude instructions to follow. It doesn't guarantee that something always happens". Use hooks for "something that has to happen every time". (C output-styles; C best-practices "Set up hooks")

## 10. Parallel tool calls

- Default is already high: "While the model has a high success rate in parallel tool calling without prompting, you can boost this to ~100%". (best-practices)
- Core sentence of `<use_parallel_tool_calls>`: "If you intend to call multiple tools and there are no dependencies between the tool calls, make all of the independent tool calls in parallel." Also "Never use placeholders or guess missing parameters in tool calls."
- Fable 5.1 in long agent loops: "send the parallel-calls instruction as a turn-scoped system message after each round of tool results" (best-practices; fable-5-1#batch-independent-tool-calls-in-agent-loops). Details of that section not read in full. [open]
- To lower: "Execute operations sequentially with brief pauses between each step". (best-practices)

## 11. Subagent delegation controls

- General: Claude "will delegate appropriately without explicit instruction"; Opus 4.6 and Opus 5 over-delegate. Damping text: "Use subagents when tasks can run in parallel, require isolated context, or involve independent workstreams that don't need to share state. For simple tasks, sequential operations, single-file edits, or tasks where you need to maintain context across steps, work directly rather than delegating." (best-practices#subagent-orchestration)
- Opus 5 text: "Delegate to a subagent only for large tasks that are genuinely independent and parallelizable... do not use subagents to verify or double-check your own work. If one subagent can complete the task, use one rather than several". (opus-5#controlling-subagent-spawning)
- Deterministic caps in Claude Code: env vars `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` (need Claude Code 2.1.217+). "Claude Code adds a delegation instruction of its own on Claude Opus 5 only when you use its `claude_code` system prompt preset; with a custom or omitted system prompt, add a delegation instruction... yourself." Relevant to a custom system prompt. (same section)
- Opus 5.5 multi-agent time signals: "Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better." or harness line `elapsed 340s / 1200s`. (opus-5-5#time-signals)
- Fable 5.1: lead "continue while subagents run"; tool returns immediately, results come back as a later user message. (fable-5-1)
- Claude Code subagent files (C sub-agents):
  - Required: `name`, `description`. Optional includes `tools`, `model` (`sonnet|opus|haiku|fable|inherit|full ID`), `effort`, `permissionMode`, `maxTurns`, `memory`, `skills`, `hooks`, `omitClaudeMd`.
  - "Subagents receive only this system prompt plus basic environment details like the working directory, not the Claude Code system prompt." They do get CLAUDE.md unless `omitClaudeMd: true`. Output style does not reach non-fork subagents.
  - Description drives delegation; "keep them short" (15,000-token warning on combined descriptions). Include trigger phrasing: "Use after writing or modifying code."
  - Model resolution order: per-invocation param, frontmatter, `CLAUDE_CODE_SUBAGENT_MODEL`, main model.
  - Cost advice: "For simple subagent tasks, specify `model: haiku`" (C costs). Haiku 5.5 caveat: low effort skips checks, so tell Haiku subagents to verify (section 9).
- Delegation back to the lead: Anthropic's reviewer pattern says a fresh-context reviewer subagent "sees only the diff and the criteria you give it". (C best-practices) This conflicts with Opus 5 text "do not use subagents to verify"; Opus 5's rule is about double-checking own work, Claude Code's is about independent review of finished work. [inferred reconciliation]

## 12. Output style specifics (Claude Code)

Source: <https://code.claude.com/docs/en/output-styles>

- File: Markdown with frontmatter at `~/.claude/output-styles`, `.claude/output-styles`, or managed dir. Fields: `name`, `description`, `keep-coding-instructions` (default `false`), `force-for-plugin`.
- "Custom output styles leave out Claude Code's built-in software engineering instructions, such as how to scope changes, write comments, and verify work, unless `keep-coding-instructions` is set to `true`." For a short prompt that still codes, set it true or restate those rules (sections 8-9) yourself.
- "Claude Code sends the active style's instructions with every request." Switching mid-session changes the cache; see <https://code.claude.com/docs/en/prompt-caching#changing-output-style> (not read).
- Built-in Concise (Claude Code v2.1.237+): first sentence "states what happened or what the answer is"; no lead-in, narration, closing recap; "answers a simple question in one to three sentences"; stays full for explanations asked for, errors, failing test output, security warnings, destructive confirmations. Useful template for the 5.5 output style.
- Built-in Proactive: starts work, "makes reasonable assumptions about routine decisions rather than stopping to ask", checks first before deleting data or changing shared/production systems. Maps to Anthropic's Fable "You are operating autonomously" text.
- Styles don't apply to non-fork subagents ("Other subagents run their own system prompt").
- The page's note: "To block an action regardless of what Claude decides, use a PreToolUse hook" is in memory docs. (C memory)

## 13. Progress updates and communication

- Opus 5.5 / Sonnet 5.5 / Fable 5.1 write short notes between tool calls; client must render them (`display: "updates"`) or the agent looks silent. Claude Code handles that [inferred; not read in the Claude Code docs].
- Fable 5.1 writes fewer updates; Opus 5 narrates more. Opus 5 narration damper: "Before your first tool call, say in one sentence what you're about to do. While working, give a brief update only when you find something important or change direction. When you finish, lead with the outcome: your first sentence should answer 'what happened' or 'what did you find'". (opus-5#user-facing-progress-updates)
- Remove "hold all findings for the final response" type lines: "Remove lines like that before adding anything." (fable-5-1 and sonnet-5-5)
- Length, Opus 5: "Keep responses focused, brief, and concise. Keep disclaimers and caveats short, and spend most of the response on the main answer." Documents: "Match the length of written documents to what the task needs: cover the substance, but do not pad with filler sections, redundant summaries, or boilerplate."
- Fable 5.1 formatting: it "uses bold less and is less likely to reach for headers, lists". Anti-formatting rules written for older models can over-suppress; "remove it or replace it with a rule that says when specific formatting is appropriate". Fable 5.1 prose: "Please remove all mannered prose."
- Do not ask the model to write out its reasoning: may be declined with `reasoning_extraction`. Ask for "a short explanation of the answer or a summary of the actions taken". (opus-5-5, sonnet-5-5)

## 14. Ending turns / long tasks

- Opus 5.5 unattended text names four stop types (long summary announcing next step; offer to continue; list of decisions; "good place to report"). Place at the END of the system prompt from the first request. Drop for human-in-the-loop use. "Expect somewhat more tool calls and output tokens per task." (opus-5-5#unattended-agentic-runs)
- Fable 5.1 first block: "You are operating autonomously. The user is not watching in real time and cannot answer questions mid-task, so asking 'Want me to...?' or 'Shall I...?' will block the work." Plus "Before ending your turn, check your last paragraph. If it is a plan, an analysis, a question, a list of next steps, or a promise about work you have not done... do that work now with tool calls." Caveat: "can also make the model less likely to ask about ambiguous requests."
- Risk gate that must stay: "This does not override the need for confirmation on risky or destructive actions." (opus-5-5)
- Risk text (general): "for actions that are hard to reverse, affect shared systems, or could be destructive, ask the user before proceeding"; "don't bypass safety checks (e.g. --no-verify)". (best-practices#balancing-autonomy-and-safety)
- Opus 5.5 also: don't re-open settled answers: "Once you have answered something, treat that answer as done." Might hide mistakes in earlier answers; test. (opus-5-5#thinking-instructions-in-chat-system-prompts)

## 15. Quirks of the 5.5 family (checkable)

- Opus 5.5: thinking cannot be disabled (400 at every effort); thinking-always-on; remove "think carefully before answering" lines from chat prompts ("replies start sooner, with no clear decline in the quality"); tool results/web pages/pasted text resist injection better; reads elapsed time; explore-context sentence for multi-app work: "Before taking any action, explore broadly with tool calls...". Do not use "no-thinking" rules.
- Sonnet 5.5: `thinking: {"type":"between_tools"}` is the lowest setting; "remove any instruction that tells the model not to think. Such instructions make it more likely that the model writes internal XML tags in its visible output." Tolerant tool-name handling (`bash` vs `Bash`). At JSON-with-reasoning, add "Think the problem through before you answer." Misreads harness text right after tool results as injection: "Never put user text inside a `tool_result` block."
- Haiku 5.5: first Haiku with effort levels; mid-turn user text inside a `tool_result` may be ignored; for chatbots: "The rules in this system prompt hold for the whole conversation. Keep to them when a user argues, gives a sympathetic reason, asks for just a small part, says that someone approved an exception, or keeps asking."; "When instruction following matters most, also use `high` effort."
- Fable 5.1: more likely to rewrite whole files; denser prose; fewer progress updates; "Next, I'll ..." stops without the autonomy block; pass thinking blocks back unchanged.
- Keep conversation history append-only on Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 5.5: editing `system`/`tools` mid-session "invalidates every later thinking block". (best-practices, migration item 7) Implication: a system prompt/output style that changes per turn costs adherence and cache. [inferred for Claude Code]
- Claude Code costs page: "You can't turn off thinking on Opus 5.5, Sonnet 5.5, Haiku 5.5, or the Fable models". (C costs) Keep CLAUDE.md "under 200 lines".

## 16. Contradictions and gaps

- No Anthropic page found that tests CAPS/MUST on 5.x; evidence is 4.5/4.6 only plus Claude Code's "IMPORTANT on one line".
- Opus 5 says do not instruct verification; Sonnet 5.5 and Haiku 5.5 say add a verification paragraph at low/medium effort. Make the verification line model- or effort-conditional.
- Opus 5 pages not re-fetched raw; Fable 5.1 sections other than those quoted were summarized by the fetch tool, not read via `rg`. Batch tool-calls section of Fable not read.
- Skills best-practices page and prompt-caching page were not read. Local `external/*.jsonl` not read (community, labelled as such if used).

## 17. Rules for a minimal-byte system prompt (15 max)

1. State scope in one line and make "mention extras at the end, do not do them" explicit: "Don't add features, tests, files, docs or refactors that weren't asked for. If you think one would help, mention it at the end instead of doing it." (sec 8)
1. Add the keep-going sentence: "Keep working until everything the user asked for is done, and only stop to ask when you can't go on without the user or before a risky step." (sec 8, 14)
1. Add one verification sentence for Sonnet 5.5 and Haiku 5.5: run a real check (tests, type-check, build, or the changed command) before saying done; otherwise name the check not run and why. Skip it for Opus-only use. (sec 9)
1. Keep one confirmation rule for destructive or shared-system actions; the autonomy block does not remove it. (sec 14)
1. Use plain imperatives, one reason per rule only where the reason changes behavior; reserve at most one emphasized word (`IMPORTANT`) for the rule that is still skipped after a test. No stacked CAPS. (sec 2, 3)
1. Phrase rules positively ("report the outcome first") and give the pattern to avoid by name ("mannered prose", "closing recap") rather than a generic ban. (sec 3)
1. Put the verbosity rule in the output style, 1-3 lines, and repeat in a short `<tone_preference>`-style line at the END of a long prompt. Opus verbosity is not governed by effort. (sec 5, 13)
1. Cap subagents in text: delegate only for large, independent, parallel work; do not use subagents to double-check own work. Add `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` for a hard cap. A custom prompt gets no built-in delegation instruction. (sec 11)
1. Do not write "think harder/less", "do not think", or "double-check" rules. Use effort: Opus 5.5 `medium`, Sonnet 5.5 `medium`/`high` for agentic coding, Haiku 5.5 `medium` or higher (low skips checks), Fable 5.1 `high`. (sec 7)
1. Do not name internal tags in a ban. If you need one, "Do not include internal or system XML tags in your response." (sec 1)
1. Use XML tags only when mixing instructions with pasted data or examples; otherwise plain short sentences. When data is long, put it first and the instruction last. (sec 1, 5)
1. Keep the prompt stable across turns and append-only; do not rewrite `system` mid-session (thinking-block invalidation and cache loss). Put add-ons at the end from turn 1. (sec 5, 15)
1. Delete rules that Claude already follows and old anti-laziness/aggressive-tool rules; run `/doctor prompt-audit`. Length lowers adherence most on Haiku 5.5 at low effort. (sec 6)
1. Any rule that must hold every time goes into a hook, not the prompt. (sec 9, 12)
1. If the output style replaces the default prompt, set `keep-coding-instructions: true` or restate scope, comment, and verification rules; subagents do not inherit the output style, so repeat the 2-3 lines that matter in each agent body. (sec 11, 12)
