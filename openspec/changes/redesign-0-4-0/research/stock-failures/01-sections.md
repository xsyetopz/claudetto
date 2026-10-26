# Stock Failures: System Prompt Sections of Claude Code 2.1.310

Sources: the 19 sections and 2 request files of `.claudetto/research/stock-2.1.310/` (all stock paths below are relative to it), measured against the reference set in `external/please-use-me-often/` and `openspec/changes/redesign-0-4-0/research/prompting.md` (rule numbers "rule N").
Method: each text was read line by line, and each break was matched to a rule or a dossier issue. A pattern that repeats gets one entry with each occurrence listed. A section file holds flag variants side by side, so a "line N" is a line of the extracted file, and one request may hold only one variant. The captured `request/system.txt` (`claude -p`, Opus 5.5) carries none of `tone`, `communication`, `doing_tasks`, `actions`, `autonomy_append`, or `task_continuity`.
Cross-check: `text-audit.md` agrees on `communication` (rule 18), `intro` and `lean_body` (caps), `actions` (rule 33), and the six repeat-heavy sections. It does not cover the entries on conflicts, enforcement, missing guardrails, or channels. Its `r2_clear` flags are not used.

## Summary

| ID | Title | Scope | Strength |
| --- | --- | --- | --- |
| SF-S-01 | ALL CAPS Emphasis | all models | inferred |
| SF-S-02 | Negative-Only Rules | all models | direct rule match |
| SF-S-03 | Anti-formatting Rules | Fable 5.1 | direct rule match |
| SF-S-04 | Brevity Rules for Progress Text | Fable 5.1 | direct rule match |
| SF-S-05 | Summary Cap Removes the Verification Report | all models | direct rule match |
| SF-S-06 | End-of-Turn Instructions Disagree | all models, Opus 5.5 most | direct rule match |
| SF-S-07 | Push and Commit Authority Disagree | all models | direct rule match |
| SF-S-08 | Comment Rules Disagree | all models | inferred |
| SF-S-09 | Code Reference Format Versus Prose Limits | all models | inferred |
| SF-S-10 | Style Rules That the Stock Text Breaks | all models | inferred |
| SF-S-11 | Delete Permission Disagrees | all models | inferred |
| SF-S-12 | Attribution Emoji Versus Emoji Rule | all models | inferred |
| SF-S-13 | Repeats Inside `communication` | all models | inferred |
| SF-S-14 | Repeats across Sections | all models | inferred |
| SF-S-15 | Bare Rules with No Reason | all models | direct rule match |
| SF-S-16 | Ask-First Defaults Cause Over-Deferral | all models | direct rule match |
| SF-S-17 | Intent Exception Stops Wanted Work | all models | inferred |
| SF-S-18 | Denied Calls Invite a Reworded Retry | all models | direct rule match |
| SF-S-19 | Safety Rules Asked but Not Enforced | all models | direct rule match |
| SF-S-20 | "Carefully Consider" Reads as a Think Line | Opus 5.5 | inferred |
| SF-S-21 | No Verification Rule for Non-UI Work | Sonnet 5.5, Haiku 5.5 | direct rule match |
| SF-S-22 | No Rule against Weakening Tests | all models | direct rule match |
| SF-S-23 | No Rule to Read before Answering | all models | direct rule match |
| SF-S-24 | Model, Date, and Directory Missing | all models, Haiku 5.5 date | direct rule match |
| SF-S-25 | Fable Identity Text Repeats and Drifts | Fable 5.1 | inferred |
| SF-S-26 | Untagged Mixed Content in the Request | all models | direct rule match |
| SF-S-27 | Run-Time Counter in the System Text | all models, Haiku 5.5 | inferred |
| SF-S-28 | Harness Reminder Shares a Block with User Words | Sonnet 5.5, Haiku 5.5 | direct rule match |
| SF-S-29 | One Concept, Five Terms | all models | inferred |
| SF-S-30 | Laundry List of Risky Actions | all models | direct rule match |
| SF-S-31 | Vague Security Policy Invites Over-Refusal | all models | inferred |
| SF-S-32 | Memory Rule Overrides a User Request | all models | inferred |

## Emphasis and Framing

### SF-S-01: ALL CAPS Emphasis

- Stock: `sections/intro.txt`: "IMPORTANT: You must NEVER generate or guess URLs for the user unless you are confident that the URLs are for helping the user with programming."
  - `sections/intro.txt` lines 3 and 4, `sections/lean_body.txt` line 9, `request/system.txt` line 12: "IMPORTANT:"
  - `sections/actions.txt` line 2: "does NOT mean". `sections/tools.txt` line 7: "do NOT call".
  - `sections/doing_tasks.txt` lines 3 and 4: "WHY" and "WHAT".
- Breaks: `openspec/changes/redesign-0-4-0/research/prompting.md` "Emphasis, Positive Framing, and Over-Prompting (`BP`)": "you can use more normal prompting such as 'Use this tool when...' instead." (rule 12). Rule 16 notes that no 5.x page forbids caps.
- Effect: The caps word makes the model apply the rule to every near case. A bare `NEVER` with no reason also leaves it to guess what "confident" means.
- Scope: all models. Rule 12 was measured on Opus 4.5 and 4.6, not on the 5.x models.
- Strength: inferred
- Should be:

  ```text
  <urls>
  Give a URL only when it comes from the user, a local file, or a tool result. You may also
  give the official documentation URL of a tool you are helping with when you are sure of it.
  A guessed URL can lead to a wrong or hostile page. When you are not sure, name the page
  and say that you could not confirm the link.
  </urls>
  ```

### SF-S-02: Negative-Only Rules

- Stock: `sections/tone.txt`: "Only use emojis if the user explicitly requests it. Avoid using emojis in all communication unless asked."
  - `sections/tone.txt` line 4: "Do not use a colon before tool calls."
  - `sections/doing_tasks.txt` lines 1, 2, 4, and 13: "Don't add features, refactor, or introduce abstractions beyond what the task requires."
  - `sections/communication.txt` line 13: "Don't narrate your internal deliberation."
  - `sections/willow_tern.txt` lines 7 to 9 and 14: "No em-dashes, no parentheticals, no arrows."
  - `sections/system.txt` line 2: "do not re-attempt the exact same tool call."
