---
status: accepted
date: 2026-11-17
---
# Batched Edit Tool

## Context and Problem Statement

A batch edit tool (the README block `edit`, a perl batch) was weighed against the built-in Edit. Measured: 0 consecutive Edit-only responses to one file in 82 runs; a cross-file batch merges at most 2.0% (18/901) of dev responses; Edit failed 0 in 188 calls; no MultiEdit among the 95 tools of 2.1.325; a `perl -0pi` batch costs typos, hides changes, breaks the next Write ("modified since read").

One `Bash` call `perl -0pi -e 's/.../.../g' a b c` replaces many `Edit` calls. Under `acceptEdits` it is denied ("The following part requires approval: perl -0pi -e ..."). With `permissions.allow: ["Bash(perl -0pi -e *)"]` it runs with no prompt (`permission_decision: accept, source: config`) and the files change. The rule bypasses the `Read`-before-`Edit` guard and the `Edit` diff view.

The agent used Bash perl for 5 to 10 substitutions per call and broke Write, Read, and review. Does claudetto drop batch edits or design one?

Transcript record tx-x01b/batch-edit-rejected-by-measurement: Should claudetto add a batch edit tool (tasks item 8.2)?

Transcript record tx-x02/perl-allow-with-diff-hook: Under `acceptEdits`, `perl -0pi` is denied with "requires approval". With `permissions.allow: ["Bash(perl -0pi -e *)"]` it runs.

Transcript record tx-x02/perl-batch-edit: Many `Edit` calls cost more than one batch.

## Considered Options

- Build a perl batch edit tool
- Edit stays the one way to edit
- Setup writes the `Bash(perl -0pi -e *)` allow rule, plus a `PostToolUse` hook on `Bash(perl -0pi*)` that prints `git diff --stat` of the touched files.
- A custom perl tool through `$.tool.register`: it needs its own permission check and adds a tool schema to each request.
- Edit only, one call per replacement.
- A bounded batched edit tool that saves calls and tokens.
- Build a MultiEdit-like batch tool.
- Reject it.
- Leave it denied.
- Allow it plus a diff hook.
- Many `Edit` tool calls.
- `Bash(perl ...)` or a custom perl tool.

## Decision Outcome

Chosen: the allow rule plus the diff hook, with a re-Read step (hybrid of options 1 and 3), by the comparison the user asked for on 2026-11-17 (asked through AskUserQuestion in session `0342617c`). Setup writes `permissions.allow: ["Bash(perl -0pi -e *)"]`; a `PostToolUse` hook on `Bash(perl -0pi*)` prints `git diff --stat` of the touched files and tells the model to Read each touched file before a Write. No batch tool is registered.

Comparison (2.1.326; tokens are estimates from bytes / 4):

- Schema cost: the allow rule adds 0 tokens per request. A registered batch tool is deferred under the default tool-search mode `tst` (chunk-23j5d5d6.js@8177), so it costs about 8 tokens per request for its name and 170 to 350 once loaded; the stock Edit entry is 969 bytes.
- Savings: 44 transcripts in `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/` hold 16,086 responses and 3,590 Edit calls; 794 responses hold 2 or more Edits (1,939 extra calls, about 135k tokens); 57 consecutive Edit-only runs cover 128 turns, so a batch saves 72 turns. A deferred tool roughly breaks even against its name cost; a loaded one costs 2.7M to 5.6M cache-read tokens over the same requests.
- Safety: Write refuses a file changed after its Read unless the Read was full and the content is equal (chunk-m14bt1pz.js@1756990), so a perl batch and a batch tool both break the next Write; the re-Read step cures it for the perl rule. A batch tool gives no safety edge, and a deferred tool may go unused (ListAgents was called in 0 of 8 sessions).

Rejected: Edit as the only way (tx-x01b, the agent's own measurement over 82 runs; the user chose to compare), and a registered batch tool (option 3, schema cost with no safety edge).

Acceptance probe: Read a file, run `perl -0pi -e` on it, then Write it. Pass: the hook output names the file and its diff stat, the model Reads it, the Write succeeds, and the request body carries no new tool entry. Baseline without the hook: the Write fails with "File has been modified since read". Whether a hook's own `$.tool.call Read` refreshes the read state, which would let the hook Read for the model, does refresh it (fake-API probe, 2026-11-18, probes-open-five/probe2): a PostToolUse hook on Bash called `$.tool.call({tool:"Read"})` after a scripted `perl -pi` edit, and the following Write succeeded and the file ended as written; the same run without the hook returned "File has been modified since read, either by the user or by a linter. Read it again before attempting to write it." and left the file edited. The Write guard compares the file timestamp with the recorded read, and a stale read passes only when the Read was full and the content is equal (chunk-m14bt1pz.js@1756500-1757500, 2.1.327).

## Consequences

2.1.325: absent (tool MultiEdit; 95 tools confirmed).

Blind edits are cured by the diff hook, not by the removed guard. No tool schema is added to each request.

The hook must name every file perl touched, and the repeat guard must not block the Read that the re-Read step or an Edit needs.

Transcript record tx-x01b/batch-edit-rejected-by-measurement decided: Rejected. Over 82 runs no run had consecutive Edit-only responses to one file; a cross-file batch could merge at most 18 of 901 dev responses (2.0%) and 0 of 623 stock ones; `Edit` had 0 errors in 188 calls; a new tool adds schema bytes to every request. This is the agent's decision on a measurement, not a user decision, and it argues against the `edit` block of the plan layout. Good: no schema cost. Bad: the `edit` block needs a user ruling.

Transcript record tx-x02/perl-allow-with-diff-hook decided: "Allow + diff hook". Measured on 2.1.325 (cc-inspect `cli`).

Transcript record tx-x02/perl-batch-edit decided: perl through `Bash`, or a custom perl tool, to do many edits in one call. The product is trimmed to the bone. Permission handling is in `[ADR-0097](0097-batched-edit-tool.md)`.

Source: openspec/changes/2-1-325-rearchitecture/items.json:130; user decision, 2026-11-16 (User Answers); comparison of 2026-11-17 (chunk-23j5d5d6.js@8177 (2.1.327), chunk-m14bt1pz.js@1756990 (2.1.327), claude 2.1.326 binary; transcript scan of the 44 session logs); probe: Claude Code 2.1.325, `acceptEdits` and the allow rule, as stated by the old plan (command and date not given); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10693); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10779); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:2433 (probes `probe-batch.ts` and `probe-batch-loose.ts`); observed in transcript, 2026-11-16; user answer through AskUserQuestion, 2026-11-16 18:04 UTC, all 14 builtins off, perl allowed with a diff hook, settings rewritten (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5034); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352.
