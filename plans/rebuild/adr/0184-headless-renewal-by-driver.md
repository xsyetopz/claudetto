---
status: accepted
date: 2026-11-18
---
# Headless Renewal Is Sent by the Driver

## Context and Problem Statement

claudetto is interactive-first, with `claude -p` as the fallback. RT-025 assumed a mod can clear the session through `$.command.run`. Under `-p` on 2.1.327 it cannot:

- Probe A (three sessions): an awaited plugin clear threw "the command was removed from the queue before it ran"; only the SDK-origin `/clear` prompt ran (`clearCommandQueue`, chunk-m14bt1pz.js@740648; subscriber @5989824).
- Probe F: an unawaited clear after the last prompt threw "the host has ended its input"; `$.session.compact` threw "not available in a headless (-p / SDK) session yet" (headless composer `compact:()=>Promise.reject(...)`, chunk-rap1tzf6.js@763945).

In interactive mode the composer forwards `$.session.compact` to the host (chunk-cfxefa64.js@230853), which runs `compactManually` with `trigger:"plugin"` between turns and rejects during a turn (chunk-cfxefa64.js@500556). Probe H drove the TUI in tmux on 2.1.327: called from `turn.complete`, `$.session.compact` is accepted, the hook gets trigger `plugin`, and a hook that returns `{messages:[{role:"user", text, toolUses:[]}]}` replaces the summary with no summarizer request; other shapes fall back to the default summary (CTX-843). How does a session renew in each mode?

## Considered Options

- Mod-issued `/clear` in both modes (refuted under `-p`).
- Interactive: `$.session.compact` with custom instructions between turns; headless: the driver sends `/clear` or `/compact <instructions>` as a prompt.

## Decision Outcome

Chosen: the split. The mod catches the headless rejection and does nothing further; the driver script owns renewal under `-p`.

## Consequences

- RT-025 is replaced by this split; RT-024 (fork handover, effort low) and RT-026 (after a user-typed clear) hold.
- The interactive path is probed (CTX-843). The hook must return the exact shape `{role:"user", text, toolUses:[]}`; a wrong shape costs a summarizer call and loses the handover (RISK-489).

Source: reports/2026-11-18-research/handover.md Q2 and RT status; reports/2026-11-18-research/handover-probes/probe-a/ and probe-f/probe.log (cc-inspect `code cli`, claude 2.1.327, 2026-11-18); probe-h/probe.log and run1..3/ (interactive TUI in tmux, fake API, claude 2.1.327, 2026-11-18); user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:7).