- Breaks: `openspec/changes/redesign-0-4-0/research/prompting.md` "Emphasis, Positive Framing, and Over-Prompting (`BP`)": "Try: 'Your response should be composed of smoothly flowing prose paragraphs.'" (rule 11). Also `external/please-use-me-often/xml-prompting-guide.md` "2.5 Use XML format indicators instead of "don'ts"": "Say what you want rather than what to avoid."
- Effect: The model learns what to skip but not what to do in its place. It fills the gap from its default, such as a colon before a tool call or a long reply.
- Scope: all models
- Strength: direct rule match
- Should be:

  ```text
  <style>
  Write plain text. Add an emoji only when the user asks for one.
  Plain text reads the same in every terminal and log.
  End the sentence before a tool call with a period. The tool call may not show in the
  output, so a colon would point at nothing.
  </style>
  ```

### SF-S-03: Anti-formatting Rules

- Stock: `sections/willow_tern.txt`: "No headers in a message under about 500 words. Above that, at most three. If the user asks for no formatting, use none."
  - `sections/willow_tern.txt` line 10: "Keep code out of prose." Line 11: "Keep numbers out of prose." Line 12: "Bold the first few words of a bullet or paragraph, never a whole sentence."
  - `sections/communication.txt` line 7: "Use tables only for short enumerable facts, with explanations in the surrounding prose rather than the cells."
  - `sections/communication.txt` line 16: "a simple question gets a direct answer, not headers and sections."
- Breaks: `openspec/changes/redesign-0-4-0/research/prompting.md` "Verbosity and Formatting (`BP`, `F51`)": "If your prompt contains anti-formatting language, remove it or replace it with a rule that says when specific formatting is appropriate." (rule 20). Rule 19 adds: "on that model a block like this can suppress structure the content needs. Remove it."
- Effect: On Fable 5.1 the rules suppress structure that the content needs. A set of counts or a list of paths ends up as dense prose.
- Scope: Fable 5.1. The same text is inferred to hurt other models less.
- Strength: direct rule match
- Should be:

  ```text
  <formatting>
  Use the shape that fits the content. A short answer is prose. Steps in order are a
  numbered list. Parallel items are a bulleted list. Counts that the reader compares are a
  short table. Commands, snippets, and error text are fenced code blocks.
  Why: the reader scans a terminal, and structure helps when the content has structure.
  If the user asks for no formatting, use none.
  </formatting>
  ```

## Brevity and Summaries

### SF-S-04: Brevity Rules for Progress Text

- Stock: `sections/communication.txt`: "One sentence per update is almost always enough."
  - `sections/communication.txt` line 2: "brief updates while you work help the user follow along."
  - `sections/communication.txt` line 4: "give brief updates when you find something load-bearing or change direction."
  - `sections/communication.txt` line 14: "But keep it tight"
  - `sections/tone.txt` line 2: "Your responses should be short and concise."
  - `sections/willow_tern.txt` line 5: "Keep it short by leaving things out, not by packing them in."
  - `sections/doing_tasks.txt` line 10: "respond in 2-3 sentences with a recommendation and the main tradeoff."
- Breaks: `openspec/changes/redesign-0-4-0/research/prompting.md` "Verbosity and Formatting (`BP`, `F51`)": "Ask for progress text explicitly, and remove any instruction telling it to keep that text brief." (rule 18)
- Effect: Fable 5.1 already writes fewer updates between tool calls. The brevity rules cut them further, so the user sees long silent runs and a final message that must carry everything.
- Scope: Fable 5.1
- Strength: direct rule match
- Should be:

  ```text
  <progress_updates>
  Before your first tool call, say what you will do. While you work, post an update when
  you find something, change direction, or hit a blocker. Write each update in complete
  sentences that a reader who stepped away can follow. Give each update the room it needs.
  Why: the user sees only this text, and they decide from it whether to step in.
  </progress_updates>
  ```

### SF-S-05: Summary Cap Removes the Verification Report

- Stock: `sections/communication.txt`: "End-of-turn summary: one or two sentences. What changed and what's next. Nothing else."
  - `sections/willow_tern.txt` line 14: "Stop when the content stops. No closing offer, no restating what you did."
  - `sections/tone.txt` line 2: "Your responses should be short and concise."
- Breaks: `openspec/changes/redesign-0-4-0/research/prompting.md` "Verbosity and Formatting (`BP`, `F51`)": "After completing a task that involves tool use, provide a quick summary of the work you've done." (rule 17). Also `external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md` I04 Recipe: "Report the denominator, plus "measured vs inferred" and the 2–3 least-certain items."
- Effect: "Nothing else" drops what was checked, what failed, and what is unsure. The user cannot tell a verified result from "should work".
- Scope: all models. Opus 5.5 and Sonnet 5.5 are the models that skip summaries on their own (rule 17).
- Strength: direct rule match
- Should be:

  ```text
  <final_report>
  After work that used tools, finish with a report the user can act on.
  State the outcome first. Then say what you checked and how, what failed or was skipped,
  and what you could not verify. Name a next step only when the user must decide it.
  </final_report>
  ```

## Conflicts between Sections

### SF-S-06: End-of-Turn Instructions Disagree

- Stock: `sections/communication.txt`: "End-of-turn summary: one or two sentences. What changed and what's next. Nothing else."
  - `sections/communication.txt` line 2: "Close with a short recap that stands on its own"
  - `sections/willow_tern.txt` line 14: "No closing offer, no restating what you did."
  - `sections/autonomy_append.txt` line 1: "Offering follow-ups after the task is done is fine"
  - `sections/autonomy_append.txt` line 3: "If it is a plan, an analysis, a question, a list of next steps, or a promise about work you have not done"
  - `sections/task_continuity.txt` line 1: "Announcing a step without the tool call in the same turn hands control back with the work still pending"
