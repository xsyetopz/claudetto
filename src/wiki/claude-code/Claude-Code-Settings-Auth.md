# Claude Code Settings: Auth

These keys tell Claude Code how to sign in and how to get credentials.
Most of them point to a script of your own that prints a token or a header.
For example, `{ "apiKeyHelper": "~/bin/get-key.sh" }` runs that script to get the API key.

The marks and the scopes are explained on [Settings](Claude-Code-Settings).
A `-` in the `Default` column means that neither the docs nor the schema state a default.

| Mark | Key | Type | Default | What It Is For | Scope | Source |
| --- | --- | --- | --- | --- | --- | --- |
| ✅ | `allowedProviders` | - | - | Limit which API providers a machine may use. Managed settings only. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `apiKeyHelper` | string | - | Generate the API credential with your own command. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `awsAuthRefresh` | string | - | Refresh expired Bedrock credentials in `.aws` with your own command. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `awsCredentialExport` | string | - | Supply Bedrock credentials as JSON from your own command. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `forceLoginGatewayUrl` | string | - | Set the gateway URL the login screen connects to. Pairs with `forceLoginMethod: "gateway"`. Claude Code ignores it in project, local, flag, and server-managed settings. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `forceLoginMethod` | enum: `claudeai`, `console`, `gateway` | - | Restrict login to claude.ai, Claude Console, or a cloud gateway. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `forceLoginOrgUUID` | array or string | - | Pin claude.ai logins to your organization. Takes one UUID or an array. In managed settings, login fails for any other account. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `gatewayInternalNetworks` | array of string | - | Let `/login` reach a cloud gateway on public IPv4 space your organization uses internally. Up to 4 IPv4 blocks, each `/8` to `/32`. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `gcpAuthRefresh` | string | - | Refresh Google Cloud credentials with your own command. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `otelHeadersHelper` | string | - | Generate rotating OpenTelemetry headers with your own command. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `proxyAuthHelper` | string | - | Run your own command that prints a `Proxy-Authorization` header value. Read from the highest-priority source only. | Settings files | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `xaaIdp` | object | - | Set the XAA (SEP-990) identity provider once, and every XAA-enabled MCP server reuses it. | Settings files | Bundle settings schema |

## See Also

- [Settings](Claude-Code-Settings) explains the marks, the scopes, and the precedence.
- [Settings Reference](https://code.claude.com/docs/en/settings-reference) is the docs page for each key.
- [Authentication](https://code.claude.com/docs/en/authentication) explains the login methods.
- [Env Vars](Claude-Code-Env-Vars) lists the auth variables.
