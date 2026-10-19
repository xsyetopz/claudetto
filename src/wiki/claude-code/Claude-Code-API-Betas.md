# Claude Code API Betas

A beta is an early API feature that a request switches on with a value in the `anthropic-beta` header.
Claude Code keeps a list of these values and sends the ones that fit the model and the provider.
If a proxy rejects a request with a beta error, set `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1` to stop the pre-release values.

## About the List

Claude Code joins the active values into the `anthropic-beta` header (or into the `betas` field of the body on Bedrock).
A row has the mark ✅ when a docs page other than the changelog and the Agent SDK pages names the value.
Few values have that, so most rows have the mark 🔍.
Source: [Environment Variables](https://code.claude.com/docs/en/env-vars) for `ANTHROPIC_BETAS` and `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`, and the bundle for the rest.

## How Claude Code Builds the List

Claude Code takes these steps for each request:

1. It adds the betas that fit the model and the provider.
2. It adds the values of `ANTHROPIC_BETAS`, a comma list, unless the experimental betas are off.
   It drops a value that has `afk-mode`, and it skips `mid-conversation-system-2026-04-07`, because that feature is generally available.
3. It removes `context-1m-2025-08-07` when the model has the 1M window already.
4. For an agent query, it adds `claude-code-20250219` if the list lacks it.
5. It adds the betas that depend on the turn, and then the values of the flag `--betas`.
   On a third-party provider it keeps only the allowed values of `--betas`.

`CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` or a HIPAA policy turns the experimental betas off.
Then Claude Code ignores `ANTHROPIC_BETAS` and `--betas`, and it leaves out the betas that only the Anthropic API takes.

## Registry

The column `Registry name` is the internal name of the value in the bundle.

| Header value | Mark | Registry name | When Claude Code sends it |
| --- | --- | --- | --- |
| `claude-code-20250219` | 🔍 | `claude_code` | For every model whose name has no `haiku`, and for agent queries. |
| `oauth-2025-04-20` | 🔍 | `oauth_auth` | When you sign in with a subscription (OAuth). |
| `interleaved-thinking-2025-05-14` | ✅ | `interleaved_thinking` | For each model except `claude-3-*`, unless `DISABLE_INTERLEAVED_THINKING` is set. The docs name it as `interleaved-thinking`. |
| `context-1m-2025-08-07` | 🔍 | `long_context` | When the model name has the `[1m]` suffix, also for a model with a 1M window. Never without the suffix ([Probes](Claude-Code-Probes)). |
| `context-management-2025-06-27` | 🔍 | `context_management` | On the Anthropic API, on Anthropic-run clouds, and on Foundry, for each model except `claude-3-*`. |
| `structured-outputs-2025-12-15` | 🔍 | `structured_outputs` | On the Anthropic API for a model that supports it, behind an experiment. |
| `web-search-2025-03-05` | 🔍 | `web_search` | On Vertex for models with web search there, and on Foundry. |
| `advanced-tool-use-2025-11-20` | 🔍 | `tool_search` | With tool search, as a second header value. |
| `tool-search-tool-2025-10-19` | 🔍 | `tool_search` | With tool search, and on Bedrock it goes in the body instead. |
| `effort-2025-11-24` | 🔍 | `effort` | The bundle lists it, and no source states when it is sent. |
| `task-budgets-2026-03-13` | 🔍 | `task_budgets` | The bundle lists it, and no source states when it is sent. |
| `prompt-caching-scope-2026-01-05` | 🔍 | `prompt_caching_scope` | On the Anthropic API and Anthropic-run clouds, and when MCP tools are in the tool list. |
| `prompt-caching-evict-2026-05-12` | 🔍 | `prompt_caching_evict` | When a message has the `evict_on_complete` cache control. |
| `cache-keepalive-2026-09-03` | 🔍 | `cache_keepalive` | When the keep-alive switch is on. It needs a subscriber login ([Probes](Claude-Code-Probes)). |
| `extended-cache-ttl-2025-04-11` | ✅ | `extended_cache_ttl` | When the cache time is `1h` on the Anthropic API. The docs name it as `extended-cache-ttl`. |
| `fast-mode-2026-02-01` | 🔍 | `speed` | The bundle lists it, and no source states when it is sent. |
| `redact-thinking-2026-02-12` | 🔍 | `redact_thinking` | On the Anthropic API when interleaved thinking is on and the session is interactive. |
| `thinking-resumption-2026-07-17` | 🔍 | `thinking_resumption` | The bundle lists it, and no source states when it is sent. |
| `thinking-token-count-2026-05-13` | 🔍 | `thinking_token_count` | With interleaved thinking on the Anthropic API, and on Bedrock and Mantle for some models. |
| `afk-mode-2026-01-31` | 🔍 | `afk_mode` | For auto mode. |
| `advisor-tool-2026-03-01` | 🔍 | `advisor_tool` | The bundle lists it, and no source states when it is sent. |
| `cache-diagnosis-2026-04-07` | 🔍 | `cache_diagnosis` | The bundle lists it, and no source states when it is sent. |
| `context-hint-2026-04-09` | 🔍 | `context_hint` | The bundle lists it, and no source states when it is sent. |
| `mcp-servers-2025-12-04` | 🔍 | `mcp_servers` | The bundle lists it, and no source states when it is sent. |
| `files-api-2025-04-14` | 🔍 | `files_api` | The bundle lists it, and no source states when it is sent. |
| `environments-2025-11-01` | 🔍 | `environments` | The bundle lists it, and no source states when it is sent. |
| `ccr-byoc-2025-07-29` | ✅ | `ccr_byoc` | The bundle lists it, and no source states when it is sent. The docs name it in [Self-Hosted Environments Testing](https://code.claude.com/docs/en/self-hosted-environments-testing). |
| `per-turn-control-2026-07-01` | 🔍 | `per_message_effort` | For models that take the effort with each message. |
| `timing-2026-09-09` | 🔍 | `per_turn_timing` | When the time goes with each message. |
| `mid-conversation-tool-changes-2026-07-01` | 🔍 | `mid_conv_tool_change` | For models that allow tool changes in the middle of a conversation. |
| `inline-tools-2026-09-15` | 🔍 | `inline_tools` | With the previous value, when a second check passes. |
| `server-side-fallback-2026-06-01` | 🔍 | `server_side_fallback` | The bundle lists it, and no source states when it is sent. |
| `server-side-fallback-2026-07-01` | 🔍 | `server_side_fallback_category` | The bundle lists it, and no source states when it is sent. |
| `fallback-credit-2026-06-01` | 🔍 | `fallback_credit` | The bundle lists it, and no source states when it is sent. |
| `auto-mode-classifier-2026-07-16` | 🔍 | `auto_mode_classifier` | The bundle lists it, and no source states when it is sent. |
| `dangerous-tool-use-2026-09-03` | 🔍 | `dangerous_tool_use` | The bundle lists it, and no source states when it is sent. |
| `thinking-display-updates-2026-08-18` | 🔍 | `thinking_display_updates` | The bundle lists it, and no source states when it is sent. |
| `thinking-binding-controls-2026-08-01` | 🔍 | `thinking_binding_controls` | The bundle lists it, and no source states when it is sent. |
| `message-threads-2026-08-12` | 🔍 | `message_threads` | The bundle lists it, and no source states when it is sent. |
| `mid-conversation-system-clear-at-2026-08-21` | 🔍 | `mid_conversation_system_clear_at` | For the wire shape that keeps reminders. |

The registry also holds two internal switches, `x-cc-internal-mid-conv-cache-promotion` and `x-cc-internal-mid-conv-cache-promotion-ok`.
They are 🔍, and Claude Code does not send them as header values.

## Other Beta Values in the Bundle

These values belong to the embedded Anthropic SDK client or to the provider code.
Claude Code does not put them in the model request.
All of them are 🔍.

| Value | Where it is used |
| --- | --- |
| `managed-agents-2026-04-01` | The endpoints `/v1/agents`, `/v1/sessions`, and `/v1/environments`. |
| `dreaming-2026-04-21` | The endpoint `/v1/dreams`. |
| `user-profiles-2026-08-18` | The endpoint `/v1/user_profiles`. |
| `agent-memory-2026-07-22` | The endpoint `/v1/memory_stores`. |
| `message-batches-2024-09-24` | The batch endpoint. |
| `token-counting-2024-11-01` | The endpoint `/v1/messages/count_tokens`. |
| `mcp-tunnels-2026-06-22` | The endpoint `/v1/tunnels`. |
| `oidc-federation-2026-04-01` | The federation endpoints. |
| `ccr-triggers-2026-01-30` | The endpoint `/v1/code/triggers`. |
| `bedrock-2023-05-31` | The `anthropic_version` of the Bedrock body. |
| `vertex-2023-10-16` | The `anthropic_version` of the Vertex body. |

## Observed Request

A transcript of `2.1.303` records each request in an `api-request` line.
One such line, read on a local machine with the model `claude-opus-5-5`, held 20 betas.
The list ran from `claude-code-20250219` and `oauth-2025-04-20` to `message-threads-2026-08-12`.
This is one observation and not a rule.

## See Also

- [Models and API](Claude-Code-Models-And-API)
- [Request Build](Claude-Code-Request-Build)
- [Env Vars](Claude-Code-Env-Vars)