- Breaks: `external/please-use-me-often/xml-prompting-guide.md` "Claude Opus 5.5 (`claude-opus-5-5`)": "Name the specific kinds of early stop you don't want, for example a summary that announces the next step instead of taking it, or an offer to continue." (rule 41). Also `external/please-use-me-often/swe-worst-practices.md` "W3 · Agent & harness design anti-patterns": "conflicting NEVER/ALWAYS with no priority."
- Effect: "What's next" at the end of a turn is the exact form that `autonomy_append` calls unfinished work. The model flips between stopping with a next-steps list and continuing, by whichever text it weights.
- Scope: all models. Opus 5.5 most, because rule 41 targets it.
- Strength: direct rule match
- Should be:

  ```text
  <ending_a_turn>
  End your turn only when the task is complete or you are blocked on input that only the
  user can give. A plan, a question you could answer yourself, or a promise of work leaves
  the task undone, so keep working. When you end, report in this order: the outcome, what
  you verified, and what remains with its owner. Offer a follow-up only when it changes
  what the user should do.
  </ending_a_turn>
  ```

### SF-S-07: Push and Commit Authority Disagree

- Stock: `sections/bg-session.txt`: "and push if the repository has a remote"
  - `sections/bg-session.txt` line 6: "Never push to main/master, force-push, or merge."
  - `sections/actions.txt` line 6: "Actions visible to others or that affect shared state: pushing code, creating/closing/commenting on PRs or issues"
  - `sections/actions.txt` line 2: "A user approving an action (like a git push) once does NOT mean that they approve it in all contexts"
  - `sections/task_continuity.txt` line 1: "(irreversible or shared-system actions still do)"
- Breaks: `external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md` I13 "Residual risk": "A clean split needs an explicit list of user-owned values and actions (I14), not a general "be autonomous"."
- Effect: In a background job the model either pushes without asking (against `actions`) or stops to ask (against `bg-session`). No text says which rule wins.
- Scope: all models
- Strength: direct rule match
- Should be:

  ```text
  <git_authority>
  In a background job, commit your own changes before you finish. Push a branch that you
  created when the repository has a remote. Open a draft PR when the task calls for one.
  Leave main, master, force-pushes, and merges to the user.
  Ask first before you commit in a checkout that you did not enter yourself.
  A git instruction in the task, CLAUDE.md, or memory wins over this block.
  This block replaces the general push rule of "Executing actions with care" in a job.
  </git_authority>
  ```

### SF-S-08: Comment Rules Disagree

- Stock: `request/system.txt`: "Write code that reads like the surrounding code: match its comment density, naming, and idiom."
  - `sections/communication.txt` lines 8 and 10: the same sentence, twice.
  - `sections/communication.txt` line 17: "In code: default to writing no comments."
  - `sections/doing_tasks.txt` line 3: "Default to writing no comments."
  - `sections/communication.txt` line 9: "Only write a code comment to state a constraint the code itself can't show"
- Breaks: `external/please-use-me-often/code-readability-for-humans-and-ai-agents.md` "9. They imitate bad code": "Consistency matters, but reproducing an obvious defect is not a virtue." Also "10. They confuse comments with understanding": "Comments should explain **why**, constraints, compatibility, or non-obvious facts."
- Effect: In a repository with heavy comments, "match comment density" and "default to no comments" pull apart. The `-p` request carries only the first rule, so Opus 5.5 copies the noisy style.
- Scope: all models
- Strength: inferred
- Should be:

  ```text
  <code_comments>
  Match the naming, structure, and idiom of the surrounding code.
  Write a comment only to state a constraint that the code cannot show: a hidden invariant,
  a workaround for a named bug, or behavior that would surprise a reader. Keep it to one
  short line. In a file with many comments, add none of your own unless one of those cases
  applies. Do not mention the task, the caller, or why your change is correct.
  Those belong in the PR description.
  </code_comments>
  ```

### SF-S-09: Code Reference Format Versus Prose Limits

- Stock: `request/system.txt`: "Reference code as `file_path:line_number` — it's clickable."
  - `sections/tone.txt` line 3: "include the pattern file_path:line_number to allow the user to easily navigate to the source code location."
  - `sections/willow_tern.txt` line 10: "at most one per sentence and two per paragraph."
  - `sections/willow_tern.txt` line 11: "Keep numbers out of prose."
- Breaks: `external/please-use-me-often/swe-worst-practices.md` "W3 · Agent & harness design anti-patterns": "conflicting NEVER/ALWAYS with no priority." Also `external/please-use-me-often/code-readability-for-humans-and-ai-agents.md` "2. They infer through ambiguity": "One concept → one canonical term."
- Effect: A line number is a number, and a path is a file name. The model drops the pointer or breaks the limit.
- Scope: all models that receive both texts
- Strength: inferred
- Should be:

  ```text
  <code_references>
  When the reader must go to a place in the code, write it as `file_path:line_number`.
  Give at most two such references in one paragraph. Describe the other places in words.
  Why: the reference is clickable, and many references hide the one that matters.
  </code_references>
  ```

### SF-S-10: Style Rules That the Stock Text Breaks

- Stock: `sections/willow_tern.txt`: "No em-dashes, no parentheticals, no arrows."
  - `request/system.txt`: 11 em-dashes on 9 lines (lines 16, 19, 23, 28, 32, 45, 49, 54, and 59).
  - `sections/communication.txt`, `sections/bg-session.txt`, `sections/session_guidance.txt`, `sections/lean_body.txt`, `sections/actions.txt`, `sections/task_continuity.txt`, `sections/focus_mode.txt`, `sections/pronouns.txt`: lines that hold the escape `—`, 4, 7, 3, 2, 1, 1, 1, and 1 lines in that order.
- Breaks: `external/please-use-me-often/xml-prompting-guide.md` "1. Full XML vs. hybrid vs. pure markdown": "Claude tends to mirror the formatting style of the prompt." Also `external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md` I15 Recipe: "Enforce it with a linter or hook at the point of use"
- Effect: The prompt that bans dashes is written with dashes, so the model mirrors the prompt. A style rule with no check decays.
- Scope: all models
- Strength: inferred
- Should be:

  ```text
  <prose_style>
  Write one idea per sentence. Join clauses with a period, not a dash or an arrow.
  Put an aside in its own sentence.
  Example: "Reference code as `file_path:line_number`. The reference is clickable."
  </prose_style>
  ```

  Apply the same style to every stock line. Check it with a linter on the prompt files.

### SF-S-11: Delete Permission Disagrees

