# Prompting Rules, Model Facts, Pricing, and Batch API

A `claudetto:Researcher` fetched these pages on 2026-10-25, for the audit of each prompt text against the best practices (the user, 2026-10-25).
Each quote and value below comes from the Researcher report of 2026-10-25, with the page URL of each item.
A `curl` of the live pages on 2026-10-25 confirmed the values 128,000, 512, 100,000, 256, and 300,000.
Anchors are slugs from the heading text, not checked against the live page IDs.
The prompt-caching, `thinking`, `effort`, and Fable 5.1 "whats-new" pages were not fetched.

`P` is `https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/`.
`BP` is `P` + `claude-prompting-best-practices`, `F51` is `P` + `prompting-claude-fable-5-1`, `O55` is `P` + `prompting-claude-opus-5-5`, `S55` is `P` + `prompting-claude-sonnet-5-5`, and `H55` is `P` + `prompting-claude-haiku-5-5`.
"All" is Fable 5.1, Opus 5.5, Sonnet 5.5, and Haiku 5.5.

## Prompting Rules

### General (`BP`)

1. "Claude responds well to clear, explicit instructions." `BP#be-clear-and-direct`. All.
2. Test: "Show your prompt to a colleague with minimal context on the task and ask them to follow it." `BP#be-clear-and-direct`. All.
3. Use numbered lists or bullets "when the order or completeness of steps matters." `BP#be-clear-and-direct`. All.
4. Give the reason. "Claude can generalize from the explanation." `BP#add-context-to-improve-performance`. All.
5. Examples are "Relevant", "Diverse", and "Structured", in `<example>` tags inside `<examples>`. "Include 3–5 examples for best results." `BP#use-examples-effectively`. All.
6. Use XML tags to separate instructions, context, examples, and inputs, with "consistent, descriptive" names. `BP#structure-prompts-with-xml-tags`. All.
7. Set a role in the system prompt: "Even a single sentence makes a difference." `BP#give-claude-a-role`. All.
8. For inputs over 20k tokens, "Put long-form data at the top", and the query at the end. `BP#long-context-prompting`. All.
9. Tell the model its identity and model string, such as "The current model is Claude Opus 5.5." `BP#model-self-knowledge`. All.
10. "Where a technique names a specific model, treat it as measured on that model and re-check it against your own evals before applying it to another." `BP#general-principles`. All.

### Emphasis, Positive Framing, and Over-Prompting (`BP`)

11. Positive over negative: "Instead of: 'Do not use markdown in your response' Try: 'Your response should be composed of smoothly flowing prose paragraphs.'" `BP#control-the-format-of-responses`. All.
12. Soften emphasis: "Where you might have said 'CRITICAL: You MUST use this tool when...,' you can use more normal prompting such as 'Use this tool when...' instead." `BP#tool-usage`. Measured on Opus 4.5 and 4.6. The 5.x pages name no new emphasis rule.
13. "Remove over-prompting. … Instructions such as 'If in doubt, use [tool]' cause overtriggering." `BP#overthinking-and-excessive-thoroughness`. Measured on Opus 4.6.
14. "If your prompts previously encouraged the model to be more thorough or use tools more aggressively, reduce that guidance." `BP#migration-considerations`. Claude 4.6 and later.
15. "removing markdown from your prompt can reduce the volume of markdown in the output." `BP#control-the-format-of-responses`. All.
16. The page samples use ALL CAPS words (`DO NOT use ordered lists`, `you MUST read the file`). The page does not forbid caps. Rule 12 is the only rule that softens them.

### Verbosity and Formatting (`BP`, `F51`)

17. The latest models "Might skip detailed summaries". Ask: "After completing a task that involves tool use, provide a quick summary of the work you've done." `BP#communication-style-and-verbosity`. All.
18. Fable 5.1 writes fewer updates between tool calls. "Ask for progress text explicitly, and remove any instruction telling it to keep that text brief." `BP#communication-style-and-verbosity`. Fable 5.1.
19. The block `<avoid_excessive_markdown_and_bullet_points>` is not for Fable 5.1: "on that model a block like this can suppress structure the content needs. Remove it." `BP#control-the-format-of-responses`. Fable 5.1.
20. "If your prompt contains anti-formatting language, remove it or replace it with a rule that says when specific formatting is appropriate." `F51#formatting-in-chat`. Fable 5.1.
21. "Please remove all mannered prose." in a user message (preferred) or the system prompt. `F51#writing-density`. Fable 5.1.
22. "Respond directly without preamble." `BP#migrating-away-from-prefilled-responses`. All.

