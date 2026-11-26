# You Should Know

History, checks and sources: [evidence/you-should-know.md](evidence/you-should-know.md).

## YSK-001 Side-Request Prompt Frame

claudetto opens every side-request prompt with the frame quoted under YSK-001 in [the evidence file](evidence/you-should-know.md).

Given a check prompt and an explanation prompt
When each is built
Then each begins with the side-request frame
And the frame says the side agent has no tools, answers in a single reply, and keeps credentials, tokens, keys, environment values and personal data out of its reply

## YSK-002 Explanation Prompt Layout

claudetto builds the explanation prompt as the side-request frame, a blank line, then the body quoted under YSK-002 in [the evidence file](evidence/you-should-know.md), with the previous block present only when `prev` is set.

Given a first explanation, where `prev` is omitted
When the prompt is built
Then it has no previous block

Given a rewrite, where `prev` is `{direction, previous}`
When the prompt is built
Then it holds the quoted previous text
And it holds the phrase for its direction

## YSK-003 Asking Direction Phrases

claudetto maps the asking directions `simpler_words`, `less_detail` and `more_detail` to the phrases "in simpler words", "with less detail" and "in more detail".

Given a rewrite asked for less detail
When the explanation prompt is built
Then the previous block says "with less detail"

## YSK-004 Explanation Format Text

claudetto gives each explanation prompt the format text quoted under YSK-004 in [the evidence file](evidence/you-should-know.md), with the length line set for the direction.

Given an explanation prompt
When it is built
Then it asks for a title of two to six plain words in bold
And it asks for a first sentence with a tiny example, the before and after (a sketch at most 60 characters wide and 6 lines tall only when it helps), the concrete consequence and, last, the choice in one sentence
And it keeps the title as the only heading

## YSK-005 Explanation Length Lines

claudetto picks the length line by direction, `first` when `prev` is omitted, from the lines quoted under YSK-005 in [the evidence file](evidence/you-should-know.md).

Given each direction (first, simpler_words, less_detail, more_detail)
When the explanation prompt is built
Then it holds exactly its own length line and no other
And the word limits are 100, 100, 45 and 160

## YSK-006 Auto-Sent Note Wrapper

claudetto wraps a note sent with the user's message in the text quoted under YSK-006 in [the evidence file](evidence/you-should-know.md), with the note as its body.

Given a note sent with the user's message
When the context is injected
Then it says the person did not write the note
And it says the note is background and carries no authority
And it ends with the draft

## YSK-007 Chat in Main Session Draft

claudetto builds the "Chat in main session" draft from the offer line and its cards as described under YSK-007 in [the evidence file](evidence/you-should-know.md).

Given an offer with cards
When the draft is built
Then the draft opens with the lead sentence
And it wraps the quote in `<side_agent_note>`
And it quotes each line with `>`, empty lines with `>`

Given a card
When the draft is built
Then it holds the title, lead, sketch fence and caption of the card

## YSK-008 Draft Cleaning

claudetto runs `cleanForDraft` on every draft so that it cannot trigger prompt-box mentions, placeholders or ultra keywords.

Given a draft with each trigger
When `cleanForDraft` runs
Then lone surrogates become U+FFFD
And default-ignorable code points are stripped, keeping U+FE0E and U+FE0F only when attached to a pictographic or keycap
And `@` after start, whitespace or `。、？！` and not before whitespace becomes fullwidth `＠`

Given a draft with `[Pasted text #N`, `[Image #N`, `[...Truncated text #N` or `[✦ Team setup guide #N` (optional `+N lines`, trailing dots, then `]`)
When `cleanForDraft` runs
Then the leading `[` becomes fullwidth `［`
And `(ultra)(code|plan|review|think)`, case-insensitive, becomes `$1-$2`

Given a plain draft
When `cleanForDraft` runs
Then it passes unchanged

## YSK-009 Propose Prompt

