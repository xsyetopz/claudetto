# Claude Code Environment Variables: Internal and SDK

These 67 environment variables of Claude Code `2.1.303` cover names for tests, evals, Anthropic staff, and programs that host Claude Code.
Most of them are not meant for normal use.
An environment variable is a named setting that you put in your shell or in the `env` key of `settings.json`.

## Variables

The marks are explained on the [index](Claude-Code-Env-Vars#marks).

| Name | Mark | What It Does | Value | Where It Works |
| --- | --- | --- | --- | --- |
| `ALLOW_ANT_COMPUTER_USE_MCP` | 🔍 | It is in the schema and in a long string list of env names. No read site was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off | Name suggests Anthropic-internal use. Not set from project `env` before trust |
| `ANTHROPIC_ENVIRONMENT_ID` | 🔍 | The bundled Anthropic SDK `EnvironmentWorker` reads it as the default environment ID when a work item call passes none. | Text. The call fails with an error if no ID comes from any source | Bundled SDK work polling. Not set from project `env` before trust |
| `ANTHROPIC_ENVIRONMENT_KEY` | 🔍 | The bundled Anthropic SDK `EnvironmentWorker` reads it as the fallback environment key. A work item needs it when its secret has no `sessions_token`. | Text | Bundled SDK work polling. Not set from project `env` before trust |
| `ANTHROPIC_SESSION_ID` | 🔍 | The bundled Anthropic SDK `EnvironmentWorker` reads it as the default session ID for a work item. | Text. The call fails with an error if no ID comes from any source | Bundled SDK work polling. Not set from project `env` before trust |
| `ANTHROPIC_WEBHOOK_SIGNING_KEY` | 🔍 | The bundled SDK client reads it as the default webhook signing key. It is `null` when unset. | Text. SDK constructor default | Bundled SDK client. Not set from project `env` before trust |
| `ANTHROPIC_WORK_ID` | 🔍 | The bundled Anthropic SDK `EnvironmentWorker` reads it as the default work item ID. | Text. The call fails with an error if no ID comes from any source | Bundled SDK work polling. Not set from project `env` before trust |
| `ANTHROPIC_WORK_SECRET` | 🔍 | The bundled Anthropic SDK `EnvironmentWorker` reads it as the default work secret. | Text | Bundled SDK work polling. Not set from project `env` before trust |
| `BUGHUNTER_DEV_BUNDLE_B64` | 🔍🧪 | Passes a base64 dev bundle through to the remote `ultrareview` run. Claude Code copies it into the run env when set. | Text. Read directly and forwarded unchanged | `ultrareview` remote launch |
| `BUGHUNTER_FLEET_SIZE` | 🔍🧪 | Sets the number of agents in a remote `ultrareview` run. Claude Code sets it from the `fleet_size` option. Its presence also changes a remote-session check. | A number, `5` by default. Set by Claude Code, default `5`, max `20` (above gives the default). A remote check tests if it is set | `ultrareview` remote launch and remote sessions |
| `CLAUBBIT` | 🔍 | Marks a Claubbit run. Claude Code skips the workspace trust dialog and reports `isClaubbit` in env info. | On or off. Treated like CI or `IS_DEMO` for the trust dialog skip | Internal hosted runs |
| `CLAUDE_CODE_CONFIG_PROBE` | 🔍 | In the IDE config probe, skips the `awsAuthRefresh` and `gcpAuthRefresh` commands and the credential helper prefetch. | On or off, off by default. Also in a list of host-controlled names | IDE config probe, Bedrock and Vertex auth refresh |
| `CLAUDE_CODE_DAPPER_CUPCAKE` | 🔍🧪 | It overrides an internal flag. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On, off, or unset. The flag default is on | All sessions, experiment override |
| `CLAUDE_CODE_DEV_RAW_CHANGELOG_URL` | 🔍❌ | In the schema, but nothing reads it. | A URL | All sessions |
| `CLAUDE_CODE_DISABLE_ATTRIBUTION_BASELINE_REUSE` | 🔍❌ | In the schema, but nothing reads it. | On or off | All sessions |
| `CLAUDE_CODE_DISABLE_ATTRIBUTION_CROSS_REPO` | 🔍❌ | In the schema, but nothing reads it. | On or off | All sessions |
| `CLAUDE_CODE_DISPATCH_V2D` | 🔍🧪 | It overrides an internal flag in an API route picker. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Off by default. Falls back to the flag, default off | Main API requests, flag-gated |
| `CLAUDE_CODE_DISPATCH_V2S` | 🔍🧪 | It overrides an internal flag in the same API route picker, skipped for `auxiliary` calls. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Off by default. Falls back to the flag, default off | Non-auxiliary API requests, flag-gated |
| `CLAUDE_CODE_EDITOR_CODELIVERY` | 🔍 | Lets a relayed human message carry an `artifact_followup` ack with an `https` URL of at most 2048 chars. | On or off, off by default | Relay and remote sessions only |
| `CLAUDE_CODE_ELEGANT_MEADOW` | 🔍🧪 | It overrides an internal flag, which defaults to on. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On, off, or unset. A set value wins over the flag | Main loop, flag-gated |
| `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS` | ✅ | Adds `session_state_changed` system messages to the output stream. | On or off, off by default. Code emits a normal event when set, else a host-only event when `CLAUDE_CODE_SDK_READS_SESSION_STATE` is set | SDK and `--print` stream-json |
| `CLAUDE_CODE_ENABLE_DESIGN_SYNC` | 🔍❌ | In the schema, but nothing reads it. | On or off | Project `env` can set it before trust |
| `CLAUDE_CODE_ENTRYPOINT` | 🔍 | Names the surface that started Claude Code, such as `cli`, `sdk-ts`, `claude-vscode`, or `remote`. Many code paths branch on it. | Text. Set by Claude Code at startup when empty (`mcp` for `mcp serve`, `sdk-cli` for SDK CLI) and set to `sdk-ts` by the TS SDK | All sessions |
| `CLAUDE_CODE_EVAL_ALLOW_ARTIFACT_PUBLISH` | 🔍 | Lets an eval case publish artifacts when its definition asks for it. | Off by default. Second env accessor, checked against `true`. The `artifactPublish` option also works | Eval harness |
| `CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES` | 🔍 | Lists the flags that an eval case may override in `growthbook_overrides`. Others are dropped with a warning. | A comma-separated list, empty by default. The `allowFlagOverrides` option also works | Eval harness |
| `CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR` | 🔍 | Sets a stub directory so artifact calls use `eval-stub://artifact/` URLs. | Text, unset by default. Non-empty `str`. Set by the eval harness for confined runs | Eval harness |
| `CLAUDE_CODE_EVAL_CONFINED` | 🔍 | Confines a run to the allow rules from the command line and drops those from settings files. | On or off, off by default. Set to `1` by the eval harness for the child process | Eval harness |
| `CLAUDE_CODE_EVAL_INTERVIEW_SESSION` | 🔍 | Marks an interview eval session and turns off the automatic eval report publish. | On or off, off by default. Removed from the env of child sessions | Eval harness |
| `CLAUDE_CODE_FORWARD_USER_INTENT` | 🔍 | A getter returns its value next to code that classifies user turns as `typed`, `relay`, or `owner`. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off, off by default | Relay and remote sessions |
| `CLAUDE_CODE_GB_BASE_URL` | 🔍❌ | In the schema, but nothing reads it. | Text. Name sits in a list of endpoint and credential env names kept out of managed settings `env` | All sessions |
| `CLAUDE_CODE_GB_REFRESH_INTERVAL_MS` | 🔍❌ | In the schema, but nothing reads it. | A number of milliseconds | All sessions |
| `CLAUDE_CODE_GENTLE_PARASOL` | 🔍🧪 | Overrides an internal flag experiment, which applies a secondary reminder to model requests. | Text. Logs `secondary_reminder` when applied | API requests |
| `CLAUDE_CODE_GORSE_PLOVER` | 🔍🧪 | It forces on the `bashActFirstEnabled` setting, otherwise client data or an internal flag decides. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off, off by default | Bash tool |
| `CLAUDE_CODE_HUMBLE_HAMMOCK` | 🔍🧪 | Forces the `echoWireToolInputs` behavior on or off ahead of the flag. Probe: Adds `wire_tool_inputs` (raw `tool_use.input`) to the assistant event when a tool runs. See [Probes](Claude-Code-Probes). | On, off, or unset. Unset falls back to `echoWireToolInputs` and then to a feature flag | All sessions |
| `CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP` | 🔍 | Sets the Bun JIT policy 10 seconds after start. Without it the policy is set to `1`. | On or off. Whole number `1` to `100`, digits only. A truthy value loads a module that applies the value | All sessions, Bun build |
| `CLAUDE_CODE_LARCH_CISTERN` | 🔍🧪 | Overrides the `larch_cistern` experiment value for the model. Probe: Adds a "Corrections" section to the system prompt (avoid excessive self-correction). See [Probes](Claude-Code-Probes). | On or off. Passed to the same per-model helper as `CLAUDE_CODE_AMBER_ASTROLABE`. A false value counts as unset | All sessions |
| `CLAUDE_CODE_LAZY_ENV_GETTERS` | 🔍 | The name appears only in a list of env names and the schema has it as a `bool`. Nothing reads it, and a [Probes](Claude-Code-Probes) run saw no effect. | On or off | All sessions |
| `CLAUDE_CODE_MOCK_REMOTE_SETTINGS` | 🔍 | The name appears in lists of env names and the schema has it as a `str`. Nothing reads it, and a [Probes](Claude-Code-Probes) run saw no effect. | Text | All sessions |
| `CLAUDE_CODE_MOCK_TRIAL` | 🔍 | The name appears in a list of env names next to other test and force flags. Nothing reads it, and a [Probes](Claude-Code-Probes) run saw no effect. | On or off | All sessions |
| `CLAUDE_CODE_OVERRIDE_DATE` | 🔍❌ | In the schema, but nothing reads it. | Text | All sessions |
| `CLAUDE_CODE_POLL_EVENTS` | 🔍 | Lets a host send poll events to the session as `<event>` envelopes. The code rejects them when the host did not set it. | On or off. Poll events also need permission mode `auto` | SDK and host sessions |
| `CLAUDE_CODE_POLL_EVENT_DECLARATIONS` | 🔍 | No property read of this name was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text. Only name-list hits were seen, next to the poll event vars | SDK and host sessions |
| `CLAUDE_CODE_REMOVE_PROMPT_STRINGS` | 🔍 | Removes listed strings from prompts for prompt ablation tests. It overrides the `remove_prompt_strings` client data. | JSON text. A bad value logs a warning. Telemetry event a feature flag | All sessions |
| `CLAUDE_CODE_SDK_READS_SESSION_STATE` | 🔍 | Tells Claude Code that the SDK host reads session state. Claude Code then sends `session_state_changed` events marked `sdk_host_only`. | On or off. Set by Claude Code to `1` in the SDK child env unless the host already set it | SDK and print mode. Set by Claude Code |
| `CLAUDE_CODE_SIMULATE_PROXY_USAGE` | 🔍 | Simulates proxy use in request shaping. Claude Code then skips steps such as the thinking display update. A [Probes](Claude-Code-Probes) run saw no `anthropic-beta` header. | On or off | API requests |
| `CLAUDE_CODE_SKIP_HFI_VERSION_CHECK` | 🔍 | It is in the schema and in a list of env names, and no read site was shown. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off | Unknown |
| `CLAUDE_CODE_SKIP_PROJECT_BACKFILL` | 🔍 | The name appears only in a list of env names. No property read of this name was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off | Unknown |
| `CLAUDE_CODE_SKIP_REPO_UPLOAD` | 🔍 | The name appears only in a list of env names. No property read of this name was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off | Unknown |
| `CLAUDE_CODE_SPAWNED_BY_SERVER` | 🔍 | The name appears only in a list of env names. No property read of this name was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | - | Unknown |
| `CLAUDE_CODE_SUPERVISED` | 🔍 | Tells Claude Code that a supervisor restarts it. On an uncaught exception it then exits at once instead of staying alive. | On or off | Supervised or managed runs |
| `CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK` | 🔍 | Lets a test runtime send live network requests. Without it, Claude Code refuses non-loopback requests under test. | On or off. Error text says to set it to `1` for an intentional live probe | Test runtimes only |
| `CLAUDE_CODE_TEST_FIXTURES_ROOT` | 🔍❌ | Sets the root folder for recorded `fixtures/*.json` test files. The code that uses it sits behind a function that always returns false. | Text | Tests only |
| `CLAUDE_CODE_TEST_FORCE_DENY` | 🔍 | The name appears only in a string list with other test names. No property read of this name was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | - | Tests only |
| `CLAUDE_CODE_TEST_NO_GIT_BASH` | 🔍 | The name appears only in a string list with other test names. No property read of this name was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text | Tests only |
| `CLAUDE_CODE_TEST_NO_PWSH` | 🔍 | The name appears only in a string list with other test names. No property read of this name was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text | Tests only |
| `CLAUDE_CODE_TETHER_LIVE` | 🔍🧪 | Forces the tether-live gate on or off. It replaces the an internal flag and also gates the kept-reminder delivery. | On or off. Needs the first-party provider. Without it, the flag decides, and only for some builds or users | First-party provider only |
| `CLAUDE_CODE_ULTRAREVIEW_PREFLIGHT_FIXTURE` | 🔍 | Replaces the `/v1/ultrareview/preflight` response with a JSON value for tests. A bad value gives null. | JSON text | `/ultrareview` |
| `CLAUDE_CODE_ULTRAREVIEW_QUOTA_FIXTURE` | 🔍 | Replaces the `/v1/ultrareview/quota` response with a JSON value for tests. A bad value gives null. | JSON text | `/ultrareview` |
| `CLAUDE_INTERNAL_FC_OVERRIDES` | 🔍 | Feeds feature flag overrides to the flag client. Eval children get a JSON value. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text. A true value is kept for background sessions, other values are not | Evals and flag client |
| `CLAUDE_SERVE_DRAIN_TIMEOUT_MS` | 🔍❌ | In the schema, but nothing reads it. | A number of milliseconds | - |
| `CLAUDE_SNIP` | 🔍❌ | In the schema, but nothing reads it. | - | - |
| `CLAUDE_TEST_NO_OPEN` | 🔍 | Any defined value tells a bundled helper script not to open a browser. The reason text names this var. | - | - |
| `CLAUDE_TEST_PROJECT_DIR` | 🔍 | Passes the project directory to the bundled Claude Test browser MCP server. | A path | - |
| `FORCE_VCR` | 🔍❌ | In the schema, but nothing reads it. | On or off | Nowhere, nothing reads it |
| `SDK_NATIVE_BIN` | 🔍 | Sets the native binary file name that the Agent SDK looks for. | Text, `claude` by default. Joined to the platform package path `@anthropic-ai/claude-agent-sdk-<os>-<arch>` | Agent SDK launch. Not set from project `env` before trust |
| `TEST_ENABLE_SESSION_PERSISTENCE` | 🔍 | Lets a test build save sessions. In a test environment, session persistence is off unless this is set. | On or off. So it has no effect here | Test builds only |
| `ULTRAPLAN_PROMPT_FILE` | 🔍 | The name is a typed string in the schema and in a list of names. No property read of this name was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text | Unknown |
| `VCR_RECORD` | 🔍 | The name is a typed bool in the schema and in a list of names. No property read of this name was found. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off | Unknown |

## Example

A program that hosts Claude Code sets these variables in the child process.
Most of them are not for normal use.

```sh
CLAUDE_CODE_ENTRYPOINT=sdk-cli claude -p "List the files" --output-format stream-json
```

Here `CLAUDE_CODE_ENTRYPOINT` tells Claude Code which host started it.
The host sets it before the process starts, so a project `env` setting does not replace it.

## See Also

- [Environment Variables](Claude-Code-Env-Vars)
- [Probes](Claude-Code-Probes)
- [Settings](Claude-Code-Settings)
