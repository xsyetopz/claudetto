# Claude Code Plugins: Manifest

The manifest is the `plugin.json` file in the `.claude-plugin/` folder of a plugin.
It names the plugin and can point to its parts.
For example, `{ "name": "my-plugin", "version": "1.0.0" }` is a valid manifest.
The marks are explained on [Plugins](Claude-Code-Plugins).

## Rules

- The file is `.claude-plugin/plugin.json`.
  It is optional.
  Only `name` is required.
- An unknown top-level key is stripped (warning in `claude plugin validate`).
  An unknown key inside `userConfig`, `channels`, `lspServers`, or `monitors` is an error and the plugin does not load.
- A component path starts with `./`, stays inside the plugin root, and exists.
- Source: [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), schema `external/cc-kg/2.1.300/schemas/plugin.schema.json`, bundle zod object for the manifest.

## Top-Level Keys

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `$schema` | Editor schema URL. | Ignored at load. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `name` | Plugin id and namespace. | Not empty, no spaces, no control or bidirectional characters. Reserved: starts with `claude-`, `anthropic-`, `anthropics-`, `cc-plugin-`, or is `claude`, `anthropic`, `claude-code`, `claude-mods`. | plugin.json, entry | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `displayName` | UI name. | An entry value wins. | plugin.json, entry | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `version` | Version text. | Not checked as semver. Pins users until changed. The manifest value wins over the entry. | plugin.json, entry | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `description`, `homepage`, `repository`, `license`, `keywords` | Listing data. | `homepage` must be a URL. | plugin.json, entry | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `author` | Maker. | Object: `name` (required), `email`, `url`. | plugin.json, entry | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `metadata` | Free map for you. | A non-object is dropped. | plugin.json, entry | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `icon`, `documentationUrl`, `supportUrl`, `privacyPolicyUrl`, `termsOfServiceUrl` | Directory listing data. | Bundle lists more ignored names: `screenshots`, `classification`, `privacy_policy`, `privacyPolicy`, `support`, `bugs`, `terms_of_service`, `docs`. | plugin.json only | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference) |
| ✅ | `defaultEnabled` | Start state when the user set nothing. | Default `true`. The entry value wins. `enabledPlugins` always wins. | plugin.json, entry | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `dependencies` | Plugins that must be enabled. | `"name"`, `"name@marketplace"`, or an object. Bundle also allows a trailing `@^range` and strips it. | plugin.json, entry | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `settings` | Settings applied while enabled. | Only `agent` and `subagentStatusLine` take effect. A root `settings.json` wins. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `userConfig` | Values asked at enable time. | See the next table. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `channels` | Message channels. | Items: `server`, `displayName`, `userConfig`. Strict. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `types` | A `.d.ts` for a mod. | Must end in `.d.ts`, no `..`. See [Mod API](Claude-Code-Mod-API). | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference) |
| ✅ | `skills` | Extra skill directories. | Adds to `skills/`. `"."` is the root. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `commands` | Command files or map. | Replaces `commands/`. Map entry: `source` or `content` (exactly one), `description`, `argumentHint`, `model`, `allowedTools`. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `agents` | Agent `.md` files. | Replaces `agents/`. No directories. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `hooks` | Hook files or inline. | Merges with `hooks/hooks.json`. A file needs the `"hooks"` wrapper. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `mcpServers` | MCP configs. | Path, `.mcpb` or `.dxt` bundle path or URL, inline map, or array. Later names replace earlier. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `lspServers` | LSP configs. | Fields: `command`, `extensionToLanguage`, `args`, `transport`, `env`, `initializationOptions`, `settings`, `workspaceFolder`, `startupTimeout`, `shutdownTimeout`, `requestTimeout`, `restartOnCrash`, `maxRestarts`, `diagnostics`. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `outputStyles` | Style files or dirs. | Replaces `output-styles/`. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `workflows` | Workflow `.js` files or dirs. | Replaces `workflows/`. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Add Components to a Plugin](https://code.claude.com/docs/en/plugins/components) |
| ✅ | `experimental.themes` | Theme files or dirs. | Replaces `themes/`. Top-level `themes` still loads with a warning. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Add Components to a Plugin](https://code.claude.com/docs/en/plugins/components) |
| ✅ | `experimental.monitors` | Background watchers. | Items: `name`, `command`, `description`, `when` (`always` or `on-skill-invoke:<skill>`). Interactive sessions only. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Add Components to a Plugin](https://code.claude.com/docs/en/plugins/components) |
| ✅ | `experimental.evals` | Eval directory. | Default `evals/`. Used by `claude plugin eval`. | plugin.json | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference) |
| 🔍 | `experimental.syntaxHighlighting.hljsLanguages` | Extra highlight.js languages. | Up to 16 items: `id` (`^[a-z][a-z0-9_-]*$`, 64 at most), `remote` (`npm:<pkg>[@ver]` or `github:<owner>/<repo>@<ref>#<path>.js`), `integrity` (SRI `sha256-`, `sha384-`, `sha512-`). Strict. | plugin.json | bundle `hljsLanguages` |
| 🔍 | `binaries` | Files fetched into `bin/` at install. | Map of base name to `{ "sha256": <64 hex> }`. At most 64 entries. Names match `^[a-z0-9](?:[a-z0-9._-]*[a-z0-9_-])?$`. Env `CLAUDE_CODE_PLUGIN_BINARY_ASSETS` exists. | plugin.json | bundle `binaries`, schema |