### Tool Use and Parallel Calls

23. Be explicit about action: "Change this function to improve its performance." `BP#tool-usage`. All.
24. `<default_to_action>`: "By default, implement changes rather than only suggesting them." `BP#tool-usage`. All.
25. `<use_parallel_tool_calls>` ends "Never use placeholders or guess missing parameters in tool calls." `BP#optimize-parallel-tool-calling`. All.
26. Fable 5.1 can make independent calls one per turn in coding loops. Nudge: "First privately list what you need next; then request every item that doesn't depend on another's result in this one response." Send it as a turn-scoped system message after each tool-result turn (`clear_at: "next_user_message"`, beta `mid-conversation-system-clear-at-2026-08-21`). `F51#batch-independent-tool-calls-in-agent-loops`. Fable 5.1.
27. Remove text that discourages tools, such as "minimize tool calls". `S55#tool-use-in-chat-and-knowledge-work`. Sonnet 5.5.
28. Haiku 5.5: give the date once at the start, and keep `system` and `tools` the same after that. Blanket search rules cause searches with no need. `H55#accurate-search-results`. Haiku 5.5.
29. Sonnet 5.5 can call a tool with the wrong letter case (`bash` for `Bash`). Accept an exact match with no doubt, or return `is_error: true` with the expected name. `S55#tolerant-tool-call-handling`. Sonnet 5.5.
30. When the UI hides tool output, say so: "Only you see that command's output — the user's terminal shows at most a few lines of it." `F51#ask-for-user-facing-progress-updates`. Fable 5.1.
31. "try to surgically edit a file rather than rewrite the entire thing." `F51#prefer-targeted-edits-over-whole-file-rewrites`. Fable 5.1.

### Thinking and Effort

