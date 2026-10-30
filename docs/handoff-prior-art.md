# Handoff Prior Art

Read on 2026-10-27 from a shallow clone of each repo (`git clone --depth 1`). No code from them was run. Every claim cites `file:line` of that clone, and a claim with no citation was not read. The clones are deleted, so the line numbers refer to the default branch head of that day.

## Table

| | `AnExiledDev/compact-handoff-plugin` | `trytofly94/handoff-compact` | `raichominev/compaction-handoff` |
| --- | --- | --- | --- |
| LICENSE, first line | `MIT License` (`LICENSE:1`) | `MIT License` (`LICENSE:1`) | `MIT License` (`LICENSE:1`) |
| Copyright line | `Copyright (c) 2026 AnExiledDev` (`LICENSE:3`) | `Copyright (c) 2026 trytofly94` (`LICENSE:3`) | `Copyright (c) 2026 Raicho Minev` (`LICENSE:3`) |
| Kind | Mod (`"modules": ["module.js"]`, `hooks/hooks.json:3`) | Mod (`"modules": ["./register.js"]`, `hooks/hooks.json:2`) | Command hooks in Python (`hooks/hooks.json:8`) |
| Events | `session.start` (`hooks/module.js:281`), `turn.complete` (`:490`), `session.compact` incl. trigger `precompute` (`:514`, `:518`), `tool.call` (`:393`), `engine.create` (`:725`) | `session.compact` (`hooks/register.js:295`), and with `trigger: self` also `session.measure` (`:319`) and `turn.complete` (`:332`) | `PostToolBatch`, `PreCompact`, `SessionStart` with matcher `compact` (`hooks/hooks.json:3`, `:14`, `:25`) |
| `SessionEnd` or `Stop` | Not registered (the `on(` list above) | Not registered (`:295`, `:319`, `:332` are all of them) | Not registered (`hooks/hooks.json`) |
| Model call | Yes, `$.model.fork` (`hooks/module.js:1039`, `:1975`, `:2023`) and a spawned subagent (`:18`, `:1767`) | Yes, `$.model.fork` (`hooks/register.js:201`) | None in the script. The script has no `subprocess` call. The model writes the handoff when the skill runs after an injected request (`scripts/compaction_recovery.py:662`, `skills/compaction-handoff/SKILL.md:13`) |
| Writes | See below | See below | See below |
| Failure | Fallback to the harness, rows kept, mostly silent `safely` (`hooks/module.js:3041-3047`) | Fallback to the harness, `debug` log lines (`hooks/register.js:112`, `:265`, `:281`) | One stderr line (`scripts/compaction_recovery.py:853-854`) and many bare `return` |
| Secret redaction | None found | None found | None found |

## What Each Writes and Where

`compact-handoff-plugin`

- `<dataDir>/sessions/<session>/<depth>-<time>.md`, `.summary.md`, `.transcript.md`, `.replacement.md`, `.json`, and appended `runs.jsonl` and `index.jsonl` (`hooks/module.js:2466-2497`).
- `dataDir` defaults to `$HOME/.claude/compact-handoff` (`hooks/module.js:2392-2401`).
- `latest.md` under the plugin root `.runs/` (`hooks/module.js:35-38`, `:1664`), moved there whole after a sentinel line (`:45`).
- It also appends `window.jsonl` (`hooks/module.js:2855`, `:2930`).
- Rehearsal is the default: unless `COMPACT_HANDOFF_LIVE` is on it writes what it would hand up and then calls `next(e)` (`hooks/module.js:28-31`).

`handoff-compact`

- `<handoffDir or $HOME/.claude/handoffs>/<sessionId>-<iso time>.md` (`hooks/register.js:227-228`).
- The handoff text also replaces the conversation as one user message (`hooks/register.js:311`).
- Body: the fork reply, adapter notes, state files, the last N user prompts verbatim, the last N answers shortened (`hooks/register.js:210-223`).

`compaction-handoff`

- `$COMPACTION_DIR` or `~/.claude/compaction/<session>/` (`scripts/compaction_recovery.py:39`, `:362-364`).
- `digest-<tag>-<time>.md`, a code-built extract with no model call (`scripts/compaction_recovery.py:386-387`, header at `:344-350`).
- `state.json` (`:88-90`, `:707`), the marker `handoff-done.txt` holding the handoff path (`:496-507`), and an append-only costs file (`:510-516`).
- The handoff itself is written by the model, not the script (`skills/compaction-handoff/SKILL.md:63-64`).
- Resume prints text on `SessionStart` for `compact` (`scripts/compaction_recovery.py:815`), the continuation prompt capped at 7000 characters (`:729`).

## Behaviour at Compaction