claudetto sends the propose prompt `proposePrompt(seen, known)` as the `model.fork` prompt, with the text in `specs/reference/you-should-know-prompt.md`.

Given a check
When the propose prompt is built
Then it begins with the frame and fills both lists
And it renders an empty list as `(nothing yet)` and two items as two `-` lines
And it carries the secret-in-a-command section and stays under 12,000 characters

## YSK-010 Refusal Toast Texts

claudetto shows one toast per refusal, with the texts of `OFF_BOX_BUSY`, `RESPOND_BLOCKED`, `RESPOND_BOX_BUSY` and `RESPOND_NOT_FILLED` quoted under YSK-010 in [the evidence file](evidence/you-should-know.md).

Given a turn off with text in the box, a dialog open, text in the box, or a box that did not take the note
When the refusal happens
Then each refusal shows its own text byte for byte
And the apostrophe in `Couldn’t` is the curly one (U+2019)
And no text says "press 2 again"

## YSK-011 Row Lead Tag and Star

claudetto leads each row with `${tag} ·`, where `tag` is `You should know` or `Heads up`, and a star glyph `✦`.

Given a row for each tag
When it is drawn
Then it shows the star, the tag and a middle dot

## YSK-012 About Card Copy

claudetto shows the About card copy `WATCHING`, `WHEN`, `LEARN` (`Learn more` in bold) and, on terminal, `PLUGIN_OFF`, quoted under YSK-012 in [the evidence file](evidence/you-should-know.md).

Given the terminal
When the About card is drawn
Then it shows four lines
And the fourth reads `Disable on this machine with /plugin disable claudetto-you-should-know.`

Given an app surface
When the About card is drawn
Then it shows three lines
And the three shared lines equal the builtin text byte for byte

## YSK-013 Surfaces and the AbovePrompt Slot

claudetto treats the surfaces `terminal`, `desktop`, `mobile` and `vscode` with `hasOwnComposer` false for terminal and true for desktop, mobile, vscode and an unknown surface, and renders every view as a child of the `AbovePrompt` slot through `ui.resolve(input)` elements `Box`, `Text`, `Button` and `Code`.

Given each surface
When a view is drawn
Then the slot holds the view

Given an unknown surface
When a view is drawn
Then it is drawn as a surface with its own composer

## YSK-014 Buttons per Surface

claudetto draws buttons clickable only on a surface with its own composer (desktop, mobile, vscode): no `hotkey`, no `plain`, no star column, and on terminal draws buttons `plain` with `hotkey` and a star column.

Given a terminal button
When it is drawn
Then it carries `plain` and its digit

Given a desktop button
When it is drawn
Then it carries neither `plain` nor a digit
And no star column is drawn

And the `Button` props used are `key`, `label`, `hotkey`, `plain`, `dimColor`, `role` (`"dismiss"` for Dismiss) and `onPress`

## YSK-015 Lead Row Inks

claudetto draws the lead as `Text ["✦", " ${tag} · "]` with a star column of width `STAR_CELLS=2` (`Box width 2, flexShrink 0`).

Given terminal, mobile or vscode
When the lead is drawn
Then the star is `color:"suggestion"` and the tag is `dimColor`

Given desktop
When the lead is drawn
Then the star and the tag are `color:"subtle"`
And the star is `✦`

## YSK-016 Offer Row Layout

claudetto draws the offer row as `Box column marginTop 1` (`OFFER_MARGIN_ROWS=1`) holding the line `✦ ${tag} · ${line}`.

Given terminal
When the offer row is drawn
Then the star sits in its own 2-cell column with the text beside it
And wrapping reserves `WRAP_RESERVE_CELLS=1`

Given desktop
When the offer row is drawn
Then it is a row with the star and lead in a `flexShrink 0` left cell that carries a hover card, then the body text

## YSK-017 Desktop Hover Card

