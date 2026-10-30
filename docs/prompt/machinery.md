# The Prompts Claude Code Sends by Itself

Read on `2026-10-27` from the Claude Code docs for `2.1.311` with `cc-docs read`. Each line names its route. A line of `not given` means the docs do not say.

The routes are all under `prompts/`. The character counts come from the `## Size` tables of the pages that have one. A page that shows only the prompt text has no count, so its size is `not given`.

## Every Hidden Call, with Its Trigger and Its Size

| Call | Route | What Triggers It | Characters | Model | How to Turn It Off |
| --- | --- | --- | --- | --- | --- |
| Observer | `prompts/observer` | Observer agents are behind `CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS`. Any other trigger is `not given` | `not given`. The page shows only the readable part, which it says may be incomplete | `not given` | `not given`. The page names `CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS` as the gate but does not say it turns the feature off |
| Auto mode classifier | `prompts/auto-classifier` | Run with `claude --permission-mode auto`. It runs when the model calls a tool that no rule already allows | `system[1]` is `140,015`. Everything shown is `140,718`. `Tools sent` is `0` | `not given` | `not given` |
| Auto mode classifier with custom rules | `prompts/auto-classifier-custom` | Same as above, with `autoMode` set in settings | `system[1]` is `75,325`. Everything shown is `76,028`. `Tools sent` is `0` | `not given` | `not given` |
| Compaction | `prompts/compact` | Run `/compact` in a session with some history. Any automatic trigger is `not given` | Everything shown is `22,575`. The summary instruction message is `6,755`. `Tools sent` is `12` | `not given` | `not given` |
| Compaction with custom instructions | `prompts/compact-custom` | Text after `/compact`, a `## Compact Instructions` section in `CLAUDE.md`, or `PreCompact` hook output | Everything shown is `23,085`. The summary instruction message is `6,839`. `Tools sent` is `12` | `not given` | `not given` |
| Coordinator mode | `prompts/coordinator-mode` | Used as the main prompt in coordinator mode. How the mode is entered is `not given` | `not given` | `not given` | `not given`. The page says there is no text override |
| CLI surface text | `prompts/surface-cli` | Picked by entry point. This is the text for the terminal | `not given` | `not given` | `not given`. The page says no override was found |
| Prompt hook | `prompts/hook-prompt` | A hook handler `{"type": "prompt", "prompt": "... $ARGUMENTS"}` in `settings.json` | System blocks `938`. Everything shown is `1,478`. `Tools sent` is `0` | A "small model", name `not given` | `not given` |
| Agent hook | `prompts/hook-agent` | A hook handler `{"type": "agent", "prompt": "... $ARGUMENTS"}` in `settings.json` | System blocks `1,115`. Everything shown is `2,362`. `Tools sent` is `10` | Defaults to `Haiku`. Set `model` in the hook to change it | `not given` |
| Session naming | `prompts/session-naming` | Names a coding session so it can be picked from a long list. Any other trigger is `not given` | `not given` | `not given` | `not given`. The page says no override was found |
| Title and branch name | `prompts/title-and-branch-name` | Writes a title and a git branch name for a coding session. Any other trigger is `not given` | `not given` | `not given` | `not given`. The page says no override was found |
| Memory extraction | `prompts/memory-extraction` | Run by the memory extraction subagent. The trigger is `not given` | `not given`. The page shows only the short opening | `not given` | `not given`. The page says no override was found |
| Memory selection | `prompts/memory-selection` | Picks saved memories that may help with a user query. Any other trigger is `not given` | `not given` | `not given` | `not given`. The page says no override was found |

No page in this set names a setting or an environment variable that turns a call off. The one variable named is `CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS` on `prompts/observer`.

## The Observer Prompt

Route: `prompts/observer`. The page says it is the text that `2.1.311` uses for experimental observer agents. It also says: "The program splits this string in the binary. The text here is the part we could read, so it may be incomplete."

The text on the page is one paragraph, and it ends mid-sentence. These are the parts that matter for the rebuild.

The role:

