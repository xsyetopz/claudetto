# you-should-know Specification

## Purpose
The observable contract of `claudetto-you-should-know`, the side-check observer that offers the person one short line above the prompt when the work shows something they should know, so a rebuild can be tested against the baseline behavior.

## Requirements

### Requirement: Off by Default

The observer MUST stay off unless the `sideCheckEnabled` option is exactly `true`. While off, it MUST make no model request and write nothing to its store. It reads only `sideCheckEnabled`, `sideCheckModel`, and `sideCheckEffortLevel`.

#### Scenario: A New Install

- **WHEN** the plugin is installed and no option is set
- **THEN** no check runs and the store stays empty

### Requirement: Check Before Each Action

The observer SHALL consider a check before each main-loop tool call, only on the `terminal` or `desktop` surface. It SHALL skip a subagent's call, a question to the person (`AskUserQuestion`, `mcp__claudetto__ask-user-question`), and a call to a tool that changes nothing: `Read`, `Grep`, `Glob`, `ToolSearch`, `WebSearch`, `WebFetch`, and `ListAgents`. The call SHALL wait for the check, whose log ends with the call.

#### Scenario: Nothing to Say

- **WHEN** the check replies `learn: none`
- **THEN** the call runs

#### Scenario: A Subagent Call

- **WHEN** a subagent calls `Bash`
- **THEN** no check runs

### Requirement: A Note Stops the Call

When the check shows an offer, the observer MUST deny the call with the offer's line and an instruction to bring the note to the person and wait for their answer. While this turn's offer is open, each further checked call MUST be denied with the same line and no new request. The observer MUST NOT start a check while another view is open or in a turn whose offer was closed. A call that arrives during a check SHALL share that check's result.

#### Scenario: A Noted Push

- **WHEN** the main loop calls `Bash` with `git push`, and the check replies with a line
- **THEN** the push does not run, its deny carries the line, and the offer opens

#### Scenario: Two Calls in One Response

- **WHEN** two calls arrive before the check answered
- **THEN** one request is made, and its offer denies both

### Requirement: Back-Off after Ignored Offers

When the person sends two prompts past an offer without answering it, the observer SHALL clear the offer and count it as ignored. After more than two ignored offers in a row, it SHALL skip `min(16, 2^(n-3))` check chances. A key press on an offer or an accepted chat SHALL reset the count and the skips. Three events SHALL leave them as they are: the asked view closing itself after 20 s, a refused chat, and Dismiss on the asked view.

#### Scenario: Ignored Five Times

- **WHEN** five offers in a row were ignored
- **THEN** the next four check chances make no request

#### Scenario: The Asked View Closes Itself

- **WHEN** three offers in a row were ignored, and the asked view of the next offer closes itself after 20 s
- **THEN** the count stays at three

### Requirement: One Bounded Request

A check MUST make one `$.model.complete` request with the model and effort from the options and `maxTokens` 512, whose body is the lines already shown, the lines the person knows, the last 3 of the person's messages that left the log, of at most 400 characters each, and the last 8 log entries of at most 800 characters each, at most 8,000 characters in all. A message the person sent asks for what it names, so the check MUST NOT note an action the person asked for.

#### Scenario: A Long Session

- **WHEN** the log holds more than 8 entries
- **THEN** the request carries only the last 8, each cut to its bound

#### Scenario: A Request Before a Burst of Calls

- **WHEN** the person sends a message and the assistant then makes 9 tool calls
- **THEN** the next request still carries that message

### Requirement: Reply Parsing

The observer SHALL show an offer only for a reply whose first `learn:` line holds a line of at most 240 characters that is neither `none` nor a repeat of a shown or known line, compared lowercase without a final period. A reply that fails parsing, arrives after its session ended, after its turn changed, or while a view is open MUST show nothing.

#### Scenario: A Repeat

- **WHEN** the reply's line equals a known line except for case and the final period
- **THEN** nothing is shown

#### Scenario: A Late Reply

- **WHEN** a reply arrives after the session that asked for it ended
- **THEN** nothing is shown

### Requirement: The Offer and Its Views

The offer SHALL show `{tag} · {line}` above the prompt with `Learn more` only when the reply carried at least one explanation card, plus `Knew this already` and `Dismiss`. `Learn more` MUST make no second request. Dismissing an offer SHALL show the feedback view, which closes itself after 20 seconds.

#### Scenario: No Explanation

- **WHEN** the reply carried no `explain:` cards
- **THEN** the offer shows no `Learn more` button

#### Scenario: Knew This Already

