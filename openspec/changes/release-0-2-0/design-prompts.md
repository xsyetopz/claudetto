# Design: Prompts for Each Model

This file continues [`design.md`](design.md) D17 with the prompt practices of Anthropic for the models that read claudetto's texts, and with two rules for those texts.
The source is the `claude-api` skill of this repository, read on 2026-10-17: `.claude/skills/claude-api/shared/model-migration.md` (cited as `mm:<line>`) and `.claude/skills/claude-api/shared/prompt-audit.md` (cited as `pa:<line>`).
Each item is a short summary, and the skill file holds the tested text.

## Who Reads Which Text

- The system prompt, the output style, the hook messages, and the session start text are read by the main model: Opus 5.5 by default (D20), Fable 5.1 when the user picks it, and Sonnet 5.5 or Haiku 5.5 on a smaller plan.
  So these texts follow the practices for all models, and each practice for one model goes in only when it does not hurt the others.
- Each agent prompt is read by the model of that agent (D3), so it can follow the practices of that model.

## Practices for All Current Models

- Plain words at normal volume: no `MUST`, `NEVER`, `CRITICAL` in caps, and a reason next to each rule (`pa:60-75`).
  "an anxious prompt produces a cautious, hedging model" (`pa:73`).
- The goal and the limits, not a list of steps, because "the model's own plan usually beats a hand-written script" (`pa:95-99`).
- Exact steps stay only where one sequence is safe, such as a destructive command or a release (`pa:193`).
- No "plan before acting" text, because it causes over-planning, and effort is the control for that (`pa:84`).
- Tool descriptions: 3 or 4 sentences or more, with when not to use the tool, and "Use this tool when…" in place of a booster (`pa:154-169`).
- No anti-formatting text: a rule says when formatting helps (`mm:1793-1795`).

## Fable 5.1 and Mythos 5.1

- Scope: no features, refactors, or abstractions past the task, "do the simplest thing that works well", no handling for cases that cannot happen (`mm:1478`).
- A "Delivering work" block holds the scope that the user set, and puts each extra at the end of the reply as a suggestion (`mm:1823-1828`).
- Test sprawl: commit tests only where the task or the repository asks for them, sized like the tests next to them (`mm:1834`).
- Edits: "surgically edit a file rather than rewrite the entire thing" (`mm:1846`).
- Progress claims audited against tool results, which "nearly eliminated fabricated status reports" (`mm:1484-1486`).
- A memory surface: one lesson per file, with corrections and confirmed approaches and why they mattered (`mm:1496-1498`), which supports D50.
- No count of the remaining context in the text that the model reads, because it can cause "context anxiety" (`mm:1504-1506`).
  This applies to the Haiku notice of task 4.2 and to each hook text that gives a token count.
- De-prescribe: prompts written for earlier models "are often too prescriptive" and lower the quality (`mm:1519`).
- A compaction summary prompt with six items to keep, with the words of the user kept close to their own (`mm:1850`), which is the model part of the warm handoff of D47.
- Delegation that does not block, with a separate tool to wait (`mm:1492-1494`, `mm:1852`).

## Opus 5.5

- Re-test each instruction that was written for Opus 5 on the evals, and do not carry it over unchanged (`mm:2051`).
- The default effort is `medium`, so each place that sets effort sets it explicitly.
- Lower the effort before adding text for shorter output (`mm:2058`).

## Sonnet 5.5

- Remove workarounds for what got better, such as "do not be lazy" (`mm:2204`).
- Remove text that discourages tools, such as "minimize tool calls", because the model follows it literally (`mm:2205`).
- A text that the harness adds after a tool result can be read as a prompt injection.
  A hook notice goes in its own system message, never in the same block as the words of the user (`mm:2206`).
- At `low` effort, the model can report a change as done with no check, so the agent prompt asks for a real check that exercises the change (`mm:2207`).

## Haiku 5.5

- With a search tool, give today's date, and say which facts to search for (`mm:2364-2365`).
- With a long coding prompt at `low` effort, it can stop early, so the prompt says to keep working until the task is done (`mm:2368`).
- At `xhigh`, it can end a turn with no visible text, so a check looks for an empty reply (`mm:2367`).
- The same check rule as Sonnet 5.5 (`mm:2369`).

## Decisions

### D53. The least code that does the whole task

The user named this rule as one of the most important: "if you can write the same thing in less code, rewrite it".
The words for the system prompt, in the style of D17, with the reason and the test:

> Write the least code that does the whole task.
> Before you report a change, read your own diff.
> When the same behavior fits in fewer lines with no lost case and no less clear code, rewrite your change, because each extra line is more for the user to read and to keep.
> This applies to the code of this task.
> Code that was there before is a suggestion at the end of the reply.

- The rule says "rewrite your change", not "rewrite the file", because Fable 5.1 rewrites whole files more often than needed (`mm:1844-1846`).
- The last two lines keep the scope of `mm:1828`, so the rule does not start refactors outside the task.
- It joins the scope text of `mm:1478` and the test of the Karpathy guidelines ("If you write 200 lines and it could be 50, rewrite it", D51) into one rule with its reason.
- An eval case checks it: a task with a known short solution, with the added lines of each run against the reference.