claudetto draws the desktop hover card as an absolutely positioned `Box` (`bottom 1`, `left 0`, `display none`, on hover `display flex`) with a round dim border, `paddingX 1` and `width 60` (`CARD_WIDTH`), wrapping the About copy (`APP_COPY`).

Given the star cell
When the pointer hovers over it
Then the card of width 60 shows the About copy
And leaving hides it

## YSK-018 Offer Choices Row

claudetto draws below the offer line a choices row `OFFER_LABELS` as `Box marginLeft 2, flexWrap wrap`, each choice `Box marginRight 3` (`CHOICE_GAP`) around a `Button`.

Given an offer
When the choices are drawn
Then they follow the order `1 Learn more`, `2 Knew this already`, `3 What is this`, `4 Disable`, `0 Dismiss`
And choice 3 is absent when the About copy does not fit in `maxRows`, and its open state reads `Return to topic` dim
And choice 4 is dim, reads `Press again to disable` when armed, and is absent on desktop, mobile, vscode and for external users

Given About is open and fits
When the offer is drawn
Then the note body is replaced by the dim terminal copy with the tag lead dropped
And the About budget is `{maxRows, bodyColumns}` on terminal and `"scrolls"` on app surfaces

Given `USER_TYPE=external`
When an offer is drawn
Then it shows no key 4 and no key 3

## YSK-019 Explained Row Layout

claudetto draws the explained row as `Box column marginTop 1` with the head `✦ ${tag} · ${line}` and `marginBottom 1`, then each card from `fitCards(cards, bodyColumns)` in a `Box column marginBottom 1 marginLeft 2` (`CARD_INSET=2`).

Given a card with a sketch
When the explained row is drawn
Then it draws a `Code` block with `language:"text"` and `wrap truncate-end`
And a line wider than `columns-2` ends in `…`, with `FALLBACK_COLUMNS=80` when the width is unknown

Given the survey slot is up
When the explained row is drawn
Then the card shows without buttons
And otherwise the choices are `1 Understood`, `2 Chat in main session`, `0 Dismiss`

## YSK-020 Prose Markdown Rendering

claudetto renders prose with `proseMarkdown`, which escapes markdown specials, converts list markers to `-`, uses hard breaks `\n`, puts the title as `**bold**` first and ends with `\n\n`.

Given a card with a `*` list
When it is rendered
Then it shows `-` items

Given an ordered list not starting at its ordinal
When it is rendered
Then it loses its numbers
And `N.` markers are kept only when sequential from the ordinal

## YSK-021 Display Width Measure

claudetto measures display width as 1 cell for a code point below 4352, 1 for the ranges 8208-8286, 8592-8703 and 9472-9727 (except 9725, 9726), and 2 otherwise (`WIDE_FROM=4352`).

Given a CJK character, `a` and U+2192
When their width is measured
Then the CJK character counts 2 cells
And `a` counts 1
And U+2192 counts 1

## YSK-022 Digit Hotkeys on Terminal

claudetto makes the hotkeys the digits shown on terminal and treats a bare digit typed in the prompt box as a button press for the same key.

Given terminal buttons
When they are drawn
Then each carries its digit as `hotkey` and `plain`

Given a lone digit sent from the terminal composer
When the message is submitted
Then it counts as that button's press
And it blocks the auto-sent note for the offer

## YSK-023 Survey Hides the Offer

claudetto hides the offer when `hasSurvey` is set, falling through to `next`, but keeps an `explained` card without buttons.

Given a survey is up
When an offer would be drawn
Then it is not drawn

Given a survey is up
When an explained card would be drawn
Then it is drawn with no buttons

## YSK-024 Idle Clock for Auto-Send

claudetto runs the idle clock for auto-send only while the offer is fully drawn and unread, and counts an offer idle for `NOTE_READ_MS=2000` ms as read.

