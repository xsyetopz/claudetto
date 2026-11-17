---
status: accepted
date: 2026-11-16
---
# Disable all 14 Claude Code Builtins by Rewriting User Settings

## Context and Problem Statement

Claude Code 2.1.325 registers 14 `<name>@builtin` plugins. A plugin cannot refuse a builtin at runtime: `plugin.register` hooks may answer `{ refuse }`, but a native plugin is judged only by native plugins, and a non-user plugin is not judged by user-tier plugins (`UDt()`, chunk-4h798pp0.js@4758683 in 2.1.326; `ruo()`, chunk-wqb2b4v0.js@4661039 in 2.1.325). A plugin-shipped `settings.json` with the same keys left the builtins present; a `--settings` file or a project `.claude/settings.json` with `false` removed them. At `088a227c` setup writes `enabledPlugins` `false` for 11 ids (`plugins/claudetto/hooks/features/setup/settings.ts:64-76`); `cc-plugin-sec-default`, `cc-plugin-telemetry`, and `cc-plugin-privacy` are missing (status: partial).

Transcript record tx-x02/builtin-disable-all-14: The question was which builtins to disable.

Transcript record tx-x02/builtin-enforcement-rewrite-settings: A plugin cannot refuse a builtin; a plugin-shipped `settings.json` does not disable it; a project `.claude/settings.json` does.

## Considered Options

- Setup writes `false` for 11 ids (baseline).
- Setup writes `false` for all 14 ids, `privacy` included, into user settings, a trusted scope.
- A runtime refusal through `plugin.register` (rejected: no such path exists).
- Leave `privacy` on (rejected by the user).
- A subset.
- Refuse at `plugin.register`.
- Plugin-shipped `settings.json`.
- Rewrite settings at session start and ask for a restart.

## Decision Outcome

Chosen: setup writes `enabledPlugins["<id>@builtin"] = false` for all 14 ids into user settings (user decision, 2026-11-16: all 14, `privacy` included). At session start the check reads user settings; if any of the 14 ids is not `false`, it writes `false` for it into user settings and tells the user to run `/reload-plugins` (interactive) or restart (headless), because the hooks module of a re-enabled builtin is already running. No runtime refusal path exists.

## Consequences

Every later launch loads no builtin. A `Skill` call right after the write can still launch (the watcher reads the file about 1.2 to 1.5 s after the write). The skill listing already sent in request 1 stays in history until the next clear. `sec-default` is policy-only and cannot be changed by a user setting. Settled with `claudetto-you-should-know` fully recreating `cc-plugin-you-should-know@builtin`.

Transcript record tx-x02/builtin-disable-all-14 decided: "All 14". Includes `cc-plugin-sec-default` (policy-only) and `cc-plugin-privacy` (trusted-only); both need managed or user settings.

Transcript record tx-x02/builtin-enforcement-rewrite-settings decided: "Rewrite settings": write `false` into user settings. Later measured: the watcher reads settings 1.2 to 1.5 s after the write and skills vanish, but a builtin hooks module keeps running until `/reload-plugins` or a restart, so session start repairs drift and tells the user. The first two options are measured not to work.

Source: user decision, 2026-11-16 (User Answers); chunk-qg227pzf.js@78493 and @78645 (claude 2.1.326 binary, relocated from chunk-yjs2ay06.js@72522 and @72674 of 2.1.325; `yY()` read 2026-11-17 in 2.1.325); chunk-4h798pp0.js@4758683 (claude 2.1.326 binary, relocated from chunk-wqb2b4v0.js@4661039 of 2.1.325: the `plugin.register` judge that leaves out user-tier judges for a non-user plugin); chunk-wqb2b4v0.js@4789330 (claude 2.1.325 binary; not found in 2.1.326: relocate found no hit); probes: cc-inspect `cli`, claude 2.1.325, 2026-11-16 (see arc42/03 items); plugins/claudetto/hooks/features/setup/settings.ts:64@088a227c; user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352; measured, `claude` 2.1.325 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352).
