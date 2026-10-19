# Claude Code Probes

A probe is a small test that runs Claude Code `2.1.303` and checks what one setting changes.
The probes in this wiki ran against a local stub of the Messages API, so they cost nothing and sent no data to Anthropic.
They show which environment variables and settings have an effect that you can see.

## How We Probed

1. We ran the unmodified `2.1.303` program with `claude -p "hi" --output-format stream-json --verbose`.
2. We gave each run a fresh config folder, a fresh home folder, a fake API key, and a base URL that points to the local stub.
3. We turned off telemetry and other optional traffic, and we pointed the proxy settings to a closed port, so a stray request to `api.anthropic.com` fails.
4. The stub answered `POST /v1/messages` as a stream or as JSON.
   It sent one scripted tool call and then plain text.
   It wrote the method, path, headers, and body of each request to a log.
5. We made two baselines.
   The first was a plain run.
   The second ran a `Bash` tool call with command hooks on five events and a local plugin with a skill, a hook, and an MCP server.
   Two repeat runs of each baseline were identical after we removed ids, paths, and times.
6. We set each of 166 variables to `1` in both baselines, which gave 332 runs.
   We compared headers, betas, the system prompt, tools, body fields, output events, files in the config folder, the hook log, and the environment names that hooks saw.
7. Some names got extra runs: auto mode with a `Bash` call, `--brief`, `--resume`, and the plugin variables with a plugin.

Every request carried the fake key, and the only path called was `/v1/messages?beta=true`.

## Results

| Mark | Meaning |
| --- | --- |
| ✅ | An effect was seen |
| ❌ | No visible effect |
| ⚠️ | The result differs from the docs |

Of the 166 variables, 11 had an effect and 155 had none that we could see.
No visible effect in print mode does not prove that a variable does nothing.
Many variables work only in other modes, in remote sessions, or with a login.

### Effects and Differences

| Name | What We Set | Mark | What We Saw |
| --- | --- | --- | --- |
| `--model X[1m]` | model flag | ✅ | `context-1m-2025-08-07` is added for `sonnet[1m]`, `opus[1m]`, and every `claude-*[1m]` tried, also for models with a native 1M window. Without `[1m]` it is never sent. |
| hook `type: "script"` | settings | ⚠️ | Rejected at load: `Unknown hook type "script"; entry ignored`. No script ran. A `PreToolUse` entry also disables the whole settings file it sits in. |
| `CLAUDE_CODE_AMBER_ASTROLABE` | `1` | ✅ | Adds an "operating autonomously" block to the system prompt (do not ask "Shall I...?", finish the work before ending the turn). |
| `CLAUDE_CODE_BASALT_COVE` | `1` | ✅ | Adds a "Communicating with the user" section and a code-comment rule to the system prompt. |
| `CLAUDE_CODE_HUMBLE_HAMMOCK` | `1` | ✅ | Adds `wire_tool_inputs` (raw `tool_use.input`) to the assistant event when a tool runs. |
| `CLAUDE_CODE_INLINE_TOOLS` | `1` | ✅ | Adds the beta `inline-tools-2026-09-15` to `anthropic-beta`. |
| `CLAUDE_CODE_LANTERN_PRISM` | `1` | ✅ | Adds the `skill-doctor` skill to the `init` event. |
| `CLAUDE_CODE_LARCH_CISTERN` | `1` | ✅ | Adds a "Corrections" section to the system prompt (avoid excessive self-correction). |
| `CLAUDE_CODE_PLUGIN_DIRS` | `1` | ✅ | Loads the plugin dir like `--plugin-dir` (same `plugins` list in `init`). |
| `CLAUDE_CODE_SIMULATE_PROXY_USAGE` | `1` | ✅ | Removes the whole `anthropic-beta` header and the `thinking.display` field. |
| `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS` | `1` | ✅ | Plugin MCP servers are not started: `mcp_servers` is empty and the tool list shrinks. |
| `CLAUDE_CODE_SYNC_PLUGIN_INSTALL` | `1` | ✅ | Emits `plugin_install` events (`started`, `completed`) in stream-json. |
| `CLAUDE_CODE_USE_COWORK_PLUGINS` | `1` | ✅ | User settings come from `cowork_settings.json` and plugins from `cowork_plugins`, so the hooks in `settings.json` did not run. |

