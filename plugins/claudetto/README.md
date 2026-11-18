# claudetto

claudetto is a Claude Code 2.1.327 plugin that keeps only what measurably beats vanilla Claude Code.

## Builtin Plugins

Claude Code bundles 13 plugins (`<name>@builtin`). A plugin cannot refuse a bundled plugin when modules load, so at each session start claudetto sets every bundled id to `false` under `enabledPlugins` in the user settings file (`$CLAUDE_CONFIG_DIR/settings.json`, else `~/.claude/settings.json`). When it changes the file, it logs the ids it turned off. A bundled plugin that already loaded keeps running until `/reload-plugins` or the next start.

claudetto leaves a settings file that does not hold a JSON object untouched and logs that it did.
