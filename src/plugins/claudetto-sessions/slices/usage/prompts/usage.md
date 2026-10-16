Usage: claudetto-usage [--days 7] [--root DIR] [--runs 20] [--window N] [--agents-dir DIR] [--plugin-versions JSON] [--json]

Reports where Claude Code usage went, from the session transcripts.
--days N         The period, in days back from now. Default 7.
--root DIR       The transcripts folder. Default: projects under $CLAUDE_CONFIG_DIR or ~/.claude.
--runs N         Rows in the run tables. Default 20.
--window N       The context window in tokens. Default: from the model name, else 200000.
--agents-dir DIR Read maxTurns from DIR/<agent>.md to compare the briefs of runs that hit the turn limit.
--plugin-versions JSON
                 The plugin version of each session id, to count the sessions by plugin version.
                 The command /claudetto-sessions:usage gives it from the record of the plugin.
--json           Print the report as JSON.