Given surface `terminal`, no survey, `isCollapsed` unset, no debug rows shown, an `offer` view that is not armed (`isOffArmed!==true`), `scroll.offset===0`, the note not yet read (`isNoteRead`), and `closedOfferRows({columns:bodyColumns, tag, line, labels:all five})<=maxRows`
When the offer is idle
Then the clock runs and accrues only while no turn works (`isWorking` freezes it)
And any failed condition deletes it

Given a narrow terminal that cannot hold the five-label row
When an offer is drawn
Then no idle clock starts

Given `isCollapsed`, a survey, `scroll.offset!==0`, debug rows or an armed Disable
When the offer is drawn
Then the clock stops
And the clock does not advance while the model works

## YSK-025 Model Fork on Live Conversation

claudetto calls the model with `model.fork` on the live conversation, with no digest, the cache shared, and no model or effort option.

Given a check
When it runs
Then it issues one `model.fork` and no `model.complete`
And it builds no 8-entry log digest and uses no `maxTokens 512` or `timeoutMs 20000`
And the settings hold no model or effort key

## YSK-026 Check and View State Tracking

claudetto tracks `checking` in flight, `askedTurn` and `offeredTurn`, and clears `explaining` and `making` views that survive a process.

Given a row left in `explaining` by a dead process
When the next start happens
Then the row is cleared

Given a check in flight
When a second check would start
Then it does not start

## YSK-027 Row Retention

claudetto keeps 32 rows and prefers to drop closed rows older than 3 days.

Given 33 rows
When a row is dropped
Then the oldest closed row over 3 days old goes first

## YSK-029 Check Cadence on Turn Steps

claudetto, on `turn.step`, passes a sub-agent step (`agentId` set) straight through, never delays a turn, and starts a proposing check at step 3 and then at each sixth step (`CHECK_EVERY=6`), never at step `index` 0.

Given steps 0 to 13 of a turn
When they are fed
Then a check starts at steps 3, 6 and 12 only
And none starts for a sub-agent step, once the turn holds an offer, or for a surface that draws no band

Given the gates `row.offeredTurn !== turnId`, no view open, `isBandWatched` holding, no check running for the session and `looksToSkip` 0
When a check step arrives
Then the check starts, and a nonzero `looksToSkip` decrements and returns
And a surface draws the band when it is `"terminal"` or has a rendered `AbovePrompt`

Given a bridge-origin prompt
When a check step arrives
Then the bridge exception applies and its `"terminal"` entry is ignored by `isBandWatched`

## YSK-030 Prompt Submit Origins

claudetto, on `prompt.submit`, acts only when `origin.kind` is `"composer"` or `"bridge"`, for off-view cleanup, counting prompts typed since an offer (`PROMPT_ORIGINS` `composer|bridge|other`), and the auto-send note.

Given a prompt with another origin
When it is submitted
Then the view and counters are unchanged

## YSK-031 Off Command Recorded on Command Run

claudetto, on `command.run` with `command:"plugin"`, records the off confirmation when the origin is a person's prompt and `/${command} ${args}` is an off command.

Given the typed text `/plugin disable claudetto-you-should-know`
When it runs
Then the off view comes down
And it counts as the off command
And no confirmation record is written

## YSK-032 Render Note Above Prompt

claudetto, on `ui.render` with `component:"AbovePrompt"`, draws the note on each render of the strip above the prompt box, and falls through to `next` when it has no note.

Given an open view
When the strip renders
Then it shows the note

Given no open view
When the strip renders
Then the next handler draws

## YSK-033 Rendered Surfaces on Detach

claudetto, on `session.detach`, keeps in `renderedSurfaces` only the surfaces `session.surfaces()` still reports.

Given a detach
When a surface is no longer reported by the session
Then it does not count as drawing the band

## YSK-034 Session End Cleanup

claudetto, on `session.end`, marks the session ended, deletes it from the bridge set and idle clock, and closes an open view, swallowing errors so that `next` always runs.

Given a session with an open offer
When it ends
Then the offer is cleared once
And an in-flight check becomes "stale"

