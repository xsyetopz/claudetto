# claudetto

claudetto is a Claude Code 2.1.327 plugin that keeps only what measurably beats vanilla Claude Code.

## Builtin Plugins

Claude Code bundles 13 plugins (`<name>@builtin`). A plugin cannot refuse a bundled plugin when modules load, so at each session start claudetto sets every bundled id to `false` under `enabledPlugins` in the user settings file (`$CLAUDE_CONFIG_DIR/settings.json`, else `~/.claude/settings.json`). When it changes the file, it logs the ids it turned off. A bundled plugin that already loaded keeps running until `/reload-plugins` or the next start.

claudetto leaves a settings file that does not hold a JSON object untouched and logs that it did.

## Handover

claudetto writes a handover in place of Claude Code's compaction summary. It writes one when an automatic compaction runs, before a typed `/clear`, and when a task ends with the context above the renewal threshold (70,000 tokens by default). A status line reads "Writing handover…" while the handover is written.

Each knob mirrors a compaction knob, with "handover" for "compact" and `CLAUDETTO_` for `CLAUDE_CODE_`:

| Knob | Effect |
| --- | --- |
| `CLAUDETTO_DISABLE_HANDOVER` (env) | Turns every handover path off. |
| `CLAUDETTO_DISABLE_AUTO_HANDOVER` (env) or `autoHandoverEnabled: false` (settings) | Leaves automatic compaction to Claude Code; the `/clear` handover stays. |
| `precomputeHandoverEnabled: false` (settings) | Leaves only the ahead-of-time compaction to Claude Code. |
| `CLAUDETTO_AUTOHANDOVER_PCT_OVERRIDE` (env) | Renewal threshold as a percent of the context window. |
| `CLAUDETTO_AUTO_HANDOVER_WINDOW` (env) or `autoHandoverWindow` (settings) | Renewal threshold in tokens, such as `70k`; the env value wins. |

A manual `/compact` keeps Claude Code's summary and asks it to keep the user's corrections, refusals, and consents word for word.

### Headless Runs

Under `claude -p` a plugin cannot start a compaction, so the task-end renewal does not run. Automatic compaction still runs there and still gets the handover. To renew near 70,000 tokens, the script that starts `claude -p` sets `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=35` on a 200,000-token window: Claude Code then compacts at the lower of that percent and the window minus 13,000 tokens. The renewal then happens mid-task at the threshold, not at a task end. Alternatively, the script sends `/clear` as a prompt between tasks, and claudetto writes the handover first.