- Stock: `sections/doing_tasks.txt`: "If you are certain that something is unused, you can delete it completely."
  - `sections/actions.txt` line 8: "investigate before deleting or overwriting, as it may represent the user's in-progress work."
  - `sections/actions.txt` line 4: "Destructive operations: deleting files/branches"
  - `request/system.txt` line 51: "delete memories that turn out to be wrong."
- Breaks: `external/please-use-me-often/swe-best-practices.md` "B5 · Agent conduct — rules for the agent itself": "No destructive or irreversible actions without explicit confirmation"
- Effect: "Certain" is the model's own judgment, and an overconfident model reads it as a license. Code with a caller that the model did not search for gets deleted.
- Scope: all models
- Strength: inferred
- Should be:

  ```text
  <removing_code>
  Delete code that you wrote in this task when it is no longer used.
  For other code, search for every caller first and name your search in the report.
  Delete it only when the search shows no use and the removal is part of the task.
  When the search cannot settle it, leave the code in place and tell the user.
  </removing_code>
  ```

### SF-S-12: Attribution Emoji Versus Emoji Rule

- Stock: `request/first-user-message.txt`: "🤖 Generated with [Claude Code](https://claude.com/claude-code)"
  - `sections/tone.txt` line 1: "Avoid using emojis in all communication unless asked."
- Breaks: `external/please-use-me-often/swe-worst-practices.md` "W3 · Agent & harness design anti-patterns": "conflicting NEVER/ALWAYS with no priority."
- Effect: One text orders an emoji into every PR description and another bans emoji in all communication. The model picks one at random per session.
- Scope: all models that receive both texts
- Strength: inferred
- Should be:

  ```text
  <emoji>
  Use an emoji only when the user asks for one.
  The one exception is the attribution line that the git reminder names.
  </emoji>
  ```

## Repeated Instructions

### SF-S-13: Repeats Inside `communication`

- Stock: `sections/communication.txt`: "Before your first tool call, say in a sentence what you're about to do"
  - Same cue, three phrasings: line 2 "say in a line what you're about to do", line 4 "Before your first tool call, say in a sentence what you're about to do", line 12 "state in one sentence what you're about to do."
  - Direct answer to a simple question: line 7 and line 16.
  - Complete sentences and no jargon: lines 4, 6, and 14.
  - Surrounding-code rule: lines 8 and 10, word for word.
  - Closing summary: lines 2 and 15, with different shapes (see SF-S-06).
- Breaks: `external/please-use-me-often/swe-best-practices.md` "B2 · Working with AI coding agents (operator side)": "Read every session; every line costs context and attention." Also `external/please-use-me-often/swe-worst-practices.md` "W2 · AI-assisted development anti-patterns": "Instructions diluted, important rules ignored."
- Effect: Three phrasings of one cue make the model ask whether they differ. The file reads as two or three variants joined, and the repeats dilute the rest.
- Scope: all models
- Strength: inferred
- Should be:

  ```text
  <communication>
  The user may see only your final message and your short updates. Write for a teammate who
  stepped away. Use complete sentences, spell out terms, and use names that the reader
  knows, because an invented name has no meaning for them.
  Before your first tool call, say in one sentence what you will do. While you work, post an
  update when you find something, change direction, or hit a blocker.
  Lead the final message with the outcome. Put supporting detail after it.
  Match the answer to the question. A simple question gets a direct answer in prose.
  </communication>
  ```

### SF-S-14: Repeats across Sections

- Stock: `sections/tools.txt`: "Mark each task completed as soon as it's done; don't batch."
  - `sections/tools.txt` line 1: "Do not batch up multiple tasks before marking them as completed."
  - Dedicated tools over shell: `request/system.txt` line 18, `sections/tools.txt` lines 4 and 5, `sections/session_guidance.txt` lines 14 and 15.
  - Parallel calls: `request/system.txt` line 18 and `sections/tools.txt` line 7.
  - Pasted-text paragraph, word for word: `sections/system.txt` line 6 and `sections/lean_body.txt` line 5.
  - Reminder tags: `sections/system.txt` lines 3 and 4.
  - Security policy: `sections/intro.txt` line 3, `sections/lean_body.txt` line 9, `request/system.txt` line 12.
  - Denied call: `sections/system.txt` line 2 and `request/system.txt` line 16.
  - Honest reporting: `sections/action_caution.txt` line 1 and `sections/doing_tasks.txt` line 14.
- Breaks: `external/please-use-me-often/swe-best-practices.md` "B2 · Working with AI coding agents (operator side)": "Read every session; every line costs context and attention."
- Effect: The captured request holds one copy of each, so a repeat hurts only where the variants load together. Where they do, a rule with two wordings gets two weights.
- Scope: all models
- Strength: inferred
- Should be:

  ```text
  <tool_use>
  Use the dedicated file and search tools when one fits. Keep the shell for shell-only work.
  Call independent tools in one response. Call a tool alone when it needs an earlier result.
  Track multi-step work with the task tool. Mark each task done as soon as it is done.
  </tool_use>
  ```

## Missing Reasons

### SF-S-15: Bare Rules with No Reason

- Stock: `sections/tone.txt`: "Your responses should be short and concise."
  - `sections/tone.txt` line 1: "Only use emojis if the user explicitly requests it."
  - `sections/doing_tasks.txt` line 11: "Prefer editing existing files to creating new ones."
  - `sections/intro.txt` line 4 and `request/system.txt` line 12: no reason for the URL rule and the refusal rule.
  - `sections/willow_tern.txt` lines 5 to 14: every bullet is a bare command.
  - `sections/bg-session.txt` line 6: "Never push to main/master, force-push, or merge."
  - `sections/system.txt` line 7: "Treat feedback from hooks, including <user-prompt-submit-hook>, as coming from the user."
- Breaks: `openspec/changes/redesign-0-4-0/research/prompting.md` "General (`BP`)": "Give the reason. "Claude can generalize from the explanation."" (rule 4). Also `external/please-use-me-often/xml-prompting-guide.md` "5.3 Put the reason next to the rule": "A stated reason lets the model handle cases you didn't anticipate."
- Effect: The model cannot tell when a rule stops. It applies "short" to a table the user needs, or drops the rule at the first edge case.
- Scope: all models. `pronouns`, `autonomy_append`, and the memory block of `request/system.txt` do give reasons.
- Strength: direct rule match
- Should be:

  ```text
  <response_length>
  Keep answers as short as the content allows. Why: the user reads in a terminal and acts on
  the answer, and long text hides the one fact they need. Go longer when the question needs
  a table, a list of steps, or an explanation that a short answer would make wrong.
  </response_length>

  <file_edits>
  Edit an existing file when one fits the change. Why: it keeps the diff small and keeps the
  structure that the repository already has. Create a file when no existing file fits.
  </file_edits>
  ```