Given an `off` view left at session end
When the session ends
Then it is cleared once

## YSK-035 Proposed Line Parsing

claudetto parses the proposed line with `parseProposedLine`, accepting bullets, `learn:` with continuation lines, quote unwrapping, inline `tag:` and declined openings (`none` followed by punctuation), adding a closing period and rejecting only a line over 240.

Given a bulleted `- learn: "x"` reply
When it is parsed
Then it yields `x.`

Given the reply `none.`
When it is parsed
Then it is declined

Given a first `learn` line over 240
When it is parsed
Then it falls through to the next `learn` line

## YSK-036 Tag and Explain Label Tolerance

claudetto tolerates `tag:` labels with `> * _` quotes and the dash form, and reads `explain:` as its first line plus the following lines.

Given the reply line `> **tag** - Heads up`
When it is parsed
Then it parses as `Heads up`

## YSK-037 Reply Control Sequence Cleanup

claudetto strips control sequences and collapses whitespace (`stripControlSequences`, `cleanOneLine`) in the reply parsing.

Given a reply with an escape sequence and runs of blanks
When it is parsed
Then the escape sequence is removed
And runs of blanks become one

## YSK-038 Card Parsing and Truncation

claudetto parses cards with word-boundary truncation ending in `…`, flushes on a new fence, and cleans prose lines through `proseOf`, dropping empty lines.

Given a title over its limit
When the card is parsed
Then it ends in `…` at a word boundary

Given a new fence
When cards are parsed
Then it starts a new card

## YSK-039 Learn More Shows or Fetches Explanation

claudetto, on Learn more, shows the explanation that came with the offer, or runs an explain fork when none came, with the `explaining` view (`One moment…`) and the `failed` view with `OK`.

Given Learn more with no shipped explanation
When it is pressed
Then a fork runs and shows the result
And the button is never hidden

## YSK-040 Press Effects on the Known List

claudetto marks `Knew this already` and `That was helpful` as known, leaves `Not relevant` and `Couldn’t understand` out of the known list, and handles `Understood`.

Given `Knew this already`
When it is pressed
Then the line is marked known
And the view clears without a toast

Given `That was helpful`
When it is pressed
Then the line is marked known

Given `Not relevant` or `Couldn’t understand`
When it is pressed
Then the known list is unchanged

## YSK-041 Offer Buttons and Keys

claudetto shows an `offer` with the buttons `Learn more` (key 1, `yes_explain`), `Knew this already` (key 2, `know_it`), `Not now` (key 0, `not_now`), About (key 3, shown when the copy fits) and `Disable` (key 4).

Given Learn more
When key 1 is pressed
Then it goes straight to `explained{iteration:1}` when the offer's `explanation` parses to at least 1 card
And otherwise it runs the Learn more fork

Given keys 2, 0 and 3
When each is pressed
Then key 2 remembers the line and clears the view
And key 0 shows the `asked` view with no iteration
And key 3 toggles `aboutOpen` and drops the idle clock, a second press returning to the topic

Given `Disable` (key 4, absent when the surface has its own composer or `USER_TYPE==="external"`)
When it is pressed
Then the first press arms with the label `Press again to disable`
And the second press fills the box with the `/plugin disable ...` command through the off flow with via `"offer"`

## YSK-042 Explained View Buttons

claudetto shows an `explained` view with up to 4 cards fitted to the body width and, unless a survey shows, the buttons `1 Understood`, `2 Chat in main session` and `0 Dismiss`.

Given an explained view without a survey
When each button is pressed
Then `1 Understood` answers `got_it`, remembers the line and clears
And `2 Chat in main session` runs the respond flow
And `0 Dismiss` answers `dismiss`, then shows the `asked` view with `iteration`, and each button adds its offer key to `autoSentKeys`

Given a survey is up
When the explained view is drawn
Then no buttons show

## YSK-043 Asked View After Dismissal

