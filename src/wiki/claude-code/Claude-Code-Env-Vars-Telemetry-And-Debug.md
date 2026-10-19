# Claude Code Environment Variables: Telemetry and Debug

These 156 environment variables of Claude Code `2.1.303` cover usage data, OpenTelemetry, debug logs, and error reports.
Telemetry is data about how the program runs, sent to a service that you choose.
An environment variable is a named setting that you put in your shell or in the `env` key of `settings.json`.

The 156 variables are in 2 parts.
This page lists the 78 rows from `ANTHROPIC_LOG` to `OTEL_EXPORTER_OTLP_CERTIFICATE`.

## Example

Run `export DISABLE_TELEMETRY=1` before `claude` to stop the usage data.
Or put `{ "env": { "DISABLE_TELEMETRY": "1" } }` in `~/.claude/settings.json`.

## Variables

The marks are explained on the [index](Claude-Code-Env-Vars#marks).

| Name | Mark | What It Does | Value | Where It Works |
| --- | --- | --- | --- | --- |
| `ANTHROPIC_LOG` | 🔍 | The bundled SDK reads it as the SDK log level when the client options give none. | Text, level by default. The SDK checks it and falls back to its own default level | Bundled SDK client. Not set from project `env` before trust |
| `ANT_CLAUDE_CODE_METRICS_ENDPOINT` | 🔍 | The name appears in the schema and in one string table, and no read site was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text | Not set from project `env` before trust |
| `ANT_OTEL_EXPORTER_OTLP_ENDPOINT` | 🔍 | A pattern matches this name together with the `OTEL_EXPORTER_OTLP_*ENDPOINT` names, so it is handled as an OTLP endpoint var. Nothing reads it, and a [Probes](Claude-Code-Probes) run saw no effect. | Text | Not set from project `env` before trust |
| `ANT_OTEL_EXPORTER_OTLP_HEADERS` | 🔍 | The name appears in the schema and in one string table, and no read site was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text | Not set from project `env` before trust |
| `ANT_OTEL_EXPORTER_OTLP_PROTOCOL` | 🔍 | The name appears in the schema and in one string table, and no read site was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text | Not set from project `env` before trust |
| `ANT_OTEL_LOGS_EXPORTER` | 🔍 | It is in the schema and in a string list next to `OTEL_EXPORTER_OTLP_PROTOCOL`. Nothing reads it, and a [Probes](Claude-Code-Probes) run saw no effect. | Text | Not set from project `env` before trust |
| `ANT_OTEL_METRICS_EXPORTER` | 🔍 | The name appears in the schema and in one string table, and no read site was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text | Not set from project `env` before trust |
| `ANT_OTEL_RESOURCE_ATTRIBUTES` | 🔍 | The name appears in the schema and in one string table, and no read site was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text | Not set from project `env` before trust |
| `ANT_OTEL_TRACES_EXPORTER` | 🔍 | The name appears in the schema and in one string table, and no read site was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text | Not set from project `env` before trust |
| `BETA_TRACING_ENDPOINT` | ✅🧪 | Sends detailed beta traces and logs to this OTLP/HTTP endpoint. Claude Code adds `/v1/traces` and `/v1/logs`. | Text. Works only with `ENABLE_BETA_TRACING_DETAILED` set and when a second gate passes | All sessions. Docs say project and local settings ignore it |
| `CCR_RUNNER_STARTUP_TIMING` | 🔍🧪 | Passes runner startup timing fields to Claude Code. It merges them into the startup timing record. | Text. Set by the self-hosted runner for the child. Needs `CLAUDE_CODE_REMOTE` or `CLAUDE_CODE_EMIT_STARTUP_TIMING` | Cloud remote and self-hosted runner sessions |
| `CCR_SPAWN_TIMESTAMP_MS` | 🔍🧪 | Gives the spawn time in ms. Claude Code uses it to measure time from spawn to exec, first message read, and input ready. | A number of milliseconds. Integer parsed with `parseInt`, else ignored. Set by the self-hosted runner | Cloud remote and self-hosted runner sessions |
| `CLAUDE_CODE_ACCOUNT_TAGGED_ID` | 🔍 | Overrides the `user.account_id` metric attribute. | Text. Used only when `OTEL_METRICS_INCLUDE_ACCOUNT_UUID` is on and an account UUID exists. Else Claude Code derives a tagged id | OTEL metrics. Not set from project `env` before trust |
| `CLAUDE_CODE_ACTION` | 🔍 | Marks a run as launched by the Claude Code GitHub Action. Claude Code reports the flag in environment metadata. | On or off | GitHub Action runs. Not set from project `env` before trust |
| `CLAUDE_CODE_BENCH_LIVE_COUNTS` | 🔍 | Turns on live counts in the terminal renderer. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off. Sets `liveCountsEnabled` on the renderer | Interactive UI |
| `CLAUDE_CODE_BYOC_ENABLE_DATADOG` | ✅ | Opts a BYOC environment in to a Datadog-related path. The BYOC runner passes it to the session. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off. A helper returns true when `CLAUDE_CODE_ENVIRONMENT_KIND` is `byoc` and this is unset | BYOC remote sessions |
| `CLAUDE_CODE_CLASSIFIER_SUMMARY` | 🔍🧪 | Picks `llm` or `heuristic` summaries for the session classifier. | On or off. Else a feature flag decides. A feature flag can force `heuristic` | All sessions, gated by a feature flag |
| `CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS` | 🔍 | Sets how often the Datadog log sender flushes its batch. | A number of milliseconds. Falls back to a built-in default | Datadog event logging |
| `CLAUDE_CODE_DD_ERROR_TRACKING_FLUSH_INTERVAL_MS` | 🔍 | Sets how often the error tracking client sends its batch to the Datadog browser intake. | A number of milliseconds, `30000` by default | Error reporting |
| `CLAUDE_CODE_DEBUG_LOGS_DIR` | ✅ | Sets the path of the debug log file. Despite the name it is a file path. One code branch adds `<session-id>.txt` to a learned directory. | Text. Default `~/.claude/debug/<session-id>.txt`. Debug mode must be on | All sessions |
| `CLAUDE_CODE_DEBUG_LOG_LEVEL` | ✅ | Sets the minimum level written to the debug log. | Text, `debug` by default. Valid levels only, default `debug` | All sessions |
| `CLAUDE_CODE_DIAGNOSTICS_FILE` | 🔍 | Sets a file that receives diagnostics events as JSON lines with a timestamp, level, event and data. Also enables extra diagnostics code. | Text. Other code tests only if it is set | All sessions, also forwarded to child processes |
| `CLAUDE_CODE_DISABLE_VITALS_EMITTER` | 🔍 | Kill switch for the guest vitals emitter helper. It is also off in essential-traffic-only mode. | On or off, off by default. The log says guest vitals are disabled | Guest and container sessions |
| `CLAUDE_CODE_EMIT_STARTUP_TIMING` | 🔍 | Turns on collection and reporting of startup timing phases, as `CLAUDE_CODE_REMOTE` does. | On or off, off by default. Reported fields include the `entrypoint` value | All sessions |
| `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL` | ✅ | Routes the session quality survey to your own OTEL collector when Anthropic-bound traffic is blocked. | On or off, off by default. When on, the survey gate no longer follows the nonessential-traffic check | All sessions. Project `env` can set it before trust |
| `CLAUDE_CODE_ENABLE_SHARE_BUNDLE` | 🔍 | Makes `/share` send the whole transcript as a feedback bundle. | On or off, off by default. Used in the `/share` command path | First-party sessions |
| `CLAUDE_CODE_ENABLE_TELEMETRY` | ✅⚠️ | Turns on OTEL metrics and logs. Docs say project and local settings ignore it. | On or off. Needs an OTEL exporter that is not `none` | All sessions. Project `env` can set it before trust |
| `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA` | ✅ | Turns on the enhanced tracing beta, with `OTEL_TRACES_EXPORTER=otlp`. `ENABLE_ENHANCED_TELEMETRY_BETA` is the fallback name. | On or off. On-style value gives on, off-style gives off, else off | All sessions |
| `CLAUDE_CODE_FRAME_TIMING_LOG` | 🔍 | Appends a JSON line with render phase timing per frame to this file. | Text, off by default | Interactive terminal UI |
| `CLAUDE_CODE_FRAME_TIMING_SAMPLE_EVERY` | 🔍 | Logs memory stats for every Nth frame in the frame timing log. | A number. Whole number, minimum `1` after fallback. Used only with `CLAUDE_CODE_FRAME_TIMING_LOG` | Interactive terminal UI |
| `CLAUDE_CODE_GB_DISK_CACHE_WHEN_TELEMETRY_OFF` | 🔍 | Keeps the GrowthBook disk cache on when telemetry is off. | On or off, off by default. Needs `DISABLE_GROWTHBOOK` unset | First-party sessions |
| `CLAUDE_CODE_HOST_PLATFORM` | 🔍 | Reports the host platform in the environment record. A host app can set it when the host OS differs from the build. | Text. Also exposed as `hostPlatform` in a policy facts object | All sessions |
| `CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH` | ✅ | Caps the length of content-bearing OpenTelemetry attributes. Truncated text gets a `[TRUNCATED - Content exceeds ...]` marker. | A number, `61440` by default. Whole number of 1 or more in plain digits. The code takes the smallest of it and the three `OTEL_*_ATTRIBUTE_VALUE_LENGTH_LIMIT` vars | All sessions, when OTEL content logging is on |
| `CLAUDE_CODE_OTEL_DIAG_STDERR` | ✅ | Writes OpenTelemetry exporter diagnostic errors to stderr. Without it they go only to the debug log. | On or off. Claude Code removes it from the env of shell tool subprocesses | All sessions |
| `CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS` | ✅ | Sets how long Claude Code waits to flush pending OpenTelemetry data. | A number of milliseconds, `5000` by default. Whole number in ms. The trace flush gets half of the value | All sessions, when OTEL is on |
| `CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS` | ✅ | Sets how long the output of the OTEL headers helper stays cached before a refresh. | A number of milliseconds. Whole number in ms. Docs default is `1740000` | All sessions, when an OTEL headers helper is set |
| `CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS` | ✅ | Sets how long the OpenTelemetry exporters get to finish at exit. | A number of milliseconds, `2000` by default. Whole number in ms. The exporter timeout caps it at an internal maximum and subtracts 250 ms | All sessions, when OTEL is on |
| `CLAUDE_CODE_PERFETTO_TRACE` | 🔍 | The only read site logs `[Perfetto] initializePerfettoTracing called, env value:`. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text. The code that turns it on is not shown | All sessions |
| `CLAUDE_CODE_PERFETTO_WRITE_INTERVAL_S` | 🔍❌ | In the schema, but nothing reads it. | A number | All sessions |
| `CLAUDE_CODE_PROFILE_QUERY` | 🔍 | Turns on query profiling. The report shows TTFT, pre-request overhead, and network latency. | Set to `1`. Without it a message says `Query profiling not enabled` | All sessions |
| `CLAUDE_CODE_PROFILE_STARTUP` | 🔍 | Turns on startup profiling marks. Without it a random sample of runs (5 percent in one profiler and 0.5 percent in another) is profiled. | On or off. Memory snapshots are part of the report | All sessions |
| `CLAUDE_CODE_PROPAGATE_TRACEPARENT` | ✅ | Sends the W3C `traceparent` header on custom proxy URLs. | On or off. The check is true for direct Anthropic API use or when this var is set | All sessions |
| `CLAUDE_CODE_SESSION_LOG` | 🔍 | Gives the log path that is written into the concurrent-session pid file record. | Text. Only stored as `logPath` in the record | Concurrent-session registry |
| `CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS` | 🔍 | Sets the ms threshold for slow-operation timing around calls such as `JSON.stringify`. | A number of milliseconds. The default is no limit (`Infinity`) | All sessions |
| `CLAUDE_CODE_SPAWN_TIMESTAMP_MS` | 🔍 | Gives the time the process was spawned, in ms. The headless profiler uses it as the start for startup timing. | A number of milliseconds. Integer. `CCR_SPAWN_TIMESTAMP_MS` is checked first | Headless and print mode |
| `CLAUDE_CODE_TAGS` | 🔍 | Adds a tags string to the environment info that Claude Code sends with its telemetry. | Text | All sessions |
| `CLAUDE_CODE_TERMINAL_RECORDING` | 🔍 | The name appears only in the typed env schema list next to debug and OTEL names. Nothing reads it, and a [Probes](Claude-Code-Probes) run saw no effect. | Text | All sessions |
| `CLAUDE_CODE_TRIGGER_ID` | 🔍 | Passes a trigger ID into an internal flag event as `trigger_id`. | Text. No other effect seen | All sessions |
| `CLAUDE_CODE_WORKSPACE_HOST_PATHS` | 🔍 | Adds host paths to each event as `workspace.host_paths`. | Text. Split on the pipe character into a list | Hosted workspaces |
| `CLAUDE_DEBUG` | 🔍 | Logs Node process warnings to the debug log. | On or off | All sessions |
| `CLAUDE_PTY_RECORD` | 🔍 | Names a file where the PTY host records the terminal output of its child. | - | - |
| `DEBUG` | ✅ | Turns on debug mode when truthy. | - | - |
| `DEBUG_CLAUDE_AGENT_SDK` | 🔍 | In the SDK, forwards the CLI stderr to the caller and sets `DEBUG` to `1` for the child. | - | - |
| `DEBUG_SDK` | 🔍 | Turns on debug mode at launch. | - | - |
| `DISABLE_ERROR_REPORTING` | ✅ | Opts out of error reporting. | On or off | - |
| `DISABLE_TELEMETRY` | ✅ | Opts out of telemetry. The bundle also treats it as "no-telemetry" mode for other non-essential traffic checks. | Text. Any non-empty string counts, so `0` and `false` still opt out. Passed on to remote child sessions | All sessions. Not set from project `env` before trust |
| `DO_NOT_TRACK` | ✅ | Opts out of telemetry like `DISABLE_TELEMETRY` does. | On or off. Parsed as a standard boolean, so `0` or `false` leaves telemetry on | All sessions. Not set from project `env` before trust |
| `ENABLE_BETA_TRACING_DETAILED` | ✅🧪 | Turns on detailed beta tracing. It needs `BETA_TRACING_ENDPOINT` as well. | On or off. Also needs a non-empty `BETA_TRACING_ENDPOINT`. Gated by an org check or a feature flag | Tracing. Not set from project `env` before trust |
| `ENABLE_ENHANCED_TELEMETRY_BETA` | ✅ | Turns on enhanced telemetry tracing. It is the fallback name of `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA`. | On or off. Truthy values enable it. The `CLAUDE_CODE_` name is read first with `??` | Tracing. Not set from project `env` before trust |
| `GITHUB_ACTION_INPUTS` | 🔍 | Passes the action inputs to a startup telemetry field named `githubActionInputs`. | Text | GitHub Actions. Not set from project `env` before trust |
| `GITHUB_ACTOR_ID` | 🔍 | Sends the actor id as telemetry metadata when `GITHUB_ACTIONS` is on. | Text | GitHub Actions. Not set from project `env` before trust |
| `GITHUB_EVENT_NAME` | 🔍 | Sends the event name as telemetry metadata when `GITHUB_ACTIONS` is on. | Text | GitHub Actions. Not set from project `env` before trust |
| `GITHUB_REPOSITORY` | 🔍 | Sends the repository name as telemetry metadata when `GITHUB_ACTIONS` is on. | Text | GitHub Actions. Not set from project `env` before trust |
| `GITHUB_REPOSITORY_ID` | 🔍 | Sends the repository id as telemetry metadata when `GITHUB_ACTIONS` is on. | Text | GitHub Actions. Not set from project `env` before trust |
| `GITHUB_REPOSITORY_OWNER` | 🔍 | Sends the repository owner as telemetry metadata when `GITHUB_ACTIONS` is on. | Text | GitHub Actions. Not set from project `env` before trust |
| `GITHUB_REPOSITORY_OWNER_ID` | 🔍 | Sends the repository owner id as telemetry metadata when `GITHUB_ACTIONS` is on. | Text | GitHub Actions. Not set from project `env` before trust |
| `GOOGLE_SDK_NODE_LOGGING` | 🔍 | Turns on debug logging in the bundled Google libraries when it is set. | On or off | Google auth library |
| `OTEL_ATTRIBUTE_COUNT_LIMIT` | 🔍 | OTel SDK limit for the attribute count per log record and span. | A number | - |
| `OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT` | ✅ | Sets the OTel limit for attribute value length. Claude Code caps content attributes at the smaller limit. | A number | - |
| `OTEL_BLRP_EXPORT_TIMEOUT` | 🔍 | OTel log record batch processor: export timeout in ms. | - | - |
| `OTEL_BLRP_MAX_EXPORT_BATCH_SIZE` | 🔍 | OTel log record batch processor: max records per export. | A number | - |
| `OTEL_BLRP_MAX_QUEUE_SIZE` | 🔍 | OTel log record batch processor: queue size. | A number | - |
| `OTEL_BLRP_SCHEDULE_DELAY` | 🔍 | OTel log record batch processor: delay between exports in ms. | - | - |
| `OTEL_BSP_EXPORT_TIMEOUT` | 🔍 | OTel span batch processor: export timeout in ms. | - | - |
| `OTEL_BSP_MAX_EXPORT_BATCH_SIZE` | 🔍 | OTel span batch processor: max spans per export. | A number | - |
| `OTEL_BSP_MAX_QUEUE_SIZE` | 🔍 | OTel span batch processor: queue size. | A number | - |
| `OTEL_BSP_SCHEDULE_DELAY` | 🔍 | OTel span batch processor: delay between exports in ms. | - | - |
| `OTEL_EXPORTER_OTLP_CERTIFICATE` | ✅ | Gives the root CA file for the OTLP exporter. Signal-specific vars win. | - | - |

## See Also

- [Part 2](Claude-Code-Env-Vars-Telemetry-And-Debug-2)
- [Environment Variables](Claude-Code-Env-Vars)
- [Probes](Claude-Code-Probes)
- [Settings](Claude-Code-Settings)
