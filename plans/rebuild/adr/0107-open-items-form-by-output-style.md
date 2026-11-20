---
status: accepted
date: 2026-11-17
---
# What I Need From You Bullet Form

## Context and Problem Statement

The Concise output style wrote `- [ ] ! <command>` under "What I Need from You", while the Stop hook reads `- !`.

The Stop open-items check parses only `- [ ]` items. A numbered "What I Need from You" item is invisible to it: `bun evidence/tmp/probe-oi.ts` printed `{"items":[]}` for `1. Send what the empty message was meant to say.` No markdown parser is available to a plugin hook; `open-items.ts` parses one line shape with a regex (`OPEN_ITEM`).

Facts on `!` (checked 2026-11-17 on 2.1.326, on the user's request to learn where `!` works and its limits):

- `!` is shell mode of the interactive prompt: the typed command and its output enter the conversation, the model answers the output at once unless `respondToBashCommands` is `false`, and the command runs outside the sandbox unless the session is in strict sandbox mode (code.claude.com `interactive-mode`, section "Shell mode with `!` prefix").
- In `-p` with stream-json input, a user message `! echo ZQXBANG$((40+2))` is not run: one request, and `ZQXBANG42` appears in no request or transcript (cc-inspect `cli` probe). A `!` step therefore helps only a user at the interactive prompt, not a `-p` or SDK caller.
- The prompt stores the command as `<bash-input>…</bash-input>` (`chunk-mxa8qkgm.js@21499`); remote (CCR) clients send it through an internal input frame that refuses a blank or too-long command with `<bash-stderr>Not run: …</bash-stderr>` (`chunk-rj3e7agr.js@337977`).
- Unprobed: the interactive length limit, and whether a `!` command gets a terminal for a password or touch prompt.

## Considered Options

- `- [ ] ! <command>` (the earlier form).
- `- ! <command>` with no checkbox, since nobody ticks one in a reply.
- Parse a list under a heading, which needs a heading list (a word list).
- The output style demands the form the check parses.

## Decision Outcome

Chosen option: `- ! <command>`, with no checkbox and at most one command bullet per reply (user decision, AskUserQuestion 2026-11-17). No Stop open-items check ships, and `open-items.ts` goes; the output style alone teaches this form (user decision, AskUserQuestion 2026-11-17). Because `!` runs only at the interactive prompt, a user step in `-p` or SDK use goes to AskUserQuestion or the report text.

## Consequences

The wording "a command only the user can run" is replaced, because it makes the agent hand off whatever a gate refuses.

Limit: with no Stop check, nothing catches a reply that ignores the style and writes `1.` instead. The follow rate has no number; the ADR-0177 eval run is the check, and a rate no better than vanilla drops the line. The decision adds no parse and no word list, in line with the settled decision "no regex Stop check" (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).

## Confirmation

An eval of how often replies use `- ! <command>` confirms this decision; not yet run. The earlier held-out check of the old `- [ ]` form scored 28/32 (Wilson 0.719-0.950).

Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:300; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:296; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:301.