claudetto shows the `asked` view for `ASKED_MS=20000` ms after `Dismiss` or `Not now`, with the dim line `Dismissed.` and one-shot buttons that cancel the timer.

Given the asked row without `iteration`
When it is drawn
Then it has `1 That was helpful` (`helpful`, remember the line, clear), `2 Not relevant` (`not_relevant`, clear), `3 Couldn’t understand` (`not_understood`, clear), `4 Turn off suggestions` and `0 Dismiss` (clear)
And button 4 is absent without the off handler and shows only on the terminal, running the off flow with via `"row"`

Given Dismiss on an explained card, with `iteration`
When the asked row is drawn
Then it shows the three-button row `1 That was helpful` (`explained_helpful`, and remember), `2 Didn’t understand` (`explained_not_understood`), `0 Dismiss`

Given 20 s with no press
When the timer ends
Then the view clears
And each press answers once

## YSK-044 Waiting and Failure Views

claudetto shows `One moment…` for the `explaining` view, a `failedRow` with an `OK` button that clears the view for `failed{reason}`, and nothing for the `off` view.

Given Learn more with no shipped explanation
When it is pressed
Then `One moment…` shows until the explanation or the failure arrives

Given a failure kind
When the failed row is drawn
Then it shows the lead, the message, a dim `·` and the button `0 OK`
And the messages are `publish` -> `Couldn’t publish that page`, `blocked` -> `Not published (blocked by a permission setting)`, `explain` -> `Couldn’t write that explanation`, `turn_off` -> `Couldn’t turn suggestions off here. Use /plugin.`, any other -> `Couldn’t write that page`

Given the views `explaining`, `making`, `ready` and `failed`
When they are drawn
Then each row is `marginTop 1` with lead and text
And the `off` view draws nothing, and `making` and `ready{url}` need not be implemented

## YSK-045 Plugin Listing Description

claudetto lists `claudetto-you-should-know` with the description in `plugin.json`, which says a side agent follows long sessions in the background and shows a short plain-language note above the prompt when the person is likely to miss something that matters.

Given the plugin listing
When it is inspected
Then it shows the description in `plugin.json`
And `claude plugin validate --strict` passes

## YSK-050 Environment Switches

claudetto reads `CLAUDE_CODE_YOU_SHOULD_KNOW_AUTO_SEND` and `CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG` as true only when the trimmed lowercase value is `1`, `true`, `yes` or `on`, and a read failure is false.

Given the values `1`, ` TRUE `, `yes` and `on`
When a switch is read
Then it reads true

Given the values `0`, `2`, empty and unset
When a switch is read
Then it reads false
And `USER_TYPE` is read as `external` or not

## YSK-051 No Auto-Send in Driven Sessions

claudetto never auto-sends in a session that may be driven, where `mayBeDriven = CLAUDE_CODE_SESSION_KIND!==undefined || CLAUDE_JOB_DIR!==undefined || CLAUDE_CODE_CHILD_SESSION!==undefined || (CLAUDECODE!==undefined && CLAUDE_CODE_SKIP_PROMPT_HISTORY!==undefined)`.

Given each of the four conditions set
When `AUTO_SEND=1` and a message is sent
Then no note is attached
And a child session, job-dir run or scripted run never auto-sends

## YSK-052 Debug Check Rows

claudetto, with `CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG` on, records each check on `turn.step` (`number`, `step`, `outcome`, `latencyMs`, `at`) and draws the last 3 (`CHECKS_KEPT=3`) above the note on `ui.render`, one row each, only when no survey is up.

Given DEBUG on and 5 checks kept
When the strip renders
Then 3 rows show above the node
And each row is `✦` then, dim and `truncate-end`, `debug · check ${N} · step ${S} · ${outcome} · ${latency in s, 1 decimal}s · ${HH:MM:SS}`

Given DEBUG off, or a survey up
When the strip renders
Then no debug row shows

## YSK-053 Turn Off by Filling the Box

