# The "Running SessionStart hooks…" Label That Stays

Source: the 2.1.309 binary, read with `cc-inspect` `search_binary` and `read_module` on 2026-10-23.
The user saw the label for `28m 47s` in a session that ran the claudetto `handoff` compaction (the user, 2026-10-23).

## Two Writers of the Label

1. `chunk-kang00hq.js` near offset `5176500`, function `rmi`.
   The first prompt waits for the plugin modules to load and register their commands.
   The label shows during the wait, and the `finally` block clears it with `setSpinnerMessage(null)`.
   This writer cannot leave the label up.
2. `chunk-h7t3wjg5.js` near offset `9486`, the `applyCompactProgress` handler.
   On a `hooks_start` event, the label is "Running PreCompact hooks…" for `pre_compact`, "Running PostCompact hooks…" for `post_compact`, and "Running SessionStart hooks…" for each other hook type.
   Only `compact_end` (`L()`) or `resetOverrides` clears it.

## The Defect

The automatic compaction path, `chunk-kang00hq.js` near offset `2424489`:

1. It runs the compaction hooks (`bEo`).
2. It sends `compact_end`.
3. When a hook replaced the compaction (`St.kind === "replaced"` or a `replacement` record), it calls `BCo`.
4. `BCo`, near offset `2433183`, sends `hooks_start` with `post_compact`, then `hooks_start` with `session_start`, and runs the `SessionStart` hooks with source `compact`.
5. No `compact_end` comes after step 4 on the success path. So the label stays until the overrides reset.

The manual path, `chunk-hg1mpqsw.js` near offset `19735`, calls `BCo` inside a `try` whose `finally` sends `compact_end`.
So `/compact` clears the label, and only the automatic path leaves it.

## What It Means for Claudetto

- The claudetto `handoff` option replaces the automatic compaction, so each automatic handoff takes this path.
- The cause is in Claude Code, and claudetto cannot patch it.
- Ways out, in order of preference:
  1. A documented mod API that sets or clears the spinner message, called from the claudetto `session.start` hook when its source is `compact`.
     Check the mod API page of the 2.1.309 docs for it.
  2. A report to Anthropic with the offsets above.
  3. Keep the `handoff` option, because the label is a display fault and the session works.