- `compact-handoff-plugin` answers `session.compact` without `next` when live, so the harness summariser never runs (`hooks/module.js:4-6`). It tries a fork first and reads a file written between turns as the fallback (`:599-605`). It records that a hook dispatch is cut off after about ten seconds, measured at 2.1.269 (`:10-14`). Our `classic.SessionEnd` writer must stay well inside that.
- `handoff-compact` forks at `session.compact` and replaces the conversation with one message (`hooks/register.js:305-311`). If the fork fails it hands back to the harness with the outline as instructions (`:306-309`, header `:24-26`). Its outline is nine sections (`:35-45`).
- `compaction-handoff` can block an auto `PreCompact` with `{"decision": "block"}` while the handoff is missing (`scripts/compaction_recovery.py:715-718`). Otherwise it writes a `final` digest (`:719-720`).

## Failure Style

- `compact-handoff-plugin` swallows reading errors in `safely` and returns `null` with no log (`hooks/module.js:3041-3047`). A failed store is kept only as a field `storeFailed` on the row (`:2439-2443`).
- `handoff-compact` logs with `$.ui.log(..., { to: 'debug' })` for adapter and compaction errors (`hooks/register.js:112`, `:265`, `:281`) but a failed file write is `catch {}` with no log (`:230-234`).
- `compaction-handoff` prints one stderr line for any exception (`scripts/compaction_recovery.py:853-854`), but `usable` and `watch` return silently on missing input (`:641-663`).

## Redaction

I grepped the three clones for `redact`, `secret`, `credential`, `password`, `sensitive`, `scrub`. `handoff-compact` and `compaction-handoff` have no hit in code, README, or skill. `compact-handoff-plugin` has hits only about a credentials copy in a test run (`hooks/module.js:3018`, `:3028`, and lines 741 and 746 of the `compact-handoff-plugin` README, not ours), not about writing session text. All three write user prompts, tool arguments, or tool errors to disk unfiltered. The `compaction-handoff` digest includes tool arguments such as `command` and `url` (`scripts/compaction_recovery.py:55-56`, `:256-262`) and error text (`:285-286`, `:319`). `handoff-compact` keeps prompts up to 1000 characters (`hooks/register.js:159`). Our writer needs its own redaction.

## What Claudetto May Borrow

All three are MIT. The MIT condition is to keep the copyright notice and the licence text in a copy of "substantial portions". Ideas, section names, and caps are not code. Where we write our own code, no notice is needed. Where we copy lines, add the notice to `THIRD_PARTY` or to the file header.

Borrow as an idea, write our own code:

- A code-built mechanical extract with no model call, from `compaction-handoff`: user messages verbatim, Claude text clipped, tool calls as one line each, file lists of edited and read (`scripts/compaction_recovery.py:273-359`). This is the closest match to the handoff writer. Rewrite it in TypeScript against `$.session.messages`.
- Drop `<system-reminder>` blocks before writing (`scripts/compaction_recovery.py:58`, `:282`, and `hooks/register.js:90-92`).
- Skip meta, compact-summary, and visible-only entries (`scripts/compaction_recovery.py:278`).
- Keep the last N prompts word for word and only clip answers (`hooks/register.js:143-163`, `:219-222`).
- Write the file whole, never half, with a completion sentinel (`hooks/module.js:37-45`).
- File name with session id and time (`hooks/register.js:228`).
- Cap the text printed back at resume well under the hook output cap of 10,000 characters (`scripts/compaction_recovery.py:727-729`).
- Wrap each step so one failure costs only that step (`hooks/module.js:486-489`), but log it (see below).
- The nine-section outline in `hooks/register.js:35-45` matches our nine-section file. Our own section list is ours, so do not copy the wording. The nudge text for Claude is ours to write.

Do not copy:

- Any model call (`$.model.fork`, `$.agent.spawn`). The handoff writer takes no model call.
- Silent `catch {}` and `safely` returning `null` (`hooks/register.js:234`, `hooks/module.js:3041-3047`). A log line is required for each silent failure.
- Writing under the plugin root (`hooks/module.js:1664`). Our target is `.claude/claudetto/handoffs/`.
- Writing session text with no redaction. Add redaction and a test for it.
- Replacing the conversation or blocking compaction (`hooks/register.js:311`, `scripts/compaction_recovery.py:716`). The task asks only for a writer, and a block can hold the user up.
- Rehearsal mode by default (`hooks/module.js:28-31`).
- Injecting the handoff as a prompt (`hooks/register.js:273`).

## Open Points

- `SessionEnd` and `Stop` are not used by any of the three, so none shows whether `$.session.messages` and `$.fs.write` work in `classic.SessionEnd` for reason `clear`. That stays with probe 2.1.
- I did not read the `bench/`, `evals/`, or test files of `compact-handoff-plugin`, and I read only the parts of `hooks/module.js` cited above (3154 lines). I did not read `hooks/lib.js` beyond a grep for redaction. Claims about it are limited to that grep.
- The `compact-handoff-plugin` claim "dispatch is cut off after about ten seconds" is the author's measurement in a comment (`hooks/module.js:10-14`). I did not reproduce it.
