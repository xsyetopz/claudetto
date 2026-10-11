# Prompting guidance: refresh of 2026-10-10

This file adds to [prompting-guidance.md](prompting-guidance.md) (collected 2026-10-07).
The live pages were fetched on 2026-10-10.
Not fetched: `prompting-claude-opus-5`, the effort page, `prompt-caching`, the Claude Code costs page, and the mid-conversation system messages page.
"[inferred]" marks a reading that no source states.

Base URLs:

- BP = <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices>
- PE = <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/>
- C = <https://code.claude.com/docs/en/>

## 1. Changes against the file of 2026-10-07

- `keep-coding-instructions` works only with the full system prompt.
  "The shorter system prompt doesn't include that section, so the field has no effect there." (C `output-styles`)
  "When unset, Haiku 4.5, Sonnet 5, Opus 4.7, and earlier models in those families use the full prompt by default, and newer models use the shorter one." (C `env-vars`, `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`)
  [inferred] On the 5.5 models, the field does nothing by default, so a rule of that section must be in the style or the agent body.
- Haiku 5.5 thinking: the API page says "You can also turn thinking off with `thinking: {"type": "disabled"}`".
  The costs page of Claude Code says that you cannot turn it off.
  The two pages do not agree, and the costs page was not fetched again.
- Effort: "For agentic coding and multistep tool use, start at `medium` for well-specified tasks". (PE `prompting-claude-sonnet-5-5#calibrate-effort`)
  Haiku 5.5 at `xhigh` "sometimes writes its whole answer in its thinking and ends the turn with no visible text." (PE `prompting-claude-haiku-5-5`)
- No 5.x page tests capital letters or `MUST`.
  The only emphasis guidance is the passage for Opus 4.5 and 4.6: "Where you might have said 'CRITICAL: You MUST use this tool when...', you can use more normal prompting like 'Use this tool when...'." (BP `#tool-usage`)

## 2. Hook messages

- Write facts, not commands: "Write the text as factual statements rather than imperative system instructions."
  "Text framed as out-of-band system commands can trigger Claude's prompt-injection defenses". (C `hooks#add-context-for-claude`)
  The examples of the page: "This file is generated. Edit src/schema.ts and run `bun generate` instead." and "The deployment target is production".
- `additionalContext`, `systemMessage`, and plain stdout each have a cap of 10,000 characters.
  Over the cap, Claude gets a file path and a preview of 2,000 characters, and "Claude Code doesn't ask Claude to read the file". (C `hooks#json-output`)
- For a rule that does not change, "prefer CLAUDE.md". (C `hooks`)
- `permissionDecisionReason` goes to Claude for `deny`.
  For `ask`, it goes to the user, and to Claude only in a `-p` run.
  For `allow` and `defer`, it goes only to the debug log. (C `hooks`, the `PreToolUse` table)
- The `reason` of a `Stop` or `SubagentStop` block "Tells Claude why it should continue." (C `hooks#stop-decision-control`)
  Use `additionalContext` when the hook works as designed and gives guidance.
- `systemMessage` is a "Warning message shown to the user", and Claude does not see it. (C `hooks`)
- [inferred] Keep hook output after a tool result rare and short: "Frequent harness text after tool results can make the model suspect a prompt injection." (PE `prompting-claude-sonnet-5-5#user-facing-progress-updates`)

## 3. Rules and system prompts

- Make a rule concrete enough to verify: "'Run `npm test` before committing' instead of 'Test your changes'". (C `memory#write-effective-instructions`)
- "Organized sections are easier for Claude to follow than dense paragraphs." (C `memory`)
- Altitude: avoid "hardcoding complex, brittle logic" and "vague, high-level guidance".
  Give "the minimal set of information that fully outlines your expected behavior", and "minimal does not necessarily mean short". (<https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents>)
- "Would removing this cause Claude to make mistakes? If not, cut it." (C `best-practices`)
- Give the reason: "Claude is smart enough to generalize from the explanation." (BP)
- Say the action: with "can you suggest some changes," Claude "will sometimes provide suggestions rather than implementing them". (BP `#tool-usage`)
- Use "a set of diverse, canonical examples", not a "laundry list of edge cases". (context-engineering post)

## 4. Skills

- "Always write in third person. The description is injected into the system prompt". (<https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>)
- A description says what the skill does and when to use it, with specific triggers.
  Avoid "Helps with documents".
- Put the main use case first, because "the combined `description` and `when_to_use` text is truncated at 1,536 characters in the skill listing". (C `skills`)
- In text that reaches Claude, the listing "also escapes angle brackets". (C `skills`)
- "write guidance that should apply throughout a task as standing instructions rather than one-time steps."
  After compaction, Claude Code keeps "the first 5,000 tokens of each" invoked skill, so "Put the most important instructions near the top of `SKILL.md`." (C `skills`)
- Give exact steps only for a fragile operation, give one default and not many options, and use one term for one concept.
  "What works perfectly for Opus might need more detail for Haiku." (skill best practices)

## 5. Subagents

- "Write descriptions that single out one subagent". (C `sub-agents`)
- A subagent "doesn't see your conversation history, the skills you've already invoked, or the files Claude has already read."
  It gets the `CLAUDE.md` files and a git status, and not the output style. (C `sub-agents`)
- A review prompt names "the work to check, the plan to check it against, and what counts as a finding", and says "Report gaps, not style preferences." (C `best-practices#add-an-adversarial-review-step`)
- A `Stop` hook in the frontmatter of an agent becomes `SubagentStop`, and a block "delivers `reason` to the subagent as its next instruction". (C `sub-agents`)

## 6. Tool descriptions and results

- Describe a tool as to "a new hire on your team", and name parameters exactly: "instead of a parameter named user, try a parameter named user_id." (<https://www.anthropic.com/engineering/writing-tools-for-agents>)
- Errors: "prompt-engineer your error responses to clearly communicate specific and actionable improvements, rather than opaque error codes or tracebacks."
  When a result is cut, "steer agents with helpful instructions". (same page)
- "If a human engineer can't definitively say which tool should be used in a given situation, an AI agent can't be expected to do better." (context-engineering post)

## 7. Instruction decay and rules as checks

- "If Claude already does something correctly without the instruction, delete it or convert it to a hook." (C `best-practices`)
- "Use hooks for actions that must happen every time with zero exceptions." (C `best-practices`)
- "CLAUDE.md instructions shape Claude's behavior but are not a hard enforcement layer." (C `memory`)
- "If Claude keeps doing something you don't want despite having a rule against it, the file is probably too long and the rule is getting lost." (C `best-practices`)
- "Project-root CLAUDE.md survives compaction", and an instruction that is only in the conversation can disappear. (C `memory`)
- A reminder that is added and removed on each turn restarts the prompt cache. (PE `prompting-claude-fable-5-1#keep-the-conversation-history-append-only`)