32. Effort controls thinking more reliably than prompt text. `O55#calibrate-effort`, `S55#calibrate-effort`, `H55#use-effort-to-control-thinking`.
33. Remove "think carefully" lines for Opus 5.5: "The model determines how much to think." `O55#thinking-instructions-in-chat-system-prompts`. Opus 5.5.
34. Do not ask for written-out reasoning. "Prompts, skills, and tool descriptions that ask the model to write its thinking or reasoning might be declined with the `reasoning_extraction` category." `BP#leverage-thinking-and-interleaved-thinking-capabilities`, `S55#safeguard-refusals`, `O55#safeguard-refusals`. Fable 5.1, Opus 5.5, and Sonnet 5.5. User reports add two cases (https://www.reddit.com/r/Anthropic/comments/1xfdown/claude_refuses_judges_and_evals_if_they_include_a/, 2026-10-25): an eval judge that asks for the decision and "reasoning" is refused, and a delegation prompt with a heading "My Reasoning" is refused after the subagent already ran, so the parent gets no tool result and starts the task again. Ask for "the reason" or "why", and keep the word out of judge prompts and delegation prompts. A search of the transcripts of this project on 2026-10-26 found 0 refusal stops.
35. A short explanation of the answer or a summary of the actions is allowed. `O55#safeguard-refusals`. Opus 5.5 and Sonnet 5.5.
36. Sonnet 5.5 and Haiku 5.5: "run a real check that exercises the change before reporting it done". `S55#verification-on-coding-tasks`, `H55#tell-coding-agents-to-verify-their-changes`.
37. "Thinking counts toward `max_tokens` even when thinking content isn't returned to you." For agentic coding, a `max_tokens` of "128,000, the model's maximum, has worked well". `O55#calibrate-effort`, `S55#calibrate-effort`.

### Scope, Initiative, and Finishing

38. Fable 5.1 "Finish the whole task": "You are operating autonomously. The user is not watching in real time..." Keep the opening sentence as written. `F51#finish-the-whole-task`. Fable 5.1.
39. Fable 5.1 scope: a bug that is already there stays out of the change "unless the requested behavior cannot work without it". `F51#keep-changes-and-tests-to-what-the-task-asks-for`. Fable 5.1.
40. Sonnet 5.5 and Haiku 5.5: the model keeps working until each part of the request is done, and stops to ask only when it cannot go on without the user or before a risky step (Researcher report, 2026-10-25). `S55#steer-initiative-and-scope`, `H55#prevent-early-stopping-in-long-agent-prompts`.
41. Opus 5.5: name the kinds of early stop to avoid, and add the paragraph "from the first request of the session". `O55#unattended-agentic-runs`. Opus 5.5.
42. `<investigate_before_answering>`: "Never speculate about code you have not opened." `BP#minimizing-hallucinations-in-agentic-coding`. All.
43. "Do not hard-code values or create solutions that only work for specific test inputs." `BP#avoid-focusing-on-passing-tests-and-hardcoding`. All.
44. Temporary files: "clean up these files by removing them at the end of the task." `BP#reduce-file-creation-in-agentic-coding`. All.
45. "Use subagents when tasks can run in parallel, require isolated context, or involve independent workstreams". `BP#subagent-orchestration`. Measured on Opus 4.6 and Opus 5.

### Pushback

52. False pushback is "a big problem" (the user, 2026-10-26). Source: the Reddit thread "is Claude the least yes-man LLM?" (https://www.reddit.com/r/ClaudeAI/comments/1xfa39o/is_claude_the_least_yesman_llm/, captured 2026-10-26, 65 comments). Faults of Opus 5.5 and Fable named there: an invented "yes, but two things" objection in each reply, an argument against a claim that the user did not make, a question read as a correction, a fold under pushback with no new evidence, a made-up constraint, and a flood of hedges. Remedy in `main.md`: object only on evidence, check the text of the user first, answer a question as a question, keep a position until new evidence comes, and give one conclusion with its confidence. Scope: Opus 5.5 and Fable 5.1, from user reports and not from a measure.

### Delegation

53. One main loop is the default. Anthropic, "Building agents: when to fold subagents into your main agent loop" (https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop, 2026-10-22): "using fewer subagents in favor of progressively disclosed context and tools can improve quality", and "Every call is a nested model loop that adds latency." Use a subagent only when "A single agent loop hits measurable performance degradation from context bloat", when "Multiple tasks need to be tackled in parallel with fresh context windows that can be discarded once the task is done", or when "A single agent struggles to select appropriate tools". Also: "once you exceed 30-50 tool definitions in the system prompt, tool choice tends to degrade." Remedy in `main.md`: do the work in the main loop, and start an agent only for one of the 3 cases, with the roster kept (the user, 2026-10-26). Scope: Opus 4.5 and later, Opus 5.5, and Fable 5.1 (The Decoder, 2026-10-25).

### Context, History, and Injection

46. For a harness that compacts: "do not stop tasks early due to token budget concerns". `BP#context-awareness-and-multiwindow-workflows`. All.
47. Keep history append-only. Edits of earlier messages, or a rebuild of `system` or `tools`, "invalidates every later thinking block". Use mid-conversation system messages instead. `BP#migration-considerations`, `F51#keep-the-conversation-history-append-only`. All.
48. Haiku 5.5: a resumed conversation with a changed `system` "can return a 400 error". `H55`. Haiku 5.5.
49. "Never put user text inside a `tool_result` block." `S55#mid-turn-user-messages`, `H55#mid-turn-user-messages`. Sonnet 5.5 and Haiku 5.5.
50. Haiku 5.5: long system prompts at `low` effort make early stops worse. Keep system prompts short. `H55`. Haiku 5.5.
51. Fable 5.1 compaction: the summary instruction lists 6 items to keep "stated exactly". `F51#tell-the-model-what-to-preserve-in-compaction-summaries`. Fable 5.1.

## Model Facts

The 4 models share a 1M context window, 128K synchronous max output, and a Jun 2026 knowledge cutoff (`https://platform.claude.com/docs/en/models/<slug>/overview`).

| Item | Fable 5.1 | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |
| --- | --- | --- | --- | --- |
| Model ID | `claude-fable-5-1` | `claude-opus-5-5` | `claude-sonnet-5-5` | `claude-haiku-5-5` |
| Thinking | adaptive, "always on" | adaptive, "always on" | adaptive, on by default | adaptive, on by default |
| Default effort | `high` | `medium` | `high` | `medium` |
| Batch extended output | none stated | 300K | 300K | 300K |

- Opus 5.5: thinking cannot be turned off. Forced tool use returns an error. "The minimum cacheable prompt length is 512 tokens".
- Sonnet 5.5: the lowest thinking is `thinking: {"type": "between_tools"}`, at `high` effort or below. `temperature`, `top_p`, or `top_k` returns `400`.
- Haiku 5.5: omit `temperature`, `top_p`, and `top_k`. About 30 percent more tokens than Haiku 4.5.
- Fable 5.1: forced tool use returns an error. Edits of earlier turns invalidate thinking blocks.

## Pricing

Per MTok, from `https://platform.claude.com/docs/en/about-claude/pricing`:

| Model | Input | Output | 5m cache write | 1h cache write | Cache read | Batch in / out |
| --- | --- | --- | --- | --- | --- | --- |
| Fable 5.1 | $10 | $50 | $12.50 | $20 | $0.25 | $5 / $25 |
| Opus 5.5 | $4 | $20 | $5 | $8 | $0.20 | $2 / $10 |
| Sonnet 5.5 | $2 | $10 | $2.50 | $4 | $0.10 | $1 / $5 |
| Haiku 5.5, prompts up to 100,000 tokens | $0.10 | $0.50 | $0.125 | $0.20 | $0.01 | $0.05 / $0.25 |
| Haiku 5.5, prompts over 100,000 tokens | $0.50 | $2.50 | $0.625 | $1 | $0.05 | $0.25 / $1.25 |

The batch discount is "50 percent of the standard API prices".

## Batch API

From `https://platform.claude.com/docs/en/build-with-claude/batch-processing`:

- A batch holds at most "100,000 Message requests or 256 MB in size, whichever is reached" first.
- "most batches completing within 1 hour." "Batches expire if processing does not complete within 24 hours."
- "Batch results are available for 29 days after creation."
- Extended output: the header `anthropic-beta: output-300k-2026-03-24` "raises the `max_tokens` cap to 300,000 for batch requests", on the Batches API only. Fable 5.1 is not on the model list.
- A request has `custom_id` (`^[a-zA-Z0-9_-]{1,64}$`) and `params`.
- A request can hold vision, tool use, system messages, multi-turn conversations, and extended thinking. Prompt caching works, best effort.
- A request cannot hold `stream: true`, `speed`, `fallbacks`, or `max_tokens: 0`.
- The order of the results is not fixed, so match them by `custom_id`.

## Messages API

From `https://platform.claude.com/docs/en/build-with-claude/working-with-messages`:

- "Prefilling is not supported on Claude 4.6 and later models... Requests using prefill with these models return a 400 error."
- `temperature`, `top_p`, and `top_k` are "not supported on Claude 4.7 and later models".
- The 4 models accept `"role": "system"` messages after a user turn. Such a message "has the same authority as the top-level `system` field" and "does not invalidate any cached prefix that came before it".

## Not Found

- No page states that ALL CAPS or "IMPORTANT" hurts the 5.x models (rule 16).
- No page addresses output styles or a global `CLAUDE.md` directly. Rules 11 to 22 and 47 apply closest.

## Open Work: The Prompt Audit

- The user wants each default text of Claude Code, and each claudetto text, checked against the rules of this file and the model-specific guidance: the prompt sections, the tool texts, the agent bodies, `output-styles/`, and the global `CLAUDE.md` ("all that needs to be handled rigorously", the user, 2026-10-25).
- Done 2026-10-26: Jev answered 12 questions for each of 42 texts. The result is in `research/text-audit.md`, and it lists the texts that the run did not cover.
- Done 2026-10-26: the digest of the dossier `external/2026-10-25_p2/` is in `.claudetto/research/G-1025p2.md`.
- Open: the rebuild of `plugins/claudetto/agents/main.md`, with the restored security-testing policy of `intro`, from the inputs at the end of `research/text-audit.md`.
