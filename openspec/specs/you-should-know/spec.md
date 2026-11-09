# you-should-know Specification

## Purpose
The observable contract of `claudetto-you-should-know`, the side-check observer that offers the person one short line above the prompt when the work shows something they should know, so a rebuild can be tested against the baseline behavior.

## Requirements

### Requirement: Off by Default

The observer MUST stay off unless the `sideCheckEnabled` option is exactly `true`. While off, it MUST make no model request and write nothing to its store. It reads only `sideCheckEnabled`, `sideCheckModel`, and `sideCheckEffortLevel`.

#### Scenario: A New Install

- **WHEN** the plugin is installed and no option is set
- **THEN** no check runs and the store stays empty

### Requirement: Check Cadence

The observer SHALL consider a check on every sixth main-loop step of a turn, never on a subagent step, and only on the `terminal` or `desktop` surface. It MUST NOT start a check while a view is open, while a check is in flight, or in a turn that already got an offer.

#### Scenario: A Subagent Step

- **WHEN** a subagent's step index is a multiple of six
- **THEN** no check is considered

#### Scenario: A Check Already in Flight

- **WHEN** the next sixth step arrives before the last check answered
- **THEN** no second request is made

### Requirement: Back-Off after Ignored Offers

When the person sends two prompts past an offer without answering it, the observer SHALL clear the offer and count it as ignored. After more than two ignored offers in a row, it SHALL skip `min(16, 2^(n-3))` check chances. A key press on an offer or an accepted chat SHALL reset the count and the skips. Three events SHALL leave them as they are: the asked view closing itself after 20 s, a refused chat, and Dismiss on the asked view.

#### Scenario: Ignored Five Times

- **WHEN** five offers in a row were ignored
- **THEN** the next four check chances make no request

#### Scenario: The Asked View Closes Itself

- **WHEN** three offers in a row were ignored, and the asked view of the next offer closes itself after 20 s
- **THEN** the count stays at three

### Requirement: One Bounded Request

A check MUST make one `$.model.complete` request with the model and effort from the options and `maxTokens` 512, whose body is the lines already shown, the lines the person knows, and the last 8 log entries of at most 992 characters each, at most 8,000 characters in all.

#### Scenario: A Long Session

- **WHEN** the log holds more than 8 entries
- **THEN** the request carries only the last 8, each cut to its bound

### Requirement: Reply Parsing

The observer SHALL show an offer only for a reply whose first `learn:` line holds a line of at most 240 characters that is neither `none` nor a repeat of a shown or known line, compared lowercase without a final period. A reply that fails parsing, arrives after its session ended, after its turn changed, or while a view is open MUST show nothing.

#### Scenario: A Repeat

- **WHEN** the reply's line equals a known line except for case and the final period
- **THEN** nothing is shown

#### Scenario: A Late Reply

- **WHEN** a reply arrives after the turn that asked for it ended
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
