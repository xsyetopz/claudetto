# Claude Code MCP Auth

Some MCP servers need you to sign in.
Claude Code supports OAuth, a script that makes headers, and managed sign-in for enterprises.
For example, `/mcp` opens a panel where you start the OAuth sign-in for a server.
The marks are explained on [MCP](Claude-Code-MCP).

## OAuth Options

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | OAuth flow | Signs in to a remote server | A `401` or `403` marks a server as needing auth. `/mcp` or `claude mcp login` runs the flow. A `401` on a signed-in server refreshes the token and retries once | `http`, `sse` | MCP docs, Authenticate with remote MCP servers |
| ✅ | `oauth.clientId` | Pre-configured client ID | For servers with no dynamic client registration. Claude Code also finds a Client ID Metadata Document (CIMD) on its own | Server entry | MCP docs, Use pre-configured OAuth credentials |
| ✅ | `oauth.callbackPort` | Fixed callback port | Redirect URI is `http://localhost:PORT/callback`. Integer, positive | Server entry | MCP docs, Use a fixed OAuth callback port |
| ✅ | `oauth.authServerMetadataUrl` | Skips the discovery chain | Must start with `https://`. Default order: RFC 9728 `/.well-known/oauth-protected-resource`, then RFC 8414 `/.well-known/oauth-authorization-server` | Server entry | MCP docs, Override OAuth metadata discovery |
| ✅ | `oauth.scopes` | Pins requested scopes | One space-separated string, at least one character. It beats metadata scopes. Claude Code adds `offline_access` if the server advertises it | Server entry | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| 🧪 | `oauth.xaa` | Enables XAA for the server | Boolean. Gate: `CLAUDE_CODE_ENABLE_XAA=1`. Otherwise Claude Code says `Remove 'oauth.xaa'` | Server entry | Bundle: `oauth` schema |
| ✅ | `--client-id`, `--client-secret`, `--callback-port` | Set the OAuth fields on add | See [Claude Code MCP CLI](Claude-Code-MCP-CLI). The secret is set only at add time | `claude mcp add` | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | `MCP_CLIENT_SECRET`, `MCP_OAUTH_CALLBACK_PORT` | Env forms of the secret and port | The secret skips the prompt. Login and `/mcp` never read it again | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Environment Variables](https://code.claude.com/docs/en/env-vars) |
| 🔍 | `MCP_OAUTH_CLIENT_METADATA_URL` | Overrides the CIMD URL | The bundle logs `Using CIMD URL from env` | Env | Bundle: OAuth client code |
| ✅ | Token storage | Keeps tokens | Tokens are stored securely and refreshed. The client secret is in the macOS keychain or a credentials file. `Clear authentication` in `/mcp` and `claude mcp logout` remove them | User | MCP docs, Tips |
| ✅ | v2 runtime checks | Hardens OAuth | Fails on an unexpected issuer. Sends credentials only to `https` or loopback token endpoints | v2 runtime | MCP docs, MCP client runtimes |
| ✅ | Local OAuth refusal | Hosted connectors | Microsoft 365, Gmail, and Google Calendar hosts need claude.ai. Claude Code shows `is Anthropic-hosted and doesn't support local OAuth` | `add`, `.mcp.json` | MCP docs, Use MCP servers from claude.ai |
| ✅ | No OAuth fallback | Respects your header | A configured `Authorization` header (static or helper) that the server rejects gives a failed connection, not an auth prompt | Remote servers | MCP docs, Authenticate with remote MCP servers |

## `headersHelper`

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | Command | Prints headers | Shell command. Output is a JSON object of strings. Times out after 10 s. Overrides static `headers`. Runs on each connect and again after a `401` or `403` | `http`, `sse`, `ws` | MCP docs, Use dynamic headers |
| ✅ | `CLAUDE_CODE_MCP_SERVER_NAME`, `CLAUDE_CODE_MCP_SERVER_URL` | Tell the helper which server | Set only for the helper. The URL hides a live credential value as `REDACTED` | Helper env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | `CLAUDE_PLUGIN_ROOT` | Plugin root | Set only for a plugin server | Helper env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | Working directory | Resolves relative paths | Plugin root, project dir, primary working directory, or `~/.claude` (user, managed, connector). Depends on where the server is configured | Helper | MCP docs, Where the helper runs |
| ✅ | Env scrub | Hides credential variables | Project `.mcp.json`, plugin, and project agent servers get no variables with `TOKEN`, `SECRET`, `PASSWORD`, `KEY`, `AUTH` in the name, plus a fixed list | Helper | MCP docs, Which variables a helper can read |
| ✅ | Trust rule | Runs the helper late | Project and local servers run it only after the trust dialog for the declaring folder. Until then only static `headers` are used | Helper | MCP docs, Trust a folder |
| ✅ | `${user_config.*}` | Plugin options | Not allowed. Claude Code reports the server as misconfigured (before `2.1.207` it substituted) | Plugin servers | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) |
| ✅ | `headersHelper` policy refusal | Refuses a plugin helper | An entry with `headersHelper` must inline its full manifest with `strict: false`. Otherwise Claude Code refuses to run it | Marketplace entries | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |

## XAA

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| 🧪 | XAA (SEP-990) | Signs in through an enterprise IdP | One IdP connection is shared by all XAA servers. Claude Code swaps a cached IdP `id_token` for a server token | Servers with `oauth.xaa` | Bundle: `XAA` strings |
| 🧪 | Gate | Turns XAA on | `CLAUDE_CODE_ENABLE_XAA=1` | Env | Bundle: gate function |
| 🧪 | Setup | Stores the IdP data | `claude mcp xaa setup`, setting `xaaIdp`, secret from `MCP_XAA_IDP_CLIENT_SECRET` in the keychain | Shell | Bundle: `xaa setup` |
| 🧪 | Login | Caches the IdP token | `claude mcp xaa login`. Without it Claude Code says `no IdP connection` | Shell | Bundle: `xaa login` |

## Claude.ai Connectors

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | Fetch | Loads connectors of your account | Only with a claude.ai subscription login. Not with an API key, `ANTHROPIC_AUTH_TOKEN`, `apiKeyHelper`, a cloud provider, a profile, or a `setup-token` token | Terminal, VS Code, JetBrains, SDK | MCP docs, Use MCP servers from claude.ai |
| ✅ | `ENABLE_CLAUDEAI_MCP_SERVERS` | Switch for the fetch | `false` stops it for the shell session | Env | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableClaudeAiConnectors` | Switch in settings | See [Claude Code MCP Settings](Claude-Code-MCP-Settings) | Settings | [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp), [Control MCP Server Access for Your Organization](https://code.claude.com/docs/en/managed-mcp) |
| ✅ | Per-tool controls | Org policy on connector tools | `ask` prompts on each call, `blocked` hides the tool. See `toolPermissions` in [Claude Code MCP Config](Claude-Code-MCP-Config) | Connectors | MCP docs, Organization controls |
| ✅ | Session token rejected | Separate state | `/login` then reconnect. Authorizing the connector again does not help | Connectors | MCP docs, Use MCP servers from claude.ai |
| ✅ | Cloud and desktop sessions | Other delivery paths | A cloud host or the desktop app passes connectors in. `disableClaudeAiConnectors` does not act on them | Cloud, desktop | MCP docs, How connectors reach Claude Code |

## See Also

- [Connect Claude Code to Tools via MCP](https://code.claude.com/docs/en/mcp) is the docs page.
- [Settings Auth](Claude-Code-Settings-Auth) covers the sign-in of Claude Code itself.