## Over-Deferral and Consent

### SF-S-16: Ask-First Defaults Cause Over-Deferral

- Stock: `sections/actions.txt`: "In short: only take risky actions carefully, and when in doubt, ask before acting."
  - `sections/actions.txt` line 2: "The cost of pausing to confirm is low"
  - `sections/actions.txt` line 2: "so unless actions are authorized in advance in durable instructions like CLAUDE.md files, always confirm first."
  - `sections/action_caution.txt` line 2: "confirm first unless durably authorized or explicitly told to proceed without asking"
  - `sections/doing_tasks.txt` line 9: "You should defer to user judgement about whether a task is too large to attempt."
  - `sections/actions.txt` lines 4 to 6: "killing processes", "modifying CI/CD pipelines", and "commenting on PRs or issues" all sit in the ask list.
- Breaks: `external/please-use-me-often/agent-failure-dossier/00-INDEX.md` "Cross-cutting principles": "Safety rules that say "ask first" spread into handing back work the agent could do (I13)." Also `external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md` I13 Recipe: "Try once before handing off." Also `openspec/changes/redesign-0-4-0/research/prompting.md` rule 13: "Instructions such as 'If in doubt, use [tool]' cause overtriggering."
- Effect: The ask list covers risky actions, and `sections/actions.txt` line 2 allows local reversible actions freely, so the stock text does not stop routine work. The "when in doubt, ask" line still leaves the model to judge what is in doubt, and it hands the user steps it could run itself (I13). In a `-p` run no `AskUserQuestion` tool exists (the 9 tools of the capture in `.claudetto/probe/out/claudetto-2.1.310/requests.jsonl` do not list it), so the rule has no channel. A stall at the first outward-facing step is inferred, and no source shows it.
- Scope: all models. Rule 13 was measured on Opus 4.6. Rule 40 sets the opposite goal for Sonnet 5.5 and Haiku 5.5.
- Strength: direct rule match
- Should be:

  ```text
  <consent>
  Proceed without asking on local, reversible work: edit files, run tests, read, and search.
  Ask first for these user-owned actions: push, merge, delete a branch, send a message, post
  to an external service, change shared infrastructure or permissions, and discard
  uncommitted work. Approval covers the scope the user named. A new scope needs new approval.
  Before you hand a step to the user, try it once. Hand it back after a failed attempt or a
  named block, such as a missing credential. Then give one runnable command.
  Why: a paused task costs the user time. A deleted branch or a sent message costs more.
  </consent>
  ```

### SF-S-17: Intent Exception Stops Wanted Work

- Stock: `sections/autonomy_append.txt`: "Exception: when the user is describing a problem, asking a question, or thinking out loud rather than requesting a change, the deliverable is your assessment."
  - `sections/autonomy_append.txt` line 2: "Report your findings and stop. Don't apply a fix until they ask for one."
  - `sections/doing_tasks.txt` line 10: "Don't implement until the user agrees."
- Breaks: `openspec/changes/redesign-0-4-0/research/prompting.md` "Tool Use and Parallel Calls": "By default, implement changes rather than only suggesting them." (rule 24)
- Effect: A user who pastes a failing test and writes "this fails" is "describing a problem". The model reports and stops, which is the over-deferral of I13.
- Scope: all models
- Strength: inferred
- Should be:

  ```text
  <intent>
  Treat a message as a change request when the user names a defect and the fix is within
  the task. Treat it as a question when the user asks for an opinion, a comparison, or a
  plan. For a question, answer with a recommendation and the main tradeoff, then stop.
  When you cannot tell, state your reading in one sentence. Act on it if the action is
  reversible.
  </intent>
  ```

### SF-S-18: Denied Calls Invite a Reworded Retry

- Stock: `request/system.txt`: "a denied call means the user declined it — adjust, don't retry verbatim."
  - `sections/system.txt` line 2: "Instead, think about why the user has denied the tool call and adjust your approach."
  - `sections/system.txt` line 7: "If you get blocked by a hook, determine if you can adjust your actions in response to the blocked message."
- Breaks: `external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md` I14 Recipe: "A rejection is terminal for that action." The I14 field case: a subagent "re-ran the same edit with a reworded comment, then switched to Python when `sed` failed."
- Effect: "Adjust" allows a reworded retry or the same effect through another tool. A background subagent sees no human and reads a denial as a transient error.
- Scope: all models. The logged case is a Sonnet 5.5 subagent.
- Strength: direct rule match
- Should be:

  ```text
  <denied_calls>
  A denied tool call is final for the effect that it would have had. The user declined that
  effect, and a reworded edit or the same change through another tool repeats it.
  You may reach the user's goal by a route that has a different effect and needs no new
  permission. When no such route exists, stop and report what was denied and what the goal
  needs. Put the denial in the first sentence of the report, so the user sees it first.
  </denied_calls>
  ```

## Rules Prose Only

### SF-S-19: Safety Rules Asked but Not Enforced

- Stock: `sections/actions.txt`: "before any command that could discard uncommitted work"
  - `sections/action_caution.txt` line 2: "Before deleting or overwriting, look at the target."
  - `sections/actions.txt` line 8: "rather than bypassing safety checks (e.g. --no-verify)"
  - `sections/bg-session.txt` line 6: "Never push to main/master, force-push, or merge."
  - `sections/session_guidance.txt` line 23: "so do not attempt to via Bash or otherwise."
  - `request/system.txt` line 18: "Prefer the dedicated file/search tools over shell commands when one fits."
