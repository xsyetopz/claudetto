# Compliance findings from past sessions

Labels: **confirmed** means counted or read in the transcripts.
**inferred** means a reading of the data that the data does not prove.

## 1. Scope of the data

- **Confirmed:** `~/.claude/projects/` holds one folder, for this repo.
  It has 14 transcript files and 45 MB.
- **Confirmed:** All sessions are from 2026-10-07, on Claude Code 2.1.292 and 2.1.293.
  The user wiped older sessions, so no 0.26.x or 0.27.x history exists.
- **Confirmed:** Only 6 sessions have more than 30 assistant turns (up to 369 turns, context up to 265K).
  Six sessions are empty or one-line greetings (`hi`, `Hello, World!`, `claude`).
- **Confirmed:** The 50 non-empty user texts hold 0 messages that say "I told you" or "you did not follow".
  Many "user" texts are quoted assistant output that the user pasted back, with a `>` prefix, to answer one point.
- **Confirmed:** The only `output_style_instructions` attachment is in one session.
  Output-style and CLAUDE.md compliance can be judged on that data only.
- The sample is small, so each rate below is a weak signal.

## 2. User corrections

**Confirmed count:** 3 clear corrections in 50 user texts.
Another 4 are redirects that change scope.
None names a broken CLAUDE.md or output-style rule.

| # | Session, version, context | Instruction broken | What the assistant did | Source |
| --- | --- | --- | --- | --- |
| 1 | 157f1ff7, 2.1.293, 45K | "Look where user was left off, and continue from there" | Started task 1.1 edits, user interrupted, then said "not yet. no implementation yet. user paused" | User message, over-read of "continue" |
| 2 | 157f1ff7, 2.1.293, 108K | "Route A ... let user first invoke the `sudo` commands" | The user chose the order: finish research first, user runs `sudo` steps after | User message (a choice, not a breach) |
| 3 | 00bfd354, 2.1.293, 245K | "you do that" (2.6 `/context` capture) | Had asked the user to run a step that the assistant could run itself | User message |
| 4 | 00bfd354, 2.1.293, 245K | "give user a command you need" for 2.11 | Gave a description, not a ready command | User message |
| 5 | 00bfd354, 2.1.293, 225K | "not yet" on VS Code and desktop runs (2.6, 2.25) | Task list assumed those runs were possible | User message, stale task text |
| 6 | 9523acac, 2.1.293, 147K | D2 tier ("dotclaude runs at the user tier") | User reported a different tier from the log | User message, design error |
| 7 | 087f5a37, 2.1.292, 36K | Context at start ("32k/300k ... a major problem") | Not a breach: the user reported an overhead of the plugin | User message |

- **Confirmed:** Cases 1, 3, and 4 are the true "wrong action" corrections.
  Cases 2, 5, 6, and 7 are new facts or decisions.
- **Confirmed:** No correction is about line breaks, semicolons, ASD-STE100, or git.
- **Inferred:** Corrections cluster on "who runs this step" and "do not start yet".
  Both come from the sandbox limits, which block `sudo`, local ports, and the desktop app.

## 3. Refusals

- **Confirmed:** 11 assistant turns match the refusal patterns.
  9 are false matches, such as "I can't see" inside a long report.
- **Confirmed:** 2 real refusals.
  Both state "the sandbox blocks local port binding, so I cannot run the capture proxy" (9523acac turn 89, ce160872 turn 72).
  Both are valid, because the sandbox blocks `listen`.
  Both give a fallback (a user command, or the debug log) and then comply with the fallback.
- **Confirmed:** 1 classifier denial, not a model refusal.
  Session 00bfd354 turn 276: an auto-mode classifier denied a `Bash` that read the account token to probe plan data.
  The reason was "Credential Exploration".
  The user had asked for the probe in an earlier message.
  The assistant did not retry the same command.
  It moved on to a sandbox model run (turn 279) and wrote `research/account.md` later.
- **Inferred:** The denial follows the classifier rule, although the user had asked for the probe.
  I did not check if the classifier saw that user message.

## 4. Hook blocks and Stop-hook retries

- **Confirmed:** 56 hook events, all `PreToolUse:Bash` by `auto-mode-guard.mjs`.
  All 56 gave `permissionDecision: "ask"`, none gave `deny` or `block`.
- **Confirmed:** The reason text is "This command deletes `$VAR` recursively, outside the project folder".
  It fires on `rm -rf $VAR` for sandbox temp folders (`$DOTCLAUDE_SANDBOX` 21 times, `$P` 14, `$SBX` 7, `$R` 7, `$M` 7).
  The same pattern fired on each repeat of one probe script.
- **Confirmed:** After each `ask`, the next tool result is not an error.
  The command ran, so the user or auto mode allowed it.
  The model did not change the command after the `ask`.
- **Confirmed:** No Stop hook ran in these sessions.
  Every "Stop hook" string is in prose, wiki text, or research notes, such as "Stop hook retry limit".
- **Inferred:** The `ask` guard is noise for `rm -rf` on a variable that points to a temp folder.
  The guard cannot resolve the variable, so the same `ask` repeated 56 times.
  This is a false-positive rate of 100% in the data, with 0 true catches.