### No Visible Effect

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
| `CLAUDE_CODE_NANKEEN_KESTREL` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_OAUTH_401_WAIT_MS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PARKED_PERMISSION_WAIT_MS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PARKED_RUN_BEFORE_CLEAR` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PARKED_STOP_RETIRES` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PARSED_WILLOW` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PERFETTO_TRACE` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PER_TURN_TIMING` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PLUGIN_ATTRIBUTION` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PLUGIN_BINARY_ASSETS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PLUGIN_CACHE_DIR` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PLUGIN_DIR_WATCH` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PLUGIN_PREFER_HTTPS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PLUGIN_SEED_DIR` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PLUGIN_USE_ZIP_CACHE` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_POLISHED_DEWDROP` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_POLL_EVENT_DECLARATIONS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PROACTIVE` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_PROJECTS_SESSION` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_REMOTE_HERMETIC_MODE` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_REMOTE_TOOLS_ADOPT_MCP` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_REMOTE_TOOLS_ASK_SEATS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_REMOTE_TOOLS_CALLER_SESSIONS_MAX` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_REMOTE_TOOLS_JUMP_QUEUE` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_REPORT_FINDINGS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS` | `5000` with `--resume` | ❌ | Same `SessionStart` hooks and same requests. |
| `CLAUDE_CODE_SKIP_HFI_VERSION_CHECK` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS_EXCEPT` | `probemcp` and `probeplug` with the SKIP var | ❌ | The plugin MCP server stayed skipped or stayed listed as `pending` for both values. The value format is not known. |
| `CLAUDE_CODE_SKIP_PROJECT_BACKFILL` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_SKIP_REPO_UPLOAD` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_SLACK_TAG_TOKEN` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_SLEEPY_SNOWFLAKE` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_SPAWNED_BY_SERVER` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_SUBAGENT_CACHE_EVICT` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_SYNC_PLUGINS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_SYNC_PLUGINS_BUFFERED_DOWNLOAD` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_SYNC_PLUGINS_DOWNLOAD_STALL_MS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_SYNC_PLUGINS_INSTALL_TIMEOUT_MS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_SYNC_PLUGINS_MCP_TIMEOUT_MS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_SYNC_PLUGIN_INSTALL_TIMEOUT_MS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_TAG_ISMETA_MESSAGES` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_TEAMMATE_COMMAND` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_TERMINAL_MCP_TOOLS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_TERMINAL_RECORDING` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_TEST_FORCE_DENY` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_TEST_NO_GIT_BASH` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_TEST_NO_PWSH` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_THRIFTY_SONIC` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_TICKLISH_WHISPER` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_TICKLISH_WHISPER_TIMEOUT_MS` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_TOOL_USE_ID` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_TWO_STAGE_CLASSIFIER` | `1` with `--permission-mode auto` and a `Bash` call | ❌ | Same 12 requests, same `xml_s1` and `xml_s2` classifier stages in the debug log. The name occurs only in lists of env names in the bundle. |
| `CLAUDE_CODE_VOICE_FORWARD_INTERIMS_TYPED` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_WHIMSICAL_ELEPHANT` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_WISE_COMET` | `1` | ❌ | No change in print mode. |
| `CLAUDE_CODE_WORKFLOW_LAUNCH_SHA256` | `1` | ❌ | No change in print mode. |
| `CLAUDE_PLUGIN_DATA` | `1` | ❌ | No change in print mode. |
| `CLAUDE_PLUGIN_ROOT` | `1` | ❌ | No change in print mode. |
| `CLAUDE_RUNNER_FAIL_FAST_FETCH` | `1` | ❌ | No change in print mode. |
| `CLAUDE_RUNNER_STALL_GIVEUP` | `1` | ❌ | No change in print mode. |
| `CLAUDE_SCRIPT_HOOK_ACK` | `1` | ❌ | No change in print mode. |
| `CLAUDE_SSH_DAEMON_CHILD` | `1` | ❌ | No change in print mode. |
| `CLAUDE_SSH_RUN_DIR` | `1` | ❌ | No change in print mode. |
| `DISABLE_BRIEF_MODE_STOP_HOOK` | `1` with `--brief` | ❌ | Bundle: read as a guard on a brief-mode `Stop` check. The check did not fire in print mode. |
| `ENVIRONMENT_SERVICE_KEY` | `1` | ❌ | No change in print mode. |
| `FORCE_AUTOUPDATE_PLUGINS` | `1` | ❌ | No change in print mode. |
| `GOOGLE_GHA_CREDS_PATH` | `1` | ❌ | No change in print mode. |
| `GOOGLE_OAUTH_ACCESS_TOKEN` | `1` | ❌ | No change in print mode. |
| `HEX_CACERTS_PATH` | `1` | ❌ | No change in print mode. |
| `HTTPLIB2_CA_CERTS` | `1` | ❌ | No change in print mode. |
| `JAVA_HOME` | `1` | ❌ | No change in print mode. |
| `NODE_AUTH_TOKEN` | `1` | ❌ | No change in print mode. |
| `SYSTEM_REMINDER_MEMORY_CONTEXT` | `1` | ❌ | No change in print mode. |
| `ULTRAPLAN_PROMPT_FILE` | `1` | ❌ | No change in print mode. |
| `VCR_RECORD` | `1` | ❌ | No change in print mode. |
| `VOICE_STREAM_BASE_URL` | `1` | ❌ | No change in print mode. |