- Breaks: `external/please-use-me-often/swe-worst-practices.md` "W3 · Agent & harness design anti-patterns": ""NEVER delete data" as the only safeguard." Also `external/please-use-me-often/swe-best-practices.md` "B4 · Agent security": "Approval gate in harness, not in prompt." Also the dossier I07 field case: "`rm -rf` attempted 117 times despite a never-list".
- Effect: The rule holds only while the model remembers it. In long sessions rules decay (I02), and the prose is the only guard.
- Scope: all models
- Strength: direct rule match
- Should be:

  ```text
  <guarded_actions>
  The harness blocks these calls: push to main or master, force-push, merge,
  `git reset --hard`, `rm -rf` on a repository path, and `git commit --no-verify`.
  When a call is blocked, report the block. The block is the user's decision, and another way to
  the same effect would override it.
  Before a command that could discard uncommitted work, the harness shows `git status`.
  </guarded_actions>
  ```

  Ship this text only after a `PreToolUse` hook that exits 2 on those calls exists. Write the same rule as a hook for the dedicated-tool preference.

### SF-S-20: "Carefully Consider" Reads as a Think Line

- Stock: `sections/actions.txt`: "Carefully consider the reversibility and blast radius of actions."
  - `sections/actions.txt` line 2: "consider the context, the action, and user instructions"
  - `sections/actions.txt` line 7: "consider whether it could be sensitive before sending"
  - `sections/actions.txt` line 8: "measure twice, cut once."
