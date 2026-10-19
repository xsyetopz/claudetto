# Claude Code Environment Variables: Telemetry and Debug (Part 2)

These are more of the variables on [the first part](Claude-Code-Env-Vars-Telemetry-And-Debug).
They run from `OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE` to `TRACESTATE`, in 78 rows.

## Variables

The marks are explained on the [index](Claude-Code-Env-Vars#marks).

| Name | Mark | What It Does | Value | Where It Works |
| --- | --- | --- | --- | --- |
| `OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE` | ✅ | Gives the client certificate file for OTLP mutual TLS. | - | - |
| `OTEL_EXPORTER_OTLP_CLIENT_KEY` | ✅ | Gives the client private key file for OTLP mutual TLS. | Text (a secret) | - |
| `OTEL_EXPORTER_OTLP_COMPRESSION` | 🔍 | Sets OTLP compression. Signal-specific vars win. | - | - |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | ✅ | Sets the OTLP collector endpoint for metrics, logs, and traces. | A URL | - |
| `OTEL_EXPORTER_OTLP_HEADERS` | ✅ | Sets extra OTLP request headers as `key=value` pairs. | - | - |
| `OTEL_EXPORTER_OTLP_INSECURE` | 🔍 | Makes the gRPC OTLP exporter use an insecure channel when the value is `true`. | - | - |
| `OTEL_EXPORTER_OTLP_LOGS_CERTIFICATE` | 🔍 | Gives the root CA file for the OTLP logs exporter. | - | - |
| `OTEL_EXPORTER_OTLP_LOGS_CLIENT_CERTIFICATE` | 🔍 | Gives the client certificate file for the OTLP logs exporter. | - | - |
| `OTEL_EXPORTER_OTLP_LOGS_CLIENT_KEY` | 🔍 | Gives the client key file for the OTLP logs exporter. | Text (a secret) | - |
| `OTEL_EXPORTER_OTLP_LOGS_COMPRESSION` | 🔍 | Sets OTLP compression for logs only. | - | - |
| `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | ✅ | Sets the OTLP endpoint for logs only. | A URL | - |
| `OTEL_EXPORTER_OTLP_LOGS_HEADERS` | ✅ | Sets OTLP headers for logs only. | - | - |
| `OTEL_EXPORTER_OTLP_LOGS_INSECURE` | 🔍 | Makes the gRPC OTLP logs exporter use an insecure channel when `true`. | - | - |
| `OTEL_EXPORTER_OTLP_LOGS_PROTOCOL` | ✅ | Chooses the OTLP protocol for logs. Falls back to `OTEL_EXPORTER_OTLP_PROTOCOL`. | - | - |
| `OTEL_EXPORTER_OTLP_METRICS_CERTIFICATE` | 🔍 | Gives the root CA file for the OTLP metrics exporter. | - | - |
| `OTEL_EXPORTER_OTLP_METRICS_CLIENT_CERTIFICATE` | 🔍 | Gives the client certificate file for the OTLP metrics exporter. | - | - |
| `OTEL_EXPORTER_OTLP_METRICS_CLIENT_KEY` | ✅ | Gives the client key file for the OTLP metrics exporter. | Text (a secret) | - |
| `OTEL_EXPORTER_OTLP_METRICS_COMPRESSION` | 🔍 | Sets OTLP compression for metrics only. | - | - |
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | ✅ | Sets the OTLP endpoint for metrics only. | A URL | - |
| `OTEL_EXPORTER_OTLP_METRICS_HEADERS` | ✅ | Sets extra HTTP headers on the OTLP metrics export. | Text. Overrides `OTEL_EXPORTER_OTLP_HEADERS` | Metrics exporter with `http/json`, `http/protobuf` or `grpc`. Ignored in project and local `env` |
| `OTEL_EXPORTER_OTLP_METRICS_INSECURE` | 🔍 | Allows an insecure (non-TLS) connection for the OTLP metrics exporter. | Text | Metrics exporter. Ignored in project and local `env` |
| `OTEL_EXPORTER_OTLP_METRICS_PROTOCOL` | ✅ | Picks the OTLP wire protocol for metrics. Falls back to `OTEL_EXPORTER_OTLP_PROTOCOL`. | Text. Another value throws an `Unknown protocol` error | Metrics exporter when `OTEL_METRICS_EXPORTER` has `otlp`. Ignored in project and local `env` |
| `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE` | ✅ | Chooses delta or cumulative temporality for exported OTLP metrics. | Text. When unset, Claude Code sets it to `delta` at telemetry start (set by Claude Code) | Metrics exporter. Project `env` can set it before trust |
| `OTEL_EXPORTER_OTLP_PROFILES_CERTIFICATE` | 🔍❌ | Names an OTLP profiles setting. Claude Code has no profiles exporter. | Nothing reads it in 2.1.303 (the SDK reads only traces, metrics and logs names) | Nowhere. Listed so project and local `env` settings cannot set it |
| `OTEL_EXPORTER_OTLP_PROFILES_CLIENT_CERTIFICATE` | 🔍❌ | Names an OTLP profiles setting. Claude Code has no profiles exporter. | Nothing reads it in 2.1.303 (the SDK reads only traces, metrics and logs names) | Nowhere. Listed so project and local `env` settings cannot set it |
| `OTEL_EXPORTER_OTLP_PROFILES_CLIENT_KEY` | 🔍❌ | Names an OTLP profiles setting. Claude Code has no profiles exporter. | Text (a secret). Nothing reads it in 2.1.303 (the SDK reads only traces, metrics and logs names) | Nowhere. Listed so project and local `env` settings cannot set it |
| `OTEL_EXPORTER_OTLP_PROFILES_ENDPOINT` | 🔍❌ | Names an OTLP profiles setting. Claude Code has no profiles exporter. | A URL. Nothing reads it in 2.1.303 (the SDK reads only traces, metrics and logs names) | Nowhere. Listed so project and local `env` settings cannot set it |
| `OTEL_EXPORTER_OTLP_PROFILES_HEADERS` | 🔍❌ | Names an OTLP profiles setting. Claude Code has no profiles exporter. | Nothing reads it in 2.1.303 (the SDK reads only traces, metrics and logs names) | Nowhere. Listed so project and local `env` settings cannot set it |
| `OTEL_EXPORTER_OTLP_PROFILES_INSECURE` | 🔍❌ | Names an OTLP profiles setting. Claude Code has no profiles exporter. | Nothing reads it in 2.1.303 (the SDK reads only traces, metrics and logs names) | Nowhere. Listed so project and local `env` settings cannot set it |
| `OTEL_EXPORTER_OTLP_PROFILES_PROTOCOL` | 🔍❌ | Names an OTLP profiles setting. Claude Code has no profiles exporter. | Nothing reads it in 2.1.303 (the SDK reads only traces, metrics and logs names) | Nowhere. Listed so project and local `env` settings cannot set it |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | ✅ | Sets the default OTLP wire protocol for metrics, logs and traces. | Text. A per-signal `..._PROTOCOL` wins | Telemetry exporters with `otlp`. Ignored in project and local `env` |
| `OTEL_EXPORTER_OTLP_TIMEOUT` | 🔍 | Sets the OTLP export timeout in ms for every signal. | A number. A per-signal `OTEL_EXPORTER_OTLP_<SIGNAL>_TIMEOUT` wins. A bad value logs a warning | OTLP exporters. Not set from project `env` before trust |
| `OTEL_EXPORTER_OTLP_TRACES_CERTIFICATE` | 🔍 | Sets the root CA file that the OTLP traces exporter trusts. | Falls back to `OTEL_EXPORTER_OTLP_CERTIFICATE`. A read failure logs a warning | Traces exporter. Ignored in project and local `env` |
| `OTEL_EXPORTER_OTLP_TRACES_CLIENT_CERTIFICATE` | 🔍 | Sets the client certificate file for mTLS on the OTLP traces exporter. | Falls back to `OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE`. Needs the matching client key | Traces exporter. Ignored in project and local `env` |
| `OTEL_EXPORTER_OTLP_TRACES_CLIENT_KEY` | 🔍 | Sets the client private key file for mTLS on the OTLP traces exporter. | Text (a secret). Falls back to `OTEL_EXPORTER_OTLP_CLIENT_KEY`. Needs the matching client certificate | Traces exporter. Ignored in project and local `env` |
| `OTEL_EXPORTER_OTLP_TRACES_COMPRESSION` | 🔍 | Sets the compression of OTLP trace requests. | Text. Another value logs a warning and is ignored. Falls back to `OTEL_EXPORTER_OTLP_COMPRESSION` | Traces exporter. Project `env` can set it before trust |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | ✅🧪 | Sets the OTLP traces endpoint URL. A valid value in remote mode also forces `http/protobuf` for traces. | Text. The remote check needs `https` or localhost `http`, no credentials, no query, and a path that ends in `traces` | Traces exporter. Remote check needs `CLAUDE_CODE_REMOTE`. Not set from project `env` before trust |
| `OTEL_EXPORTER_OTLP_TRACES_HEADERS` | ✅ | Sets extra HTTP headers on the OTLP traces export. | Text. Overrides `OTEL_EXPORTER_OTLP_HEADERS` | Traces exporter. Ignored in project and local `env` |
| `OTEL_EXPORTER_OTLP_TRACES_INSECURE` | 🔍 | Allows an insecure (non-TLS) connection for the OTLP traces exporter. | Text | Traces exporter. Ignored in project and local `env` |
| `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL` | ✅ | Picks the OTLP wire protocol for traces. Falls back to `OTEL_EXPORTER_OTLP_PROTOCOL`. | Text. A valid remote `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` forces `http/protobuf` | Traces exporter when `OTEL_TRACES_EXPORTER` has `otlp`. Ignored in project and local `env` |
| `OTEL_EXPORTER_PROMETHEUS_HOST` | ✅ | Sets the host that the Prometheus metrics exporter binds to. | Falls back to the SDK default | Metrics exporter with `prometheus`. Ignored in project and local `env` |
| `OTEL_EXPORTER_PROMETHEUS_PORT` | ✅ | Sets the port that the Prometheus metrics exporter listens on. | A number, port by default. Falls back to the SDK default port | Metrics exporter with `prometheus`. Ignored in project and local `env` |
| `OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT` | 🔍 | Limits the number of attributes on each OTLP log record. | A number. Falls back to `OTEL_ATTRIBUTE_COUNT_LIMIT`, then 128 | Log exporters. Not set from project `env` before trust |
| `OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT` | ✅ | Limits the length of each log record attribute value. Also lowers the content cut-off for prompts and tool content. | A number, unlimited by default. Integer, min 0, default unlimited. The content cut-off is the lowest of this, the span and general limits, and `CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH` (61440) | Log exporters and OTEL content fields. Not set from project `env` before trust |
| `OTEL_LOGS_EXPORTER` | ✅ | Chooses the exporters for OpenTelemetry log events. | A comma-separated list. Needs `CLAUDE_CODE_ENABLE_TELEMETRY`. In stream-json output mode Claude Code removes `console` from it | All entrypoints. Project settings may only set `none`. Ignored in project and local `env` |
| `OTEL_LOGS_EXPORT_INTERVAL` | ✅ | Sets the log batch export delay in ms. | A number, 5000 by default. Integer. The first-party event logger reads it too (default 10000 from the process env) | Log exporters. Project `env` can set it before trust |
| `OTEL_LOG_ASSISTANT_RESPONSES` | ✅ | Includes the model response text in `assistant_response` log events. | On, off, or unset. When unset, the value of `OTEL_LOG_USER_PROMPTS` applies. `0` keeps responses redacted | All entrypoints. Ignored in project and local `env`. Project `env` may set only an off value |
| `OTEL_LOG_MANAGED_SETTINGS` | ✅ | Adds redacted managed settings and a SHA-256 digest to `managed_settings_resolved` events. | On or off. Reads managed and user layers first, and skips project and local scopes | All entrypoints. Ignored in project and local `env` |
| `OTEL_LOG_RAW_API_BODIES` | ✅ | Logs raw Messages API request and response JSON as events. | On or off, and by default. `1` (bool values) means inline. `file:<dir>` writes full bodies to disk with a `body_ref` | All entrypoints, not diskless hosts. Ignored in project and local `env` |
| `OTEL_LOG_TOOL_CONTENT` | ✅ | Includes tool content in the `tool.output` span event. | On or off. Needs tracing on | All entrypoints with tracing. Ignored in project and local `env`. Project `env` may set only an off value |
| `OTEL_LOG_TOOL_DETAILS` | ✅ | Includes tool input, MCP server names, raw errors and similar details in telemetry. | On or off. It also adds `classifier_category` on `tool_decision` events | All entrypoints. Ignored in project and local `env`. Project `env` may set only an off value |
| `OTEL_LOG_USER_PROMPTS` | ✅ | Includes user prompt text in OpenTelemetry traces and logs. | On or off. Off by default, so prompts show as `<REDACTED>` | All entrypoints. Ignored in project and local `env`. Project `env` may set only an off value |
| `OTEL_METRICS_EXPORTER` | ✅ | Chooses the exporters for OpenTelemetry metrics. | A comma-separated list. Needs `CLAUDE_CODE_ENABLE_TELEMETRY`. In stream-json output mode `console` is removed | All entrypoints. Project settings may only set `none`. Ignored in project and local `env` |
| `OTEL_METRICS_INCLUDE_ACCOUNT_UUID` | ✅ | Adds the account UUID (and a tagged id) to metric attributes. | On or off, on by default. Any set value is parsed as bool, so only `1`, `true`, `yes`, `on` keep it | Metrics. Project `env` can set it before trust |
| `OTEL_METRICS_INCLUDE_ENTRYPOINT` | ✅ | Adds the session entrypoint as `app.entrypoint` to metric attributes. | On or off, off by default. Any set value is parsed as bool | Metrics. Project `env` can set it before trust |
| `OTEL_METRICS_INCLUDE_REPOSITORY` | ✅ | Adds `vcs.*` repository attributes to metrics and events. | On or off, off by default. Any set value is parsed as bool | Metrics and events. Project `env` can set it before trust |
| `OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES` | ✅ | Adds `OTEL_RESOURCE_ATTRIBUTES` keys to metric attributes. | On or off, on by default. Any set value is parsed as bool. `user.` and `identity.` keys are skipped when the host supplies identity | Metrics. Project `env` can set it before trust |
| `OTEL_METRICS_INCLUDE_SESSION_ID` | ✅ | Adds `session.id` (and the remote session id) to metric attributes. | On or off, on by default. Any set value is parsed as bool | Metrics. Project `env` can set it before trust |
| `OTEL_METRICS_INCLUDE_VERSION` | ✅ | Adds the Claude Code version as `app.version` to metric attributes. | On or off, off by default. Any set value is parsed as bool | Metrics. Project `env` can set it before trust |
| `OTEL_METRIC_EXPORT_INTERVAL` | ✅ | Sets the metric export interval in ms for the OTLP and console readers. | A number, 60000 by default. Integer | Metrics exporters. Project `env` can set it before trust |
| `OTEL_RESOURCE_ATTRIBUTES` | ✅ | Adds custom resource attributes to telemetry, and to metric labels. | Text. Bad pairs are dropped | All entrypoints. Project `env` can set it before trust |
| `OTEL_SERVICE_NAME` | 🔍 | Sets the `service.name` resource attribute of exported telemetry. | Text | Telemetry. Project `env` can set it before trust |
| `OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT` | 🔍 | Limits the attributes on each span. | A number. Falls back to `OTEL_ATTRIBUTE_COUNT_LIMIT`, then 128 | Tracing. Not set from project `env` before trust |
| `OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT` | 🔍 | Limits the attributes on each span event. | A number, 128 by default | Tracing. Not set from project `env` before trust |
| `OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT` | 🔍 | Limits the attributes on each span link. | A number, 128 by default | Tracing. Not set from project `env` before trust |
| `OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT` | ✅ | Limits the length of span attribute values. Also lowers the content cut-off. | A number, unlimited by default. Integer, min 0, default unlimited. The content cut-off is the lowest of this, the log and general limits, and `CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH` | Tracing and OTEL content fields. Not set from project `env` before trust |
| `OTEL_SPAN_EVENT_COUNT_LIMIT` | 🔍 | Limits the events on each span. | A number, 128 by default | Tracing. Not set from project `env` before trust |
| `OTEL_SPAN_LINK_COUNT_LIMIT` | 🔍 | Limits the links on each span. | A number, 128 by default | Tracing. Not set from project `env` before trust |
| `OTEL_TRACES_EXPORTER` | ✅ | Chooses the exporters for OpenTelemetry traces. | A comma-separated list. Needs telemetry and tracing on. In stream-json output mode `console` is removed | All entrypoints. Project settings may only set `none`. Ignored in project and local `env` |
| `OTEL_TRACES_EXPORT_INTERVAL` | ✅ | Sets the trace batch export delay in ms. | A number, 5000 by default. Integer | Traces exporters. Project `env` can set it before trust |
| `OTEL_TRACES_SAMPLER` | 🔍 | Chooses the trace sampler. | Text, `parentbased_always_on` by default | Tracing. Not set from project `env` before trust |
| `OTEL_TRACES_SAMPLER_ARG` | 🔍 | Sets the sampling ratio for the `traceidratio` samplers. | A number. Blank or out of range logs an error and uses 1 | Tracing with a ratio sampler. Not set from project `env` before trust |
| `SRT_DEBUG` | 🔍 | Turns on `[SandboxDebug]` log lines in the bundled sandbox runtime. | Any non-empty value turns it on. Level picks `console.error`, `console.warn`, or log | Sandbox runtime |
| `SWE_BENCH_INSTANCE_ID` | 🔍 | Sends the SWE-bench instance id in event metadata. | Text. Empty string when unset. Goes into the event fields (`sweBenchInstanceId`) | All sessions, telemetry only |
| `SWE_BENCH_RUN_ID` | 🔍 | Sends the SWE-bench run id in event metadata. | Text. Empty string when unset. Goes into the event fields (`sweBenchRunId`) | All sessions, telemetry only |
| `SWE_BENCH_TASK_ID` | 🔍 | Sends the SWE-bench task id in event metadata. | Text. Empty string when unset. Goes into the event fields (`sweBenchTaskId`) | All sessions, telemetry only |
| `TRACEPARENT` | ✅ | Parent trace context. Claude Code uses it as the parent of its OTEL spans. | Text. Non-empty W3C `traceparent` string. Used only when a tracing gate is on | All sessions, when OTEL tracing is on |
| `TRACESTATE` | ✅ | Trace state that goes with `TRACEPARENT`. It is passed to the OTEL propagator. | Text. Only used when `TRACEPARENT` is set and tracing is on | All sessions, when OTEL tracing is on |

## See Also

- [Part 1](Claude-Code-Env-Vars-Telemetry-And-Debug)
- [Environment Variables](Claude-Code-Env-Vars)
- [Probes](Claude-Code-Probes)
- [Settings](Claude-Code-Settings)
