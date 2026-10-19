# Claude Code Probes (Part 2)

These are the first rows of the table of variables with no visible effect on [Probes](Claude-Code-Probes).
Part 3 has the rest.
They run from `CLAUDE_INTERNAL_FC_OVERRIDES` to `CLAUDE_CODE_MOCK_TRIAL`, in 78 rows.

## No Visible Effect

| Name | What We Set | Mark | What We Saw |
| --- | --- | --- | --- |
| `CLAUDE_INTERNAL_FC_OVERRIDES` | JSON of a flag | ❌ | a flag override did not start a keepalive. See the cache keepalive notes. |
| `AGENT_PROXY_AUTH_TOKEN` | `1` | ❌ | No change in print mode. |
| `AGENT_PROXY_URL` | `1` | ❌ | No change in print mode. |
| `ALLOW_ANT_COMPUTER_USE_MCP` | `1` | ❌ | No change in print mode. |
| `ANT_CLAUDE_CODE_METRICS_ENDPOINT` | `1` | ❌ | No change in print mode. |
| `ANT_OTEL_EXPORTER_OTLP_ENDPOINT` | `1` | ❌ | No change in print mode. |
| `ANT_OTEL_EXPORTER_OTLP_HEADERS` | `1` | ❌ | No change in print mode. |
| `ANT_OTEL_EXPORTER_OTLP_PROTOCOL` | `1` | ❌ | No change in print mode. |
| `ANT_OTEL_LOGS_EXPORTER` | `1` | ❌ | No change in print mode. |
| `ANT_OTEL_METRICS_EXPORTER` | `1` | ❌ | No change in print mode. |
| `ANT_OTEL_RESOURCE_ATTRIBUTES` | `1` | ❌ | No change in print mode. |
| `ANT_OTEL_TRACES_EXPORTER` | `1` | ❌ | No change in print mode. |
| `AWS_CA_BUNDLE` | `1` | ❌ | No change in print mode. |
| `AWS_ENDPOINT_URL_SSO` | `1` | ❌ | No change in print mode. |
| `AWS_ENDPOINT_URL_SSO_OIDC` | `1` | ❌ | No change in print mode. |
| `BAT_THEME` | `1` | ❌ | No change in print mode. |
| `CLAUDE_AGENTS_SELECT` | `1` | ❌ | No change in print mode. |
| `CLAUDE_BG_AUTO_MEMORY_OFF` | `1` | ❌ | No change in print mode. |
| `CLAUDE_BRIDGE_REATTACH_GROUPING` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CHROME_CLASSIFIER_FLOOR` | `1` | ❌ | Needs the Chrome integration. Not reachable in print mode. |
| `CLAUDE_CHROME_PERMISSION_MODE` | `1` | ❌ | Needs the Chrome integration. Not reachable in print mode. |
| `CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK_FIXED` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ARTIFACT_FD` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ARTIFACT_HOT` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ARTIFACT_LIVE_BASE_URL` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ARTIFACT_MCP` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ARTIFACT_MULTI_FILE` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ARTIFACT_OPEN_ACTION` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ARTIFACT_QUICKSTART` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ARTIFACT_REPL` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ARTIFACT_ROOM` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ARTIFACT_START_KIT` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ARTIFACT_SYNC_BASE_URL` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ARTIFACT_VERSIONS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ARTIFACT_VIEWER_BASE_URL` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ATTRIBUTION_STATUS_TIMEOUT_MS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_AUTO_MODE_CLASSIFIER_OVERLAP` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_AUTO_MODE_EXTERNAL_PERMISSIONS` | `1` with `--permission-mode auto` and a `Bash` call | ❌ | Same 12 requests, same `xml_s1` and `xml_s2` classifier stages in the debug log. The name occurs only in lists of env names in the bundle. |
| `CLAUDE_CODE_AUTO_MODE_GIT_STATUS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_AUTO_MODE_GIT_STATUS_UPLOADS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_BENCH_LIVE_COUNTS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_BG_CLASSIFIER_MODEL` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_BYOC_ENABLE_DATADOG` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_CCR_EARLY_PLUGINS_SYNC` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_COLD_COMPACT` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_COORDINATOR_SKILL_GUIDANCE` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_COWORK_FRAME_ARTIFACTS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_DAPPER_CUPCAKE` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_DESKTOP_SKILLS_PLUGIN_DIR` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_DESKTOP_SKILL_SWITCHES` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_DISABLE_HOOK_FORWARDING` | `1` | ❌ | Bundle: tied to remote tools and shelved device hooks. Needs a remote session. |
| `CLAUDE_CODE_DISABLE_MCP_TASK_BACKGROUND` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_DISABLE_PRECOMPACT_SKIP` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_DISPATCH_V2D` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_DISPATCH_V2S` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ELEGANT_MEADOW` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_ENABLE_BACKGROUND_PLUGIN_REFRESH` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_FORCE_FIRST_LAUNCH` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_FORWARD_USER_INTENT` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_GORSE_PLOVER` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_HANDBACK_PROVENANCE` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_HFI_BEARER_TOKEN` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_HIDE_SETTINGS_HINT` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_HOSTED_DESKTOP` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_HOST_HTTP_PROXY_PORT` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_HOST_SOCKS_PROXY_PORT` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_INSTALLED_VIA_NPM_WRAPPER` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_INVOKED_SKILLS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_JUNIPER_SUNDIAL` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_KB_COHESION_FIXES` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_LAZY_ENV_GETTERS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_MAX_EFFORT_REMINDER` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_MEMORY_API_BASE_URL` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_MEMORY_SUBAGENT_APPEND` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_MOCK_REMOTE_SETTINGS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_MOCK_TRIAL` | `1` | ❌ | No change in print mode. |

## See Also

- [Probes](Claude-Code-Probes)
- [Probes (Part 3)](Claude-Code-Probes-3)
- [Environment Variables](Claude-Code-Env-Vars)