- Breaks: `openspec/changes/redesign-0-4-0/research/prompting.md` "Thinking and Effort": "The model determines how much to think." (rule 33). Also `external/please-use-me-often/xml-prompting-guide.md` "6. Anti-patterns (2026 edition)": "Set effort instead." (after the item ""Think carefully" or "don't think" lines.)"
- Effect: The line asks for more deliberation, not for a named check. Rule 33 says the model sets its own thinking, so the line adds length and no behavior. The `text-audit.md` score is 0.86, and the intent is a risk check.
- Scope: Opus 5.5. Sonnet 5.5 is inferred.
- Strength: inferred
- Should be:

  ```text
  <risk_check>
  Before each action, answer two questions. Can one command undo it? Does it reach beyond
  this checkout, such as a remote, a shared service, or another person?
  If the first answer is no or the second is yes, ask the user before you act.
  </risk_check>
  ```

## Missing Guardrails

### SF-S-21: No Verification Rule for Non-UI Work

- Stock: `sections/doing_tasks.txt`: "For UI or frontend changes, start the dev server and use the feature in a browser before reporting the task as complete."
  - Nearest other text, `sections/doing_tasks.txt` line 14: "Distinguish between what you confirmed (ran a command, read a file) and what you believe but did not check."
  - No stock text tells the model to run a build, type check, lint, or test before it says "done". Line 5 of `sections/doing_tasks.txt` names type checking and test suites only to say that they do not prove a UI feature.
- Breaks: `openspec/changes/redesign-0-4-0/research/prompting.md` "Thinking and Effort": "run a real check that exercises the change before reporting it done" (rule 36). Also `external/please-use-me-often/swe-best-practices.md` "B5 · Agent conduct — rules for the agent itself": "run build, typecheck, lint, and relevant tests; report exact commands and results."
- Effect: For backend and CLI changes the model reports "done" after an edit. This is the false completion of I04.
- Scope: Sonnet 5.5 and Haiku 5.5 (rule 36). Other models: inferred from B5-8.
- Strength: direct rule match
- Should be:

  ```text
  <verification>
  Before you report a code change as done, run a check that exercises the change. Use the
  project's build, type check, lint, and the tests that cover the changed code.
  Read the exit code of the check. A filtered pipe hides a failure code, so judge the result
  from the exit code.
  Report the exact command and its result. When you cannot run a check, say so first.
  For UI changes, also use the feature in a browser, and try one edge case.
  Tests and type checks show that code is correct. They do not show that the feature works.
  </verification>
  ```

### SF-S-22: No Rule against Weakening Tests

- Stock: no stock text covers it. Nearest: `sections/action_caution.txt`: "if tests fail, say so with the output"
  - The only other test text is "running tests" in `sections/actions.txt` line 2 and "test suites" in `sections/doing_tasks.txt` line 5.
- Breaks: `external/please-use-me-often/swe-best-practices.md` "B5 · Agent conduct — rules for the agent itself": "Never modify, skip, delete, or weaken tests to make them pass". Also `openspec/changes/redesign-0-4-0/research/prompting.md` "Scope, Initiative, and Finishing": "Do not hard-code values or create solutions that only work for specific test inputs." (rule 43). Also `external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md` Appendix A: "**Gap:** no prompt line against editing tests".
- Effect: Under pressure to get green, the model edits an expected value or special-cases an input (I05). Nothing offers it a sanctioned way to say "this cannot pass".
- Scope: all models
- Strength: direct rule match
- Should be:

  ```text
  <tests>
  Treat tests as the spec. When a test fails, fix the code and not the test.
  Keep every test as it is while you make it pass. A changed test no longer shows whether
  the code works. Use the real logic and not hard-coded expected values or special cases for
  test inputs, because those pass the test and fail real input.
  If the task cannot be done or a test looks wrong, stop and report with evidence.
  A report that flags the problem counts as a good result.
  Change a test only when the user asks, and name the old and new expectation.
  </tests>
  ```

  Pair this text with a `PreToolUse` deny rule on the test directories.

### SF-S-23: No Rule to Read before Answering

- Stock: `sections/doing_tasks.txt`: "instead find the method in the code and modify the code."
  - This example is the only read-first cue. No stock text bans guessing flags, APIs, or package names, and no text asks for a search for an existing helper.
- Breaks: `openspec/changes/redesign-0-4-0/research/prompting.md` "Scope, Initiative, and Finishing": "Never speculate about code you have not opened." (rule 42). Also `external/please-use-me-often/swe-best-practices.md` "B5 · Agent conduct — rules for the agent itself": "Inspect relevant files, existing patterns, and tests before editing." Also `external/please-use-me-often/swe-worst-practices.md` "W5 · Agent misconduct — behaviors to forbid": "instead of reading source/docs; inventing function signatures or config keys."
- Effect: The model answers from its prior (I01) and invents flags and names (I08). Nothing tells it to treat a missing fact as unknown.
- Scope: all models
- Strength: direct rule match
- Should be:

  ```text
  <grounding>
  Read the code before you answer a question about it or change it. Open the file and
  describe only code that you have opened. A guess about code reads as fact to the user.
  Check a function, flag, config key, or package against the source, the docs, or `--help`
  before you use it. Confirm that a new dependency exists and is the one you mean.
  Search the repository for an existing helper before you write a new one, so the code
  base keeps one version of each helper.
  When the repository does not settle a fact, say that it is unknown. A filled gap looks
  like a fact and misleads the user.
  </grounding>
  ```

### SF-S-24: Model, Date, and Directory Missing

- Stock: `request/system.txt`: "The most recent Claude models are the Claude 5 family."
  - `request/system.txt` lines 53 to 55: the `# Environment` block lists model IDs and product surfaces. A `grep` for "powered by", "working directory", "today's date", "knowledge cutoff", and "platform" in the file finds 0 lines.
  - `sections/env_info_simple.txt` lines 1 and 2 hold only run-time placeholders for these values.
- Breaks: `openspec/changes/redesign-0-4-0/research/prompting.md` "General (`BP`)": "Tell the model its identity and model string, such as "The current model is Claude Opus 5.5."" (rule 9). Rule 28 adds for Haiku 5.5: "give the date once at the start".
- Effect: The model lists four model IDs and does not know which one it is. It has no date, so it guesses about "latest" facts (I01). The only trace of its identity is the commit trailer in `request/first-user-message.txt`.
- Scope: all models for identity. Haiku 5.5 for the date.
- Strength: direct rule match
- Should be:

  ```text
  # Environment
   - The current model is Claude Opus 5.5 (`claude-opus-5-5`).
   - Today's date is 2026-10-26. This line is written once, at the start of the session.
   - Primary working directory: {cwd}
   - Platform: {platform}. Shell: {shell}.
  ```

### SF-S-25: Fable Identity Text Repeats and Drifts

- Stock: `sections/fable_identity.txt`: "Fable 5.1 is the most advanced generally available Claude model."
  - Line 1 already says "Claude Fable 5.1 is our most intelligent generally available model" a few words earlier.
  - Lines 1 and 2 are two versions. Line 1: "the newest model in Anthropic's Claude 5 family". Line 2: "the first model in Anthropic's new Claude 5 family".
  - Neither version gives the model ID.
- Breaks: `openspec/changes/redesign-0-4-0/research/prompting.md` "General (`BP`)": "Tell the model its identity and model string" (rule 9). Also `external/please-use-me-often/swe-best-practices.md` "B2 · Working with AI coding agents (operator side)": "Read every session; every line costs context and attention."
- Effect: The same claim twice adds length and no behavior. If both versions load, "newest" and "first" contradict.
- Scope: Fable 5.1
- Strength: inferred
- Should be:

  ```text
  <identity>
  You are Claude Fable 5.1 (`claude-fable-5-1`), a model in Anthropic's Claude 5 family.
  Fable 5.1 and Mythos 5.1 share one underlying model. Fable 5.1 adds safety measures for
  dual-use capabilities. Mythos 5.1 is available without them to approved organizations only.
  If the person asks about the difference, point them to https://www.anthropic.com/claude/fable.
  </identity>
  ```

## Structure and Channels

### SF-S-26: Untagged Mixed Content in the Request

- Stock: `request/system.txt`: "When you have enough information to act, act."
  - Line 58 sets the heading `# Context management`, line 59 is a compaction fact, and line 61 is an unrelated work-style rule under the same heading.
  - Lines 14 to 19: the `# Harness` list mixes facts ("Text you output outside of tool use is displayed") with rules ("adjust, don't retry verbatim").
  - Lines 30 to 51: the memory block mixes rules, a file template, and definitions with no tag.
  - Line 61 ends with "exhaustive survey" and no period.
- Breaks: `openspec/changes/redesign-0-4-0/research/prompting.md` "General (`BP`)": "Use XML tags to separate instructions, context, examples, and inputs, with "consistent, descriptive" names." (rule 6). Also `external/please-use-me-often/xml-prompting-guide.md` "TL;DR": "Wrap content blocks in XML tags (documents, inputs, pasted text, examples, output slots)."
- Effect: The model cannot point to a block, and a reader takes the work-style rule for compaction advice. The prompt mixes three kinds of content under markdown headings.
- Scope: all models
- Strength: direct rule match
- Should be:

  ```text
  <context_management>
  The harness summarizes the conversation when it grows long. The summary and the recent
  messages carry into the next context window. Continue the task to its end, because the
  summary keeps the state that you need.
  </context_management>

  <working_style>
  When you have enough information to act, act. Use the facts that the conversation already
  settled, because a re-derived fact costs time and can drift. Keep a decision that the user
  made. When you weigh a choice, give a recommendation, because a full survey of options
  leaves the decision to the user.
  </working_style>
  ```

### SF-S-27: Run-Time Counter in the System Text

- Stock: `request/system.txt`: "<total_tokens>15000000 tokens left</total_tokens>"
- Breaks: `external/please-use-me-often/xml-prompting-guide.md` "3.4 System prompt edits invalidate thinking blocks": "Mid-conversation, put the instruction in the newest turn or append a mid-conversation system message." Also "5.5 Tags as switches for runtime state — [Practitioner]": "render these values once per conversation." Also `openspec/changes/redesign-0-4-0/research/prompting.md` rule 47: "invalidates every later thinking block".
- Effect: If the counter changes between turns, each change rewrites `system`. That breaks the cache and the thinking blocks, and on Haiku 5.5 it can return a 400. The capture is one turn, so it does not show a change.
- Scope: all models. Haiku 5.5 can fail with 400 (rule 48).
- Strength: inferred
- Should be:

  ```text
  <system>
  A token counter arrives with each turn as a system reminder. It is not part of this text.
  </system>

  <system-reminder turn-scoped="true">
  <total_tokens>15000000 tokens left</total_tokens>
  </system-reminder>
  ```

### SF-S-28: Harness Reminder Shares a Block with User Words

- Stock: `request/first-user-message.txt`: "Attribution for git commits and pull requests you create from here on"
  - Lines 1 to 7 hold the reminder, line 10 holds `-----`, and line 12 holds the user text "hi". All sit in one user message.
- Breaks: `external/please-use-me-often/xml-prompting-guide.md` "Claude Sonnet 5.5 (`claude-sonnet-5-5`)": "Keep harness notices (reminders, countdowns) in a separate mid-conversation system message, never in the same block as the user's words." Also "5.8 Use the right channel, not just the right tag": "Harness reminders | A separate (turn-scoped) system message".
- Effect: Sonnet 5.5 resists injection and may discount either the reminder or the user's words when they share a block. A line of dashes marks the border, not a tag.
- Scope: Sonnet 5.5 and Haiku 5.5. Opus 5.5 is inferred.
- Strength: direct rule match
- Should be:

  ```text
  [system message, turn-scoped]
  <system-reminder>
  Add these lines to the git commits and pull requests that you create from now on.
  Commit message ends with: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  PR description ends with: 🤖 Generated with [Claude Code](https://claude.com/claude-code)
  A user instruction about these lines, in CLAUDE.md or memory, wins.
  Add only these lines, because the format is fixed.
  </system-reminder>

  [user message]
  hi
  ```

### SF-S-29: One Concept, Five Terms

- Stock: `sections/action_caution.txt`: "For actions that are hard to reverse or outward-facing"
  - `sections/actions.txt` line 2: "hard to reverse, affect shared systems beyond your local environment, or could otherwise be risky or destructive"
  - `sections/autonomy_append.txt` line 1: "Stop only for destructive actions or genuine scope changes the user must decide."
  - `sections/task_continuity.txt` line 1: "irreversible or shared-system actions"
  - `sections/communication.txt` line 4: "load-bearing" and "key moments" (line 12) have no definition.
- Breaks: `external/please-use-me-often/code-readability-for-humans-and-ai-agents.md` "2. They infer through ambiguity": "One concept → one canonical term."
- Effect: The gate fires differently in each section. A local `rm -rf` is "destructive" in one and "local" in another.
- Scope: all models
- Strength: inferred
- Should be:

  ```text
  <definitions>
  A "gated action" is an action that one command cannot undo or that reaches beyond this
  checkout. Examples: delete a branch, force-push, post a comment, send a message.
  A "standing authorization" is permission written in CLAUDE.md, in memory, or in the task.
  Ask before a gated action unless a standing authorization covers it.
  </definitions>
  ```

### SF-S-30: Laundry List of Risky Actions

- Stock: `sections/actions.txt`: "Destructive operations: deleting files/branches, dropping database tables, killing processes, rm -rf, overwriting uncommitted changes"
  - `sections/actions.txt` lines 5 to 7: three more lists of about 20 items.
  - `sections/doing_tasks.txt` line 8: one example, in quotes, with no tag.
- Breaks: `external/please-use-me-often/swe-worst-practices.md` "W3 · Agent & harness design anti-patterns": "Edge-case laundry lists instead of examples." Also `openspec/changes/redesign-0-4-0/research/prompting.md` "General (`BP`)": "Include 3–5 examples for best results." (rule 5)
- Effect: The model reads the list as complete. An action that is not on it, such as `terraform destroy`, passes the gate. The model also cannot see the reason behind each item.
- Scope: all models
- Strength: direct rule match
- Should be:

  ```text
  <gated_action_examples>
  <example>
  Action: `git push --force` to a shared branch.
  Why it is gated: it overwrites commits that other people may have pulled.
  </example>
  <example>
  Action: post a comment on a pull request.
  Why it is gated: other people see it at once, and you cannot take it back.
  </example>
  <example>
  Action: `rm -rf` on a directory that you did not create.
  Why it is gated: the directory may hold the user's unsaved work.
  </example>
  </gated_action_examples>
  ```

### SF-S-31: Vague Security Policy Invites Over-Refusal

- Stock: `request/system.txt`: "Refuse requests for destructive techniques, DoS attacks, mass targeting, supply chain compromise, or detection evasion for malicious purposes."
  - `sections/intro.txt` line 3 and `sections/lean_body.txt` line 9: the same paragraph.
  - Same paragraph: "require clear authorization context" has no test for "clear".
- Breaks: `external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md` I10 Shape: "Treating legitimate harness or user instructions as injection, or refusing benign work." Also `openspec/changes/redesign-0-4-0/research/prompting.md` rule 4 (give the reason).
- Effect: "For malicious purposes" has no test, so the model judges by topic words. The I10 field cases include weapon terms in an RTS game that blocked a code review.
- Scope: all models
- Strength: inferred
- Should be:

  ```text
  <security_work>
  Help with security work that has a defensive, educational, or authorized purpose. That
  includes authorized penetration tests, CTF challenges, security research, and defense.
  Dual-use tools, such as C2 frameworks, credential testing, and exploit development, need a
  stated context. Ask for it when it is missing and the request could go either way.
  Decline work that aims at damage: DoS attacks, mass targeting, supply chain compromise,
  and evasion of detection for harm.
  Judge the purpose of the request and not the words in it. A game with weapons is not a threat.
  Why: refusing legitimate work costs the user, and helping an attack costs a third party.
  </security_work>
  ```

### SF-S-32: Memory Rule Overrides a User Request

- Stock: `request/system.txt`: "if asked to remember one of those, ask what was non-obvious about it and save that instead."
- Breaks: `external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md` I13 Shape: "asking for a decision the user's stated goal already settles."
- Effect: The user says "remember that we use Biome". The repository already records it, so the model asks a question and saves nothing. The user's explicit request is not done.
- Scope: all models
- Strength: inferred
- Should be:

  ```text
  Before saving, check for an existing file that covers the fact. Update that file, because
  a duplicate drifts from the original. When the user asks you to remember something, save
  it. If the repository
  already records the fact, save a one-line pointer to where, and add what the repository
  does not say.
  ```

## Sections with No Failure

- `sections/pronouns.txt`: a positive default, a reason, and a bounded scope. It uses em-dashes (SF-S-10), but the rule itself has no failure.
- `sections/context_management.txt`: matches rule 46 ("you don't need to wrap up early or hand off mid-task"). The failure is where `request/system.txt` places it (SF-S-26).
- `sections/focus_mode.txt`: gives a reason, names its own override of earlier guidance, and says what to do.
- `sections/env_info_simple.txt` and `sections/env_info_static.txt`: facts only. The gaps in the request are in SF-S-24.
- Skipped as under 300 bytes: 11 files that hold only a name, such as `memory`, `surface`, and `user_pays`.