claudetto turns off by filling the prompt box and never by running the command, so the user presses Enter.

Given the box holds non-blank text
When Disable is pressed
Then a toast `OFF_BOX_BUSY` shows and the box is unchanged
And the view invalidates and the flow stops

Given an empty box
When Disable is pressed twice
Then the `off{line,shownAt}` view is set
And the box holds `/plugin disable cc-plugin-you-should-know@builtin` filled with mode `replace`, and the plugin ran nothing
And a failed fill shows `failed{reason:"turn_off"}`

Given a submitted disable command, detected on `prompt.submit` and `command.run` (`isOffCommand`)
When it is submitted
Then the off is confirmed or abandoned

## YSK-054 Off Command Spellings

claudetto treats typed text as the off command when it is `/plugin disable` with `cc-plugin-you-should-know`, `suggest-learning` or `you-should-know`, each bare or with `@builtin`, six spellings in all.

Given the Disable flow
When it runs
Then it types `OFF_COMMAND`, `/plugin disable cc-plugin-you-should-know@builtin`, into the box

Given a submit or `command.run` of any of the six spellings
When it is detected
Then it counts as an off command
And `/plugin disable other` does not

Given the next person's prompt
When it arrives
Then it clears the `off` view, confirmed or abandoned

## YSK-055 Chat Respond Flow

claudetto runs the Chat (respond) flow once at a time per session by filling the prompt box with the draft plus a blank line (mode `replace`).

Given text in the box
When Chat is pressed
Then it toasts `RESPOND_BOX_BUSY`

Given a successful fill
When Chat is pressed
Then it remembers the line and clears the view
And on a refusal other than `no_composer` it toasts `RESPOND_BLOCKED` when a dialog is up or `RESPOND_NOT_FILLED`, invalidates and keeps the view

Given a `no_composer` refusal
When Chat is pressed
Then it remembers, clears, and calls `prompt.submit` with the draft without the trailing blank lines
And no toast says "press 2 again"

## YSK-056 Auto-Sent Note with Message

claudetto, only with `CLAUDE_CODE_YOU_SHOULD_KNOW_AUTO_SEND` on and `mayBeDriven` false, attaches the offered topic as background `context` to the user's own message and dismisses the offer as known.

Given the switch on, an offer fully visible and idle at least 2000 ms twice (before and after the submit), a message from the terminal composer, and no digit key or button used on that offer
When the user submits a typed message
Then the note `autoSentNote(respondDraft(line, [], tag))` is in `context`
And the builtin shows `ui.log("Sent a note to Claude with your prompt")`

Given the switch off, a digit key, or a driven session
When a message is submitted
Then no note is attached
And a single digit key is a button press and blocks auto-send for that offer

Given the tracked state
When a message is submitted
Then it tracks `isNoteRead`, `autoSentKeys`, `mayBeDriven` and the idle clock

## YSK-057 Backoff After Ignored Offers

claudetto skips proposing after repeated ignored offers: `looksToSkipAfter(n) = n<=2 ? 0 : min(16, 2**(n-3))`, where `typedPastInARow` counts offers the user typed past.

Given 3 ignored offers
When the next check is eligible
Then 1 eligible check is skipped
And after 7 ignored offers, 16 are skipped
And n=4:2, 5:4, 6:8, each skip consuming one eligible check

Given any answer except `ignored_timeout`
When it arrives
Then both counters reset to 0
And the store keys are `looksToSkip` and `typedPastInARow`

## YSK-058 No Repeated Lines

claudetto never offers a line already seen or known, where `seen` holds the last 50 offered lines, `known` the last 50 lines the user said they knew, and lines compare by lowercase with one trailing `.` removed.

Given a proposed line equal to a seen or known line, ignoring case and one trailing period
When it is proposed
Then it is not shown
And the dedupe is case-insensitive and exact

## YSK-059 Offer Survival Across Prompts