> "You are a helpful observer whose goal is to help the human better understand their work."

The bar for interrupting, the only one the page gives:

> "Is there anything that the human should *really* know about their session, that they very likely (or clearly) do not understand?"

The limit on what it says:

> "Try to find one topic to suggest to the human to understand, and explain it in plain language."

The last words on the page are "The topic should be worthy of". The rest of that sentence is `not given`. This is the same cut that the notes at `docs/keep/plugins/you-should-know-source-2.1.310.txt` record. The full prompt is still unread.

What the page gives about the design:

- The prompt asks the model to pause and reflect on "this session so far". It does not say how often.
- It asks for one topic only.
- It sets a bar on the human's gap in understanding, with the words "really" and "very likely (or clearly)".
- The page does not say what the model returns when it has nothing to say. That is `not given`.
- The page does not say when the call fires, how often, or how large the input is. That is `not given`.
- Override: the base text is fixed. The `observerMessage` field in a custom agent file adds text to the observer digest.

## The Auto Mode Classifier

Route: `prompts/auto-classifier`.

Trigger: run `claude --permission-mode auto`. The page says "The classifier runs when the model calls a tool that no rule already allows." So a call that a rule already allows is not sent to the classifier. The page says nothing more about when it is skipped.

Shape of the request:

- The page says the first stage is a separate request with the system text "You are a security monitor for autonomous AI coding agents." and no tools.
- The stage 1 user text ends with "Stage 1 does NOT apply user intent or ALLOW exceptions". It says "stage 2 will handle those". The page does not show the stage 2 request. Its size is `not given`.
- Stage 1 asks for `<severity>N</severity>` only, an integer from `0` to `100`. The page says `50` is "exactly the allow/block boundary".
- The page says the main request also carries a `safeguards` field with a `classifier_context` object. That field is not part of the text shown, so its size is `not given`.
- The page says the capture stub gave no classifier result, so the program fell back to local classifier requests and "sent the same request more than once". The page does not say how often this happens outside the capture.

Size, from the `## Size` table:

| Part | Characters |
| --- | --- |
| `system[0]` | `78` |
| `system[1]` | `140,015` |
| `messages[0].content[0]` | `13` |
| `messages[0].content[1]` | `28` |
| `messages[0].content[2]` | `60` |
| `messages[0].content[3]` | `14` |
| `messages[0].content[4]` | `191` |
| System blocks only | `140,093` |
| Everything shown here | `140,718` |

The page also says this prompt is `+124,997` characters against its "Default, Lean Prompt" baseline.

The default rule on the page is "By default, actions are ALLOWED." Only a HARD BLOCK match, or a SOFT BLOCK match with no ALLOW exception, blocks.

Custom rules, route `prompts/auto-classifier-custom`:

- Set `autoMode` in settings: `{"allow": ["...", "$defaults"], "soft_deny": [...], "hard_deny": [...], "environment": [...]}`.
- `$defaults` keeps the built-in rules in that list. Without it the built-in rules are replaced.
- Entries in `allow`, `hard_deny`, and `environment` are added at the place of `$defaults`. Entries before `$defaults` come first.
- In the captured example, `soft_deny` had no `$defaults`, so the built-in soft block rules were replaced.
- The example is shorter. `system[1]` is `75,325` against `140,015`. The diff reads "Lines added: 4. Lines removed: 72. Size change: -64,690 characters."
- So the size depends on the lists. Replacing a list shortens the prompt. The page gives no figure for a list that keeps `$defaults` and adds entries. That figure is `not given`.
- The same `auto_mode` object is also in `safeguards.classifier_context` of the main request.

What the page does not say: which model the classifier runs on, whether the call is cached across tool calls, and any setting that skips it. All `not given`. The system block carries a `cache marker` of `{"type":"ephemeral"}`. The page does not say what that saves.

## Compaction

Route: `prompts/compact`. Trigger: run `/compact` in a session with some history. The page does not say whether Claude Code also compacts on its own. That is `not given`.

What the request holds, from the `## Size` table:

