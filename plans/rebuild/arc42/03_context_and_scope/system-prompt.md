# system-prompt

## System Prompt and Context

## System Prompt and Context

## System Prompt and Context

## System Prompt and Context

## System Prompt and Context

- [x] **CTX-255** A commenter quotes harness prompt lines that say the opposite of a re-engagement hook: 'End your turn when the request is done or nothing is left that you can do without the user'; 'When one part of a task is blocked ... finish everything that does not depend on the stuck part, and open your final message with what is stuck'; 'When you have enough information to act, act'.
  Basis: measured (claude 2.1.327, 2026-11-18, cc-inspect `code` search, chunk-m14bt1pz.js). The program holds all three instructions with small wording differences. 'End your turn when the request is done or nothing is left that you can do without them' (the program says 'them', not 'the user') at @2774805; 'When one part of a task is blocked, unclear, or apparently wrong, the rest usually is not ... Finish everything that does not depend on the stuck part, and open your final message with what is stuck' at @2776525; 'When you have enough information to act, act. Do not re-derive facts already established ...' at @2800845, which a flag-read function (`tengu_cedar_lantern`, env override) switches on. Whether a given session receives each section is decided by flags the fake API does not set and was not probed. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xqlgno-agents-knowingly-fail-to-complet-20261110T093545Z.md:282-291 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xqlgno/agents_knowingly_fail_to_complete_tasks_in_order/>).
  Verified: source already on 2.1.327.
  Verified: not re-run 2026-11-19: quotes a commenter; third-party text, nothing local to run

## System Prompt and Context

## System Prompt and Context

- [x] **CTX-268** The engine adds "<style> output style is active. Remember to follow..." every turn unless the style is default (22,320 `output_style` rows, about 20 tokens each, estimated). Only built-in styles carry `turnReminder`. The plugin style frontmatter allows only name, description, keep-coding-instructions, force-for-plugin, so a plugin style cannot change or empty it.
  Basis: reported (read from `chunk-2x9ma4k7.js`, claude 2.1.325 binary, a module absent from the 2.1.325 install; counted). Status: confirmed in 2.1.326 at `chunk-m14bt1pz.js@5903876 (2.1.327)` (reminder text, with the fallback "Remember to follow the specific guidelines for this style." when `turnReminder` is unset) and built-in styles carrying `turnReminder` at `chunk-m14bt1pz.js@1056565 (2.1.327)`; counts are from 2.1.323 logs.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:649.
  Verified: binary string search, claude 2.1.327, 2026-11-19: "output style is active" turn reminder text is present.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: "output style is active" x2 and turnReminder x5, force-for-plugin x7, keep-coding-instructions x5 in 2.1.327 binary; row counts are log statistics, NOT RE-RUN

- [x] **CTX-269** `silent_turn_reminder` fires when the last 5 assistant messages hold no text, thinking summary, or user-facing tool call (flag `tengu_hushed_lark`). It fires at most 3 times per silent stretch; the timed variant runs at 60 s. Counts: 1,258 rows, up to 155 in one session, about 35 tokens each. A probe showed it fires as designed.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:645.
  Verified: binary string search, claude 2.1.327, 2026-11-19: tengu_hushed_lark is present.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: silent_turn_reminder x13, tengu_hushed_lark x3, silentSince/turnsSinceLastReminder/remindersInStretch fields present in 2.1.327 binary; 5-message window, 3 fires, 60 s and the row counts not verified