## Request Details

- `cc_version=2.1.303.914`: the suffix `914` stayed the same in all runs.
- `/v1/messages/cache_touch`: never called.
  The bundle sends it only when the response has `anthropic-cache-keepalive: active` for a request with the `cache-keepalive-2026-09-03` beta.
  That beta needs a 1-hour cache TTL for a subscriber login, `allow_cache_keepalive`, and a server-side flag.
  The body is `{"request_id": ...}`.
  Touches repeat every 30 s by default (10 to 120).
  The stub with the response header and a flag override did not start it, because we have no subscriber login.
- `context-1m-2025-08-07`: added by a `[1m]` suffix, also on models with a native 1M window.
  Not sent without the suffix.
  The default model in this setup was `claude-opus-5-5` and it did not send the beta.
- Base betas in the plain run: `claude-code-20250219`, `interleaved-thinking-2025-05-14`, `thinking-token-count-2026-05-13`, `context-management-2025-06-27`, `prompt-caching-scope-2026-01-05`, `per-turn-control-2026-07-01`, `mid-conversation-tool-changes-2026-07-01`, `effort-2025-11-24`, `thinking-display-updates-2026-08-18`.
  First party adds `advanced-tool-use-2025-11-20`, `thinking-binding-controls-2026-08-01`, and `cache-diagnosis-2026-04-07`.

## Auto Mode

With `--permission-mode auto` and a `Bash` call the stub got classifier requests with `xml_s1` and `xml_s2` stages.
The debug log says `server_no_result` and falls back to billed local classifier requests.
Neither classifier var changed that.

## What We Did Not Probe

- Chrome vars need the extension.
- Remote, CCR, and cloud vars need a remote session.
- Subscriber-only paths (`cache_touch`) need a login.

## See Also

- [Environment Variables](Claude-Code-Env-Vars)
- [Hooks](Claude-Code-Hooks)
- [API Betas](Claude-Code-API-Betas)
- [API Endpoints](Claude-Code-API-Endpoints)
- [Request Build](Claude-Code-Request-Build)