## `userConfig` Option Keys

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `type` | Value type. | `string`, `number`, `boolean`, `directory`, `file`. | userConfig, channels | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference) |
| ✅ | `title`, `description` | Dialog label and help. | Both required. | same | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Add Components to a Plugin](https://code.claude.com/docs/en/plugins/components) |
| ✅ | `required`, `default` | Empty rule and default. | Default is a string, number, boolean, or string array. | same | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference) |
| ✅ | `multiple`, `sensitive` | List and secret. | `sensitive` goes to secure storage. | same | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference) |
| ✅ | `min`, `max` | Number bounds. | `number` only. | same | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference) |
| ✅ | `options` | Fixed choices. | `string`, not multiple, not sensitive. 1 to 64 characters. Needs v2.1.271. | same | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |

The key name must match `^[A-Za-z_]\w*$`.
It becomes env `CLAUDE_PLUGIN_OPTION_<KEY>` in hooks.

## Components and Layout

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `skills/`, `commands/`, `agents/`, `output-styles/`, `workflows/`, `themes/` | Default component places. | A manifest key replaces or adds as listed above. | Plugin root | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `hooks/hooks.json` | Hooks. | Keys `hooks`, and bundle also `modules` (one path to a hooks module) and `description`. `surface` is gone. | Plugin root | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Marketplace Reference](https://code.claude.com/docs/en/plugins/marketplace-reference) |
| ✅ | `.mcp.json`, `.lsp.json`, `monitors/monitors.json`, `settings.json` | Config files. | Loaded before manifest entries. | Plugin root | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Plugin Loading Reference](https://code.claude.com/docs/en/plugins/loading) |
| ✅ | `bin/` | Executables on the Bash tool `PATH`. | claude.ai and Cowork do not install a plugin with `bin/`. | Plugin root | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Add Components to a Plugin](https://code.claude.com/docs/en/plugins/components) |
| ✅ | Root `SKILL.md` | A single-skill plugin. | Only when there is no `skills/` and no `skills` key. | Plugin root | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference) |
| ✅ | Root `CLAUDE.md` | Not loaded. | `validate` warns. | Plugin root | [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference), [Plugin Commands Reference](https://code.claude.com/docs/en/plugins/cli-reference) |

## See Also

- [Plugin Manifest Reference](https://code.claude.com/docs/en/plugins/manifest-reference) is the docs page.
- [Marketplace](Claude-Code-Plugins-Marketplace) covers `marketplace.json`.