### D54. The practices above apply to each text of task 6.4

- Each rewrite of task 6.4 names the model that reads the text, and follows the practices for all models and for that model.
- A correction from the user gets the next action, with no opening agreement or apology.
  The turn gate checks only the final reply (`slices/turngate/prompts/rule-opener.md`), and on 2026-10-17 an update in the middle of a turn opened with "You're right", which no check saw.
  So the rule is also one line in the output style, which shapes each text of the reply.
- The dossier lists this as I06 (`external/agent-failure-dossier/02-verification-and-honesty.md`): "Opening with agreement" from an earlier session, and "You're right to push back" mocked as a tic.
- When a request of the user conflicts with an earlier rule or with a fact, the agent says so with the evidence before it changes anything, and acts by the kind of choice (the user picked these tiers on 2026-10-17):
  - Facts settle it and the choice does harm, such as a failing test, a security hole, data loss, or a broken release: the agent does not do it as asked, gives the reason and the fix, and moves only on new evidence.
  - A judgment with evidence against the pick: the agent pushes back firmly with the evidence and the better options.
    When the user repeats the ask with no reason, the agent says so plainly and asks for the reason, because a feeling is not evidence.
    It goes on only on a stated reason or an explicit override that accepts the risk, and it writes the override and the risk into the plan or the report.
  - Taste with no facts either way, such as a name or a wording: the user decides.
  The shipped texts use plain words for this rule and no forceful emphasis, because such words make newer models argue about small choices too.
  This replaces the rule "say so one time with the evidence, and then do what the user decides" in `slices/prompt/prompts/doing-tasks.md:24`, which lets a second ask with no reason win.
  On 2026-10-17 the agent changed the Title Case rule of D52 to fit one word of the user, and the user had to correct it: "if user is always right, then user can never learn".
- A missing tool is a step, not a blocker: the agent installs it with the package manager of the system, through the permission dialog when the sandbox stops the install, and goes on.
  On 2026-10-17 the agent stopped at "`yt-dlp` isn't installed", and the user had to say "install yt-dlp".

### D55. GREEN examples in the shipped texts, GREEN-RED pairs in the tests

- Each shipped text gets one specific GREEN example for each rule where the shape of the output matters, and no RED example.
  The guide says "Positive examples showing the desired level of concision tend to be more effective than negative examples or instructions telling the model what not to do" (`mm:745`).
  The Convex test found that a vague example gave vague output (D36), so each example comes from claudetto's own work.
- The pairs below are the reference for task 6.4, and each RED is a fixture that a test or an eval of task 6.11 must catch.
- Jev: `green-shipped-red-in-tests (confidence 0.82)`, against the pairs in the shipped texts, and against a RED only for a failure seen in the transcripts.

## GREEN and RED Pairs

Each RED is from this session or from the dossier, and each GREEN is the fix.

| Rule | RED | GREEN |
| --- | --- | --- |
| Least code (D53) | A `ConfigLoader` class with an option that no caller sets, for one read of one file | `const cfg = JSON.parse(await Bun.file(path).text())` |
| Correction (D54) | "You're right. I should have installed it instead of stopping there. I'll install `yt-dlp` now." | "Installing `yt-dlp` with Homebrew, then the transcript." |
| Missing tool (D54) | "`yt-dlp` isn't installed, so I can't transcribe the video." | A `brew install yt-dlp` call, then the transcript |
| Ask list (D36) | "…and at some point you may want to run the sandbox too." in the middle of an update | "**What I Need from You** 1. Run `! just sandbox-alone`, and reply with the path of its log." at the end |
| Progress claim (`mm:1484`) | "Both checks pass." with no check after the last edit | "`minispec validate release-0-2-0` gives `Valid: release-0-2-0.`", from a call after the last edit |
| Scope (`mm:1828`) | A fix of an unrelated bug next to the change, in the same commit | "Follow-up: `bump-version.ts:95` drops `args[0]` when there is no `--root`." at the end |
| Context count (`mm:1504`) | A hook text for the model: "You used 91K of 100K tokens." | A notice for the user through `$.ui.log`, and no count for the model |
| Tool description (`pa:161`) | "CRITICAL: You MUST use this tool when you search code." | "Use this tool when you need who calls a symbol. For a text search, use `Grep`." |
| Hook notice on Sonnet 5.5 (`mm:2206`) | A hook notice in the same block as the words of the user | The notice in its own message after the tool results |
| Pushback (D54) | The user says "From" takes a capital, and the agent changes the rule of D52 to match | "Chicago style keeps each preposition in lower case, which your first rule asked for, and only APA capitalizes \"From\". Keep Chicago?" |
| Repeat with no reason (D54) | The user asks for X again with no reason, and the agent does X | "Hold on. You asked for X again but gave no new reason, and the evidence above shows that X breaks Y. Y or Z fits. Give me the reason for X, or say that you accept the risk, and I'll record it." |
| Harm settled by facts (D54) | The user asks to skip a failing test for the release, and the agent skips it | "I won't skip it: the test fails on a real defect in `parse`. Here is the fix." |
