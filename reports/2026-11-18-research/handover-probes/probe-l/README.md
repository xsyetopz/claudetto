# Probe L: builtin disable per settings tier, Workflow text size (CTX-441, REQ-SETUP-030)

Claude Code 2.1.327, cc-inspect `cli` against the local fake API, prompt "hi". Fake API, no cost.

## Settings tiers (CTX-441)

Hypothesis: `cc-plugin-privacy` (`enabledFromTrustedSettingsOnly`) ignores a project-tier `enabledPlugins` entry, and a flag-tier entry turns it off.

Check: `enabledPlugins` `{"cc-plugin-privacy@builtin":false,"cc-plugin-agents-md@builtin":false}` in each tier; read the init `plugins` list.

| Run | init `plugins` |
|---|---|
| Baseline | agents-md, privacy, plugin-authoring |
| Project `.claude/settings.json` | privacy, plugin-authoring |
| `--settings '<json>'` (flag tier) | plugin-authoring |

Result: confirmed. The trusted tiers are `["userSettings","flagSettings","policySettings"]` (`Zz`, chunk-e0e2620d.js@388), read in order with the later value winning (`hro`, @1040).

User tier: the local 2.1.327 binary with a temporary `CLAUDE_CONFIG_DIR` holding the same `settings.json` and a dead API URL (the init line comes before any request) lists only plugin-authoring: user settings turn both off.

Policy tier, local file: `CLAUDE_CODE_MANAGED_SETTINGS_PATH`, set to a file and then to a folder holding `managed-settings.json`, changed nothing (init list unchanged; debug log: "sec-default@builtin not seated: no managed settings"). The release build stubs the override: `s_()` calls `xxi(){return}` and falls back to `/Library/Application Support/ClaudeCode` (chunk-ja5z738t.js@403823).

Policy tier, remote managed settings (measured): the policy tier also loads from `GET /api/claude_code/settings` (chunk-xa2mcav9.js@60173). That fetch runs for an API-key session on the real API host and is skipped when `ANTHROPIC_BASE_URL` is set (`custom_base_url`, eligibility function at chunk-w515g7wc.js@4513). cc-inspect `cli` with `login:"key"`, `apiHost:true`, `baseUrl:false` answered it with `{"settings":{"enabledPlugins":{"cc-plugin-privacy@builtin":false,"cc-plugin-agents-md@builtin":false}}}`. Init `plugins`, three runs:

| Run | Init plugins |
|---|---|
| No remote reply (control) | agents-md, privacy, plugin-authoring |
| Remote policy disables both | sec-default, plugin-authoring |
| Remote policy disables both, `--settings` enables both | sec-default, plugin-authoring |

Result: confirmed. Policy turns builtins off and wins over the flag tier, as its last place in `Zz` predicts. Any policy source also seats `sec-default`.

## Workflow description size (REQ-SETUP-030)

Check: cc-inspect `cli` with `tool:"Workflow"` on request 1; the description is saved in `workflow-description-2.1.327.txt`.

Result: 3,496 characters (3,518 bytes). The 22,331 figure in older plans is the 2.1.321 plugin-grown text (CTX-060).
