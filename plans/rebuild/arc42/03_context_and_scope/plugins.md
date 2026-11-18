# Plugins

## Plugins and Connectors

## Plugins and Connectors

## Plugins and Connectors

## Plugins and Connectors

## Plugins and Connectors

## Plugins and Connectors

- [x] **CTX-438** claudetto shall note that plugin modules load before `settings.read` answers, so a mod cannot disable a built-in plugin; setup writes `enabledPlugins: false` for unused built-in plugins, and the binary registers claude-platform without the `cc-plugin-` prefix. Related to the settled decision that every `@builtin` gets a disable enforced at runtime (user decision, 2026-11-16). A user-tier plugin also cannot refuse a builtin at `plugin.register`: native plugins are judged only by native ones, and user-tier plugins never judge non-user ones (2.1.327: `hNt`, chunk-m14bt1pz.js@4830970, keeps user-tier judges only for a user-tier plugin; 2.1.325: `ruo()`, `chunk-wqb2b4v0.js@4661039`).
  Acceptance: On 2.1.327 `claude-platform` is registered under that id with no `cc-plugin-` prefix (chunk-syz79m2z.js@1749), and `cc-plugin-claude-platform` has 0 hits; the rest of the claim (load order against `settings.read`) rests on the earlier probes and was not rerun. Verification: inspection.
  Basis: cited. Status: partial at 088a227c (settings.ts:93 enabledPlugins).
  Source: openspec/specs/setup/spec.md:214; plugins/claudetto/hooks/features/setup/settings.ts:93@088a227c; chunk-m14bt1pz.js@4830970 (claude 2.1.327 binary, read 2026-11-18); `chunk-wqb2b4v0.js@4661039` (claude 2.1.325 binary) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290).
  Verified: source already on 2.1.327.

- [x] **CTX-439** Vanilla launch: the init `plugins` list holds `agents-md`, `privacy`, `plugin-authoring`; traces are the skill text in request 1 and `plugins/store/cc-plugin-agents-md_builtin-*.json`. On 2.1.325 `--settings` with `{"enabledPlugins":{"cc-plugin-plugin-authoring@builtin":false}}` removes `plugin-authoring`, which vanilla finds in request 1; a project `.claude/settings.json` disables agents-md and plugin-authoring; a plugin-shipped `settings.json` does not; `claude plugin list --json` on vanilla prints `[]`.
  Acceptance: rerun of the probe prints the same list. Verification: probe. The probe table reproduces. Verification: probe.
  Basis: measured on claude 2.1.325; not rerun on 2.1.326. Status: missing at 088a227c.
  Source: probe: cc-inspect `cli`, claude 2.1.325, 2026-11-16, as the old plan states (`-p go`, stream-json init event), claude 2.1.325; probe, `claude` 2.1.325, 2026-11-16, cc-inspect `cli` `-p go` (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4661); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290).
  Verified: cc-inspect cli with a fake API, claude 2.1.327, 2026-11-19: the init plugins list holds cc-plugin-agents-md, cc-plugin-privacy and cc-plugin-plugin-authoring next to the inline probe plugin.

## Plugins and Connectors

## External Sweep, 2026-11-18