claudetto counts prompts per `{origin,count}` since the offer, and at step 0 keeps an `explained` view forever and clears an open offer once `promptsSurvived>=2` (`CLEAR_AFTER_PROMPTS=2`), raising `typedPastInARow`.

Given an explained card
When any number of prompts arrive
Then it survives

Given an offer
When one prompt is typed
Then it survives
And it clears on the second

## YSK-061 Reminder Arrives Before the Work

claudetto shows its you-should-know reminder before the work it concerns, with a first check at step 3.

Given a real session
When the work the reminder concerns begins
Then the reminder arrives before it
And `isCheckStep` fires on 3, 6, 12 and so on

## YSK-062 Secret-in-a-Command Clause

claudetto puts in the side check's fixed instructions that a password or secret inside a command (an osascript keystroke, a Terminal window it drives) was not typed into the chat unless a person message holds it, and carries the clause in the propose prompt.

Given the propose prompt
When it is built
Then it holds the clause

## YSK-073 Own Observer Prompt and Size

claudetto writes its own observer prompt for size and clarity and reports the shipped prompt's size.

Given the propose prompt
When its size is measured
Then it is claudetto's own text under a 12,000 character budget
And the release notes state its size

## YSK-071 One Model Call per Offer

claudetto answers a request for more on an offer with the explanation the check's own reply already carried, with no second model call, and runs one explain fork on "Learn more" when the reply carried none, keeping the button.

Given a reply that carried an explanation
When an offer is shown and "Learn more" is pressed
Then one model call is counted

Given an offer with no explanation
When "Learn more" is pressed
Then the button is kept
And one explain fork runs on press

## YSK-072 No Telemetry and No External Fetch

claudetto calls no `$.telemetry.log` or `$.telemetry.mark` and fetches no external resource, leaving out the telemetry steps of the builtin algorithm.

Given the plugin
When it is searched
Then it holds no `$.telemetry` token
And it holds no external URL fetch

## YSK-074 Recreation of the Builtin Plugin

claudetto ships `claudetto-you-should-know` as a full recreation of `cc-plugin-you-should-know@builtin`, kept and improved, while the builtin is disabled.

Given the builtin's triggers, algorithm, user-facing texts and view
When the plugin is inspected
Then it reproduces them

Given the recorded deviations
When the plugin is inspected
Then they are reworded model prompts (YSK-001/004/005/006/007/009/045), claudetto's own plugin name in the off command (YSK-012, YSK-054), no telemetry (YSK-031, YSK-072) and a first check at step 3 before every sixth step (ADR-0190, `FIRST_CHECK` in hooks/shared/constants.ts)
And a check at the end of a turn that ran past its last check step (ADR-0203, YSK-076) and no spinner tip

## YSK-075 Recheck of Untouched Offers

claudetto rechecks an untouched offer shown in the current turn at each later check step of that turn and when the main agent's turn ends, and withdraws it when one fork answers DROP because later steps made it untrue or no longer applicable.

Given a DROP at a later check step or at `turn.complete`
When the fork answers
Then the offer clears and the view redraws
And the debug row logs a withdrawal

Given KEEP, an unanswered fork, a fork error, an unparseable answer, an explained view, a subagent's turn end or a session with no offer
When the recheck runs
Then the view is left as it is

Given a recheck
When it runs
Then one recheck runs per session at a time
And it never blocks the step or the turn

## YSK-076 Check at Turn End

claudetto runs one check when a main-agent turn ends after a step no check saw, so a consequential command in the last steps of a short turn still gets its note.

Given a turn whose last step is past step 3 and not a check step
When the turn completes
Then one check runs at `turn.complete`
And it follows the same rules as a step's check (no note up, none offered this turn, the band watched, the backoff, one check at a time)

Given a turn that ends on a check step or by step 3, a subagent's turn, or a turn with an untouched offer (rechecked instead, YSK-075)
When the turn completes
Then no check runs