- **Confirmed:** One tool block was a harness limit, not a hook.
  "Concurrent subagent limit reached. You can run 5" (157f1ff7 turn 28).
  The assistant did not retry and ran the work in fewer agents.

## 5. Rules most often broken

| Rule (source) | Result | Evidence |
| --- | --- | --- |
| Semantic line breaks (CLAUDE.md) | Held in written `.md` files, broken in chat | See below |
| No semicolons (CLAUDE.md) | Broken in one written file, rare in chat | See below |
| Read before edit | Held | 2 `Edit` or `Write` calls had no earlier `Read` |
| Ask before push or publish (output style) | Held | 0 `git push` or `git commit` calls in 14 sessions |
| Ask before a workaround (output style) | Not testable | No clear case |
| "Leave out narration and recap" (output style) | Broken | See below |
| Verify claims | Mixed | See below |

- **Confirmed, line breaks in files:** Of 865 lines in 26 written `.md` files, 5 hold two sentences on one line.
  The rule held at 99%.
- **Confirmed, line breaks in chat:** 32% to 59% of prose lines hold two or more sentences.
  The rates are 44% (00bfd354), 57% (087f5a37), 37% (157f1ff7), 59% (9523acac), 42% (ce160872).
  CLAUDE.md applies the rule to "all text that is not code", but chat is not named, so the breach is arguable.
  **Inferred:** The model reads the rule as a file rule.
- **Confirmed, semicolons in files:** 123 lines in the `tasks.md` of 087f5a37 hold a semicolon outside code spans.
  The model wrote the file in one turn, after a long research phase (context about 150K to 200K).
- **Confirmed, semicolons in chat:** 4 prose messages hold a real semicolon, for example "I haven't checked it" after a semicolon (0a0c2fb0 turn 17).
  The rate is about 4 in 220 prose messages.
- **Confirmed, edit without read:** 2 cases in 00bfd354 (turn 42, `probes.md` `Edit`, 56K context).
  **Inferred:** The file was created earlier in the same session, so the tool tracked it.
  The other case is a `Write` to a new file, which is valid.
- **Confirmed, narration:** The output style says to leave out "a narration of the steps, and a recap at the end".
  Messages such as "Progress so far on ... Done this session" (00bfd354 turn 84) and "I've applied both of your points" (turn 328) are recaps.
  I did not count the rate.
- **Confirmed, verify claims:** Case 0a0c2fb0 turn 17 says "That's my guess; I haven't checked it".
  It labels the guess, which is the wanted behavior.
  The user still asked for the missing requirement later, so a gap stayed open.
- **Confirmed, ASD-STE100:** Not measurable by count.
  Chat messages use short sentences and active voice.
  Long final reports use tables and many nouns in a row, which break STE rule on noun clusters.

## 6. Patterns

- **Context size, confirmed:** Failures sit at 45K, 108K, 147K, 225K, and 245K tokens.
  The semicolon file and the recap messages sit at 150K to 250K.
  The one real-correction cluster (cases 3 to 5) sits at 225K to 245K.
  **Inferred:** Rule breaks rise above about 150K, but 6 long sessions cannot prove it.
- **Session length, confirmed:** The longest session (369 turns, 00bfd354) has the most recap messages and the only classifier denial.
  **Inferred:** Long sessions drift to recap text and long tables.
- **Skill load, inferred:** No skill load shows in these transcripts as a separate event.
  9523acac and 0a0c2fb0 began with an `/opsx:` command.
  Both kept the line-break rule in written files, so no drop shows after a load.
- **Phrasing that held, confirmed:**
  - "Ask the user before ... force push, reset, publish, pull request" held, with 0 git writes.
  - Concrete, checkable file rules held (300 lines, `tasks.md` state marks).
  - A literal, narrow reason held ("the sandbox blocks local port binding").
- **Phrasing that failed, confirmed:**
  - "No semicolons" failed when the text was a task list with long clauses.
  - "Leave out narration and recap" failed on final reports after long work.
  - "Continue from there" was read as a go-ahead to implement (case 1).
- **Phrasing that was ambiguous, inferred:** "All text that is not code" does not say if chat counts.
- **Guard design, confirmed:** The `ask` guard fires on any `rm -rf $VAR`.
  It gives no way to say "this path is safe", so the same prompt returns on each loop.

## 7. Advice for 0.28.0

- Name the scope of the line-break rule: "files, commits, and chat".
  Or state that chat is exempt.
- Put "write no semicolons" in a check, not only in prose.
  A hook on `Write` of `.md` that counts `;` outside code spans would catch the 123-line case.
- Make the recap rule concrete: "End with the result and the next step. Write no list of what you did."
- Say what "continue" does: "Read the task state, report it, and wait" when the user says to pause.
- Let the `rm -rf $VAR` guard resolve the variable or accept a path inside `$TMPDIR`.
  The data shows 56 asks and 0 true catches.
- Collect more data: this sample has 0 Stop-hook events, so the Stop hook is unmeasured.