| Part | Characters |
| --- | --- |
| `system[2]` | `5,627` |
| `messages[0].content[0]` | `592` |
| `messages[1].content[0]` | `9,056` |
| `messages[3].content[0]`, the summary instructions | `6,755` |
| Everything shown here | `22,575` |

`Tools sent` is `12`. The page says "The summary request still sends the tool list, but the instructions say not to call tools."

The built-in prompt, in the last user message:

- It opens "CRITICAL: Respond with TEXT ONLY. Do NOT call any tools."
- It asks for an `<analysis>` block, then a `<summary>` block.
- The summary has nine sections, from "Primary Request and Intent" to "Optional Next Step".
- It says to keep security-relevant instructions "verbatim" so they apply after compaction.
- It ends with a reminder not to call tools.

Custom instructions, route `prompts/compact-custom`. There are three ways in:

- Text after `/compact` goes under `Additional Instructions:` at the end.
- Text that a `PreCompact` hook prints on stdout goes in the same place, after the user text.
- A `## Compact Instructions` section in `CLAUDE.md` is not copied into the compaction text. The page says the compaction text only asks the model to follow such a section if it finds one in the included context. The section reaches the model through the `CLAUDE.md` reminder.

The cost of custom instructions in the capture: the summary instruction message goes from `6,755` to `6,839`. Everything shown goes from `22,575` to `23,085`. The diff reads "Lines added: 18. Lines removed: 1. Size change: +510 characters." The `CLAUDE.md` section adds a `380` character message, so that part is the reminder and not the compaction text.

Which model compaction runs on: `not given`. A setting that turns the built-in path off: `not given`.

## Which of These Spend the User's Limit

The docs give no cost figure for any call. The lines below say only what the pages give about the model and the size.

- Observer: model `not given`. Cost `not given`. Behind `CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS`.
- Auto mode classifier: model `not given`. Cost `not given`. About `140,718` characters per request in the default capture, and the stub run sent it more than once.
- Auto mode classifier with custom rules: model `not given`. Cost `not given`. About `76,028` characters in the captured example.
- Compaction: model `not given`. Cost `not given`. About `22,575` characters in the capture, with `12` tools sent.
- Compaction with custom instructions: model `not given`. Cost `not given`. About `23,085` characters in the capture.
- Coordinator mode: model `not given`. Cost `not given`. The page shows no size.
- CLI surface text: model `not given`. Cost `not given`. It is added text, not a separate call, as far as the page says. The page does not say.
- Prompt hook: a "small model", name `not given`. Cost `not given`. `1,478` characters shown.
- Agent hook: `Haiku` by default. Cost `not given`. `2,362` characters shown, `10` tools.
- Session naming: model `not given`. Cost `not given`.
- Title and branch name: model `not given`. Cost `not given`.
- Memory extraction: model `not given`. Cost `not given`.
- Memory selection: model `not given`. Cost `not given`.

## Not Given by the Docs

- The full observer prompt. The page ends at "The topic should be worthy of" (`prompts/observer`).
- What the observer returns when it has nothing to say, and how often it fires (`prompts/observer`).
- The model of the observer, the classifier, compaction, coordinator mode, session naming, title and branch name, memory extraction, and memory selection.
- The stage 2 classifier request, and the `safeguards` field of the main request (`prompts/auto-classifier`).
- Any setting that skips or turns off the classifier, other than a rule that allows the tool call (`prompts/auto-classifier`).
- Any automatic compaction trigger and any setting that turns compaction off (`prompts/compact`).
- A character count for the observer, coordinator mode, CLI surface text, session naming, title and branch name, memory extraction, and memory selection. The pages show the text only.
- The rest of the memory extraction prompt. The page shows only its opening, which has an unfilled `${e}` placeholder (`prompts/memory-extraction`).
- The unfilled `${ht}` placeholder and the others in coordinator mode (`prompts/coordinator-mode`).
- Any dollar cost or share of the plan limit for any call.
- A setting that turns off a prompt hook or an agent hook (`prompts/hook-prompt`, `prompts/hook-agent`).