- **WHEN** the person presses `Knew this already`
- **THEN** the line joins the known list and the view closes

### Requirement: Chat in the Main Session

From the explained view, chat SHALL put a draft quoting the note into an empty prompt box with prompt-triggering text neutralised. It MUST leave a box that holds text unchanged and say why. When the session has no prompt box, it SHALL submit the draft as a prompt.

#### Scenario: The Box Has Text

- **WHEN** the person presses `2` and the prompt box holds text
- **THEN** the box is unchanged and a toast asks them to send or clear it

#### Scenario: An At-Sign in the Note

- **WHEN** the note holds `@file`
- **THEN** the draft holds a full-width at sign, so no file is mentioned

### Requirement: Bounded State

The observer MUST cap its session rows at 32 and its shown and known lists at 50 each, and MUST evict closed rows first. A fault in a check, a key press, or a timeout MUST be swallowed without reaching the person.

#### Scenario: The 33rd Session

- **WHEN** a 33rd session row is stored
- **THEN** a closed row is evicted first

### Requirement: The Model and Effort Have Defaults

The observer SHALL use `claude-haiku-5-5` when `sideCheckModel` is not a non-empty string, and effort `high` when `sideCheckEffortLevel` is not one of `low`, `medium`, `high`, `xhigh`, `max` (`register.ts:56-72`). It SHALL read both options once at registration.

#### Scenario: No Options

- **WHEN** `sideCheckEnabled` is `true` and no model or effort option is set
- **THEN** a check asks `claude-haiku-5-5` at effort `high`

#### Scenario: A Bad Effort

- **WHEN** `sideCheckEffortLevel` is `"turbo"`
- **THEN** the check runs at effort `high`

### Requirement: The Reply Carries a Tag and Explanation Cards

The parser (`note.ts:64-94`) SHALL read the first `learn:` line, the first `tag:` line, and everything from the first `explain:` line on, with the key in any case. The tag SHALL be `Heads up` when the value reads `heads up` or `heads-up`, and `You should know` otherwise. The explanation SHALL be split into at most 4 cards (`note.ts:166-173`): a `**title**` or `# title` line opens a card, text before a fenced block is the lead, the block is the sketch, and text after it is the caption.

#### Scenario: Heads Up

- **WHEN** the reply holds `learn: The push deletes the branch.` and `tag: Heads-up`
- **THEN** the offer shows the tag `Heads up`

#### Scenario: A Card With a Sketch

- **WHEN** the explanation holds `**Title**`, a lead line, a fenced block of 3 lines, and a caption line
- **THEN** one card has that title, lead, 3 sketch lines, and caption

#### Scenario: Five Titles

- **WHEN** the explanation holds five titled cards
- **THEN** only the first four are kept

### Requirement: Card Text Is Capped

A card title SHALL be cut at 120 characters, a sketch SHALL hold at most 12 lines of at most 120 characters, and the lead and the caption SHALL each be cut at 4,000 characters at a word boundary (`note.ts:8-25`, `clipAtWord`). The offer line shown SHALL be cut at 240 characters.

#### Scenario: A Long Sketch

- **WHEN** a fenced block holds 20 lines
- **THEN** the card keeps the first 12

#### Scenario: A Long Lead

- **WHEN** a lead holds 5,000 characters
- **THEN** the card holds at most 4,000, ending at a word

### Requirement: Each View Has Its Own Buttons

The offer, asked, and explained views SHALL each show their own buttons (`view.ts:37-66`). Hotkeys SHALL be set only on the `terminal` surface (`view.ts:132`). `That was helpful`, `Understood`, and `Knew this already` SHALL add the line to the known list and close the view; `Not relevant` and `Couldn’t understand` SHALL only close it (`register.ts:261-306`).

#### Scenario: Asked View

- **WHEN** the person presses Dismiss on an offer
- **THEN** the asked view shows "Dismissed." and the buttons `That was helpful`, `Not relevant`, `Couldn’t understand`, and `Dismiss`

#### Scenario: Offer and Explained Views

- **WHEN** an offer has a card, and then the person presses `Learn more`
- **THEN** the offer shows `Learn more`, `Knew this already`, and `Dismiss`, and the explained view shows `Understood`, `Chat in main session`, and `Dismiss`

#### Scenario: Not Relevant

- **WHEN** the person presses `Not relevant` on the asked view
- **THEN** the view closes and the line stays out of the known list

#### Scenario: Desktop Surface

- **WHEN** the surface is `desktop`
- **THEN** the buttons carry no hotkey
