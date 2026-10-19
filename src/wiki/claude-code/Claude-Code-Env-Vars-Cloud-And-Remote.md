# Claude Code Environment Variables: Cloud and Remote

These 159 environment variables of Claude Code `2.1.303` cover cloud sessions, the bridge, the desktop app, Chrome, Cowork, and Slack.
Claude Code sets many of them by itself in a cloud session.
An environment variable is a named setting that you put in your shell or in the `env` key of `settings.json`.

## Variables

The marks are explained on the [index](Claude-Code-Env-Vars#marks).

| Name | Mark | What It Does | Value | Where It Works |
| --- | --- | --- | --- | --- |
| `AGENT_PROXY_AUTH_TOKEN` | 🔍 | The agent proxy relay setup reads it once from `process.env` and then removes it from the environment. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text. Used together with the `CCR_AGENT_PROXY_*` vars and `AGENT_PROXY_URL` | Cloud sessions with an agent proxy. Not set from project `env` before trust |
| `AGENT_PROXY_URL` | 🔍 | The agent proxy relay setup reads it once from `process.env` and then removes it from the environment. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text. The standalone relay path also unsets it | Cloud sessions with an agent proxy. Not set from project `env` before trust |
| `CCR_AGENT_PROXY_CA_CERT_B64` | 🔍🧪 | Gives the agent proxy CA certificate as base64 PEM. Claude Code uses it instead of fetching the CA. | Text. Read once at startup then removed from the env. A bad value logs a warning and the CA is fetched | Cloud remote sessions |
| `CCR_AGENT_PROXY_CA_WATCH_ENABLED` | 🔍🧪 | Turns on the CA file watch of the agent proxy relay. | On or off. Read at agent proxy startup with `CCR_AGENT_PROXY_ENABLED`. Purpose of the watch is not shown beyond the flag name | Cloud remote sessions |
| `CCR_AGENT_PROXY_ENABLED` | 🔍🧪 | Turns on the hosted agent proxy relay that routes git and GitHub traffic of a remote session. | On or off. Needs `CLAUDE_CODE_REMOTE` true and a session id and token. Off by default | Cloud remote sessions |
| `CCR_AGENT_PROXY_FRAME_HOSTS` | 🔍🧪 | Lists hosts for the frame tunnel. A malformed value logs a warning and keeps the gateway routes. | Text. Unset means no frame tunnel host | Cloud remote sessions |
| `CCR_AGENT_PROXY_INCLUDE_HOSTS` | 🔍🧪 | Lists the hosts that the agent proxy relays in `selective` mode. Other hosts use normal networking. | Text. Comma separated string. An empty list in `selective` mode fails closed and tunnels everything | Cloud remote sessions |
| `CCR_AGENT_PROXY_NO_PROXY_LOCAL_ONLY` | 🔍🧪 | Limits the proxy bypass list of the agent proxy relay to local hosts only. | On or off. Used with standalone mode and in the no-proxy list choice | Cloud remote sessions |
| `CCR_AGENT_PROXY_RECEIVE_GATE_DISABLED` | 🔍🧪 | Turns off the receive gate of the agent proxy relay. | On or off. Removed from the env after reading | Cloud remote sessions |
| `CCR_AGENT_PROXY_RELAY_MODE` | 🔍🧪 | Selects the relay mode of the agent proxy. `agent_proxy_standalone` starts a standalone relay and `selective` relays only listed hosts. | Text. Standalone mode needs `CLAUDE_CODE_ENVIRONMENT_KIND` to be `byoc`. Removed from the env after reading | Cloud remote sessions |
| `CCR_AGENT_PROXY_STANDALONE_URL` | 🔍🧪 | Gives the URL of the standalone agent proxy relay in a bring-your-own-cloud session. | Text. Used when the relay mode is `agent_proxy_standalone`. An invalid URL stops startup | Cloud `byoc` sessions |
| `CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR` | 🔍🧪 | Gives the file descriptor number that holds the relay token for a tool container daemon. | A number. Digits only, number 3 or more. Read once then removed from the env | Cloud tool containers |
| `CCR_AGENT_PROXY_UPLOAD_GATE_DISABLED` | 🔍🧪 | Turns off the upload gate of the agent proxy relay. | On or off. Removed from the env after reading | Cloud remote sessions |
| `CCR_AUTO_MODE_ALLOW` | 🔍🧪 | Carries auto mode `allow` rules from the host to a self-hosted runner. The runner removes it from the session env. | Read from session `environment_variables` only when `CCR_AUTO_MODE_APPLY` is `1`. Entries with line breaks or blanks are refused | Self-hosted runner (cloud `byoc`) |
| `CCR_AUTO_MODE_APPLY` | 🔍🧪 | Switches on the host-sent auto mode rules for a self-hosted runner. The runner removes it from the session env. | Active only when the session `environment_variables` value is exactly `1`. Set to undefined for the child | Self-hosted runner (cloud `byoc`) |
| `CCR_AUTO_MODE_ENVIRONMENT` | 🔍🧪 | Carries auto mode `environment` entries from the host to a self-hosted runner. The runner removes it from the session env. | Read from session `environment_variables` only when `CCR_AUTO_MODE_APPLY` is `1`. Set to undefined for the child | Self-hosted runner (cloud `byoc`) |
| `CCR_AUTO_MODE_SOFT_DENY` | 🔍🧪 | Carries auto mode `soft_deny` rules from the host to a self-hosted runner. The runner removes it from the session env. | Read from session `environment_variables` only when `CCR_AUTO_MODE_APPLY` is `1`. Set to undefined for the child | Self-hosted runner (cloud `byoc`) |
| `CCR_DELTA_RESET` | 🔍🧪 | Turns on a delta reset path in the CCR git fetch step and adds a `delta_reset` field to startup timing data. | On or off. Truthy check on the env value. The fetch step then checks `HEAD` is a valid commit before it fetches | Cloud remote and self-hosted runner sessions |
| `CCR_ENABLE_BUNDLE` | 🔍🧪 | Lets `claude --cloud` seed a cloud session from an uploaded local git bundle instead of a remote clone. | On or off. Not used for `byoc` environments | Local CLI, cloud session start |
| `CCR_FORCE_BUNDLE` | ✅ | Forces `claude --cloud` to bundle and upload the local repository instead of cloning from its remote. | On or off. Docs name only `1`. Skipped for `byoc` environments and agent sessions | Local CLI, cloud session start |
| `CCR_ON_BRANCH_DEFAULT_GUARD` | 🔍🧪 | Sets how the guard acts when an `--on-branch` cloud start targets the default branch. The guard has three modes. | One of a fixed set of values. Enum `enforce`, `observe`, `off`. Unset gives `enforce`, or `observe` when a feature flag is on | Local CLI, cloud session start |
| `CCR_PREFETCH_NETWORK` | 🔍🧪 | Carries the network prefetch result of a CCR runner. Claude Code only reports it as `prefetch_network` in startup timing data. | Text | Cloud remote and self-hosted runner sessions |
| `CCR_PREWARM_STAT` | 🔍🧪 | Carries the prewarm stat result of a CCR runner. Claude Code only reports it as `prewarm_stat` in startup timing data. | Text | Cloud remote and self-hosted runner sessions |
| `CCR_PREWARM_VDA` | 🔍🧪 | Carries the prewarm VDA result of a CCR runner. Claude Code only reports it as `prewarm_vda` in startup timing data. | Text | Cloud remote and self-hosted runner sessions |
| `CCR_SESSION_PROFILE` | 🔍🧪 | Marks a CCR session profile. It turns off default inline tools and prompt cache keepalive, and enables the session ingress check. | On or off. The ingress check also needs `SESSION_INGRESS_URL` and a session id that starts with `cse_` | Cloud remote sessions |
| `CCR_SHR_SSE_HINTS` | 🔍🧪 | Makes the self-hosted runner open a server-sent events stream for work hints, so it wakes sooner. | On or off. Logs `CCR_SHR_SSE_HINTS enabled` when on | Self-hosted runner |
| `CCR_SHR_START_MARKS` | 🔍🧪 | Names a start marks key that the self-hosted runner blanks in the session env. It is also tied to prewarm marker files in `/tmp`. | Set to undefined in the child env | Self-hosted runner |
| `CLAUDE_ARTIFACT_HOST_GRANT` | 🔍 | Holds the host app grant for local MCP servers. Artifact publish uses it to check the MCP manifest of a page. | `rawStr`, parsed by a grant reader. The app that launches the session sets it | Artifact publish in a host-launched session. Not set from project `env` before trust |
| `CLAUDE_BRIDGE_BASE_URL` | 🔍❌ | In the schema, but nothing reads it. The name appears only in string lists. | Text. Lists of host-controlled names include it | Remote bridge. Not set from project `env` before trust |
| `CLAUDE_BRIDGE_REATTACH_GROUPING` | 🔍 | Claude Code passes a grouping value to a relaunched bridge session. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text. Set by Claude Code on a reattach spawn. The new process reads it once and deletes it | Remote Control bridge reattach. Not set from project `env` before trust |
| `CLAUDE_BRIDGE_REATTACH_NO_BACKFILL` | 🔍 | Tells a reattached bridge session to skip the history backfill. | On or off. Set to `1` by Claude Code on a reattach spawn. The new process reads it once and deletes it | Remote Control bridge reattach. Not set from project `env` before trust |
| `CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY` | 🔍 | Makes a reattached bridge session send only outbound (mirror mode). Without it the reattach is a full bridge. | On or off. Claude Code sets `1` unless the caller passes `false`. It feeds the bridge enable logic | Remote Control bridge reattach. Not set from project `env` before trust |
| `CLAUDE_BRIDGE_REATTACH_OWNER_ACCT` | 🔍 | Passes the owner account UUID to a reattached bridge session. | Text. Set by Claude Code on a reattach spawn. The new process reads it once and deletes it | Remote Control bridge reattach. Not set from project `env` before trust |
| `CLAUDE_BRIDGE_REATTACH_OWNER_ORG` | 🔍 | Passes the owner organization UUID to a reattached bridge session. | Text. Set by Claude Code on a reattach spawn. The new process reads it once and deletes it | Remote Control bridge reattach. Not set from project `env` before trust |
| `CLAUDE_BRIDGE_REATTACH_SEQ` | 🔍 | Passes the last sequence number to a reattached bridge session. | A number. Whole number. Claude Code sets it only when the number is above `0` | Remote Control bridge reattach. Not set from project `env` before trust |
| `CLAUDE_BRIDGE_REATTACH_SESSION` | 🔍 | Gives the bridge session id that a relaunched process must reattach to. | Text. Set by Claude Code on a reattach spawn. The new process reads it once and deletes it | Remote Control bridge reattach. Not set from project `env` before trust |
| `CLAUDE_BRIDGE_SESSION_INGRESS_URL` | 🔍❌ | In the schema, but nothing reads it. The name appears only in string lists. | Text | Remote bridge. Not set from project `env` before trust |
| `CLAUDE_CHROME_PAIRED_DEVICE_ID` | 🔍 | Names the paired browser extension device for the Chrome bridge. | Text. Must match a device id pattern. Else Claude Code logs a warning and ignores it | Claude in Chrome bridge. Not set from project `env` before trust |
| `CLAUDE_CHROME_TAB_GROUP_KEY` | 🔍 | Sets the browser tab group key for Claude Code browser calls. | Text. Honored only with `CLAUDE_CODE_REMOTE_SESSION_ID`. Claude Code then unsets it | Claude in Chrome in remote sessions. Not set from project `env` before trust |
| `CLAUDE_CLIENT_PRESENCE_FILE` | ✅ | Names a marker file that tells Claude Code you are at the computer. While it exists, Claude Code skips Remote Control mobile pushes. | Text. The code checks with a file `stat` on each presence check | Remote Control. Not set from project `env` before trust |
| `CLAUDE_CODE_ARTIFACTS_API_BASE_URL` | 🔍❌ | In the schema, but nothing reads it. The name appears only in a string list of URL variables. | Text | Artifacts. Not set from project `env` before trust |
| `CLAUDE_CODE_ARTIFACT_ASSET_BASE_URL` | 🔍❌ | In the schema, but nothing reads it. The name appears only in a string list of URL variables. | Text | Artifacts. Not set from project `env` before trust |
| `CLAUDE_CODE_ATTACHMENTS_IN_USER_DATA` | 🔍🧪 | Turns on an attachments-in-user-data step in cloud sessions. The step stops when data retention rules apply. | On or off. Needs `CLAUDE_CODE_REMOTE_SESSION_ID` and a cloud session | Cloud sessions |
| `CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT` | 🔍 | Marks a Remote Control child session as allowed to use artifacts. Set by Claude Code for the child. | On or off. Claude Code sets `1` in the child env. It first clears the inherited value | Remote Control child sessions |
| `CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT` | 🔍 | Makes auto mode the default mode of a Remote Control child session. Set by Claude Code for the child. | On or off. Set to `1` in the child env. It also ignores `defaultMode` `auto` if `disableAutoMode` is set | Remote Control child sessions |
| `CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS` | 🔍 | Marks a Remote Control child session that uses machine settings. Set by Claude Code for the child. | On or off. Set to `1` in the child env | Remote Control child sessions |
| `CLAUDE_CODE_BRIDGE_MCP_CARRIER` | 🔍 | Marks a Remote Control child that carries the bridge MCP config. Set by Claude Code. | One of a fixed set of values. Enum `1` or `spent`. `1` means a child | Remote Control sessions |
| `CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID` | 🔍 | Carries the owner account UUID into a Remote Control child session. Set by Claude Code. | Text. The child reads it as the bridge owner identity | Remote Control child sessions |
| `CLAUDE_CODE_BRIDGE_OWNER_ORG_UUID` | 🔍 | Carries the owner organization UUID into a Remote Control child session. Set by Claude Code. | Text. Used with `CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID` | Remote Control child sessions |
| `CLAUDE_CODE_BRIDGE_PROMPT_SHA256` | 🔍 | Holds the SHA-256 of the appended system prompt that the bridge passes to a carrier child. The child checks the prompt file against it. | Text. Set by Claude Code. The child removes it after the first read | Remote Control carrier children |
| `CLAUDE_CODE_BRIDGE_SESSION_ID` | ✅ | Holds the `session_` ID of the active Remote Control connection. Set by Claude Code. | Text. Set while connected and deleted when the connection ends. Claude Code removes it from some child envs | Remote Control, Bash and hook subprocesses |
| `CLAUDE_CODE_BRIDGE_SOURCE_DIR` | 🔍 | Carries the source directory into a Remote Control child session. Set by Claude Code. Purpose of the read side is not clear from the bundle. | Text. Set from the spawn option `sourceDir` | Remote Control child sessions |
| `CLAUDE_CODE_BRIEF_UPLOAD` | 🔍 | Picks the `env_brief_upload` attachment mode for the file delivery tool. | On or off. It ranks after `CLAUDE_CODE_ATTACHMENTS_BY_PATH` and the REPL bridge, and before the cloud and BYOC modes | Brief mode attachments |
| `CLAUDE_CODE_CCR_EARLY_HYDRATE_PREFETCH` | 🔍 | Starts the hydrate prefetch early for a resumed remote session. | On or off. Needs an SDK URL and a resume option | Cloud sessions |
| `CLAUDE_CODE_CCR_EARLY_REMOTE_CONNECT` | 🔍 | Starts the remote connection early for a resumed remote session. | On or off. Needs an SDK URL and a resume option | Cloud sessions |
| `CLAUDE_CODE_CCR_WORKER_SOCKET` | 🔍 | Opens the cloud session event stream over a worker socket. | On or off. Needs a cloud session where Claude Code owns the process | Cloud sessions |
| `CLAUDE_CODE_CHROME_MCP_ORG_DENIED` | 🔍 | When set, the Chrome MCP check reports a denial by the parent organization policy. | On or off. Claude Code deletes it when it builds some child envs | Chrome integration |
| `CLAUDE_CODE_CLOUD_SESSION_ID` | 🔍 | Holds the cloud session ID for shell commands that Claude Code runs. Set by Claude Code. | Text. Added to the extra env of spawned shell commands | Cloud sessions |
| `CLAUDE_CODE_CONTAINER_ID` | 🔍 | Reports the container id in session metadata as `claudeCodeContainerId`. Its presence also marks a remote or container session. | Text. No default. Set by the container host | Remote and container sessions |
| `CLAUDE_CODE_COWORK_FRAME_ARTIFACTS` | 🔍 | Claude Code stores the value in its host config at startup. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off, off by default | Cowork host |
| `CLAUDE_CODE_DESKTOP_APP_VERSION` | 🔍 | Gives the desktop app version to Claude Code. Claude Code reads it only for the desktop entrypoints. | Text. Used when `CLAUDE_CODE_ENTRYPOINT` is `claude-desktop` or `local-agent`. Else ignored | Desktop app |
| `CLAUDE_CODE_DISABLE_TURN_HANDOFF` | 🔍 | Marks turn handoff as disabled in the admission check for SDK and remote sessions. | On or off, off by default | SDK and remote sessions |
| `CLAUDE_CODE_DISABLE_WORKING_SYNC` | 🔍 | Stops the synced working-file syncer in remote sessions and blocks the self-hosted `admitted` state. | On or off, off by default | Remote sessions with `CLAUDE_CODE_REMOTE_SESSION_ID` and an SDK URL |
| `CLAUDE_CODE_ENABLE_CFC` | ✅ | Starts the session with Chrome integration on or off, ahead of `claudeInChromeDefaultEnabled`. | On, off, or unset. `--chrome` and `--no-chrome` win. Remote and Cowork sessions also need this var or the flag | All sessions. Not set from project `env` before trust |
| `CLAUDE_CODE_ENABLE_REMOTE_RECAP` | 🔍🧪 | Forces the remote session recap on or off. | On, off, or unset, off by default. Unset uses a feature flag, default off | Remote sessions that report metadata |
| `CLAUDE_CODE_ENVIRONMENT_KIND` | 🔍 | Names the remote runner kind. `bridge` and `byoc` change session and bridge behavior. | Text | Remote and bridge sessions |
| `CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION` | 🔍 | Sends the runner version in the `x-environment-runner-version` header on worker requests. | Text. Skipped when empty | Remote runner sessions |
| `CLAUDE_CODE_FORCE_BRIDGE` | 🔍❌ | In the schema, but nothing reads it. | On or off | All sessions |
| `CLAUDE_CODE_FORCE_RC_LONG_TURN_NUDGE` | 🔍 | Forces the remote control nudge after a long turn. Uses a 5 s threshold, probability 1, and no impression limit. | On or off. Second env accessor, truthy check. Else a feature flag | Interactive |
| `CLAUDE_CODE_HARBOR_KITE_CLOUD` | 🔍🧪 | Allows cloud peer access for cross-session messaging. | On or off, off by default. Else a feature flag. Needs first-party auth and `allow_remote_sessions` | First-party sessions with an org |
| `CLAUDE_CODE_HOLD_REPORT_PARK_AT_INIT` | 🔍 | Sets `reportParkAtInit` for the remote session worker. It takes effect only when `CLAUDE_CODE_RESUME_INTERRUPTED_TURN` is also on. | On or off. Both values must be true | Remote session worker |
| `CLAUDE_CODE_HOSTED_DESKTOP` | 🔍 | The name appears only in a list of env names and the schema has it as a `bool`. Nothing reads it, and a [Probes](Claude-Code-Probes) run saw no effect. | On or off | Desktop app |
| `CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD` | 🔍 | The value goes into the print-mode host state and into the check that decides whether to copy the env. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off | SDK or host print mode |
| `CLAUDE_CODE_IS_COWORK` | 🔍 | Marks the session as Cowork. It allows synced skills and treats the session like a remote one for state and cache checks. | On or off. Checked next to `CLAUDE_CODE_REMOTE` and the `remote_cowork` entrypoint | Cowork |
| `CLAUDE_CODE_LEGACY_BUNDLE` | 🔍 | Makes a cloud session upload the working tree the previous way, as a git bundle. | On or off. Ignored when a settings file sets it or when settings move HOME or `CLAUDE_CONFIG_DIR` | Cloud sessions (git bundle upload) |
| `CLAUDE_CODE_PARKED_PERMISSION_WAIT_MS` | 🔍 | Feeds the `answerWaitMs` value of the parked-permission resume options. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | A number of milliseconds, `2000` by default. Whole number of 0 or more. Read next to `CLAUDE_CODE_RESUME_INTERRUPTED_TURN` | All sessions |
| `CLAUDE_CODE_PARKED_RUN_BEFORE_CLEAR` | 🔍 | Feeds the `runsBeforeClear` field of the parked-permission resume options. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off | All sessions |
| `CLAUDE_CODE_PARKED_STOP_RETIRES` | 🔍 | Feeds the `parkedStopRetires` field of the parked-permission resume options. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off | All sessions |
| `CLAUDE_CODE_REMOTE` | ✅ | Marks a cloud session. When it is `true` Claude Code raises the Node heap limit to 8192 MB. | On or off. Set automatically in cloud sessions. Many code paths test it | Cloud sessions |
| `CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE` | 🔍 | Names the kind of remote environment. The value `self_hosted` with `CLAUDE_CODE_ENVIRONMENT_KIND=byoc` marks a self-hosted runner. | Text. Also copied into telemetry as `remoteEnvironmentType` | Cloud and runner sessions |
| `CLAUDE_CODE_REMOTE_HERMETIC_MODE` | 🔍 | Reports a hermetic mode flag. It is true only when `CLAUDE_CODE_REMOTE` is also set. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On or off | Cloud sessions |
| `CLAUDE_CODE_REMOTE_MCP_CONFIG` | ✅🧪 | Names a file with the MCP servers that a runner delivered. Claude Code loads it as a dynamic scope config. | Text. Read only when `CLAUDE_CODE_REMOTE` is true and `CLAUDE_CODE_ENVIRONMENT_KIND` is `byoc` | Self-hosted runner sessions |
| `CLAUDE_CODE_REMOTE_RAW_EVENTS_FILE` | 🔍❌ | In the schema, but nothing reads it. | Text | All sessions |
| `CLAUDE_CODE_REMOTE_SDK_URL` | 🔍 | Gives the SDK URL of a remote session. Claude Code uses it when no other URL is set and the URL is valid. | Text. Claude Code also sets it from a stored URL in bridge or `byoc` mode | Bridge and `byoc` sessions |
| `CLAUDE_CODE_REMOTE_SEND_KEEPALIVES` | 🔍🧪 | Sends session keepalive callbacks during heartbeat and long hook runs. Hook keepalive also needs an internal flag. | On or off | Cloud sessions |
| `CLAUDE_CODE_REMOTE_SESSION_ID` | ✅ | Holds the ID of the current cloud session. | Text. Set by Claude Code in cloud sessions and by a self-hosted runner. Telemetry and the session ID parser read it | Cloud sessions |
| `CLAUDE_CODE_REMOTE_SESSION_ORIGIN` | 🔍 | The value `review` marks a review-origin session. Such sessions skip some token disk writes. | Text. Compared to `review` | Cloud sessions |
| `CLAUDE_CODE_REMOTE_SESSION_UUID` | ✅ | Holds the UUID form of the remote session ID. A self-hosted runner puts it in the env of the session it starts. | Set by a runner, from the session ID | Self-hosted runner sessions |
| `CLAUDE_CODE_REMOTE_SETTINGS_PATH` | 🔍 | Names a file that replaces the remote settings fetch. The log says `skipping API fetch`. | Text. Read directly | All sessions |
| `CLAUDE_CODE_REMOTE_SETTINGS_POLL_MS` | 🔍❌ | In the schema, but nothing reads it. | A number of milliseconds | All sessions |
| `CLAUDE_CODE_REMOTE_TOOLS_ADOPT_MCP` | 🔍 | Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Unset or a true value gives on | Sessions that serve tools to cloud sessions |
| `CLAUDE_CODE_REMOTE_TOOLS_ASK_SEATS` | 🔍🧪 | Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | On by default. Value is used as is | Sessions that serve tools to cloud sessions |
| `CLAUDE_CODE_REMOTE_TOOLS_CALLER_SESSIONS_MAX` | 🔍 | Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | - | Sessions that serve tools to cloud sessions |
| `CLAUDE_CODE_REMOTE_TOOLS_FORWARD` | 🔍 | Turns on the remote tools forward mode that gates the served tools code. Details are not clear from the bundle. | On or off. True only for `true`. Telemetry also notes whether it is present | Sessions that serve tools to cloud sessions |
| `CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED` | 🔍 | A host passes a grant for unattended runs. Claude Code stores it with `setHostUnattendedGrant` and then removes the var. | Text. Read once at startup and removed from the env | Host apps |
| `CLAUDE_CODE_REMOTE_TOOLS_JUMP_QUEUE` | 🔍🧪 | Overrides an internal flag. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Off by default. Read from the env object | Sessions that serve tools to cloud sessions |
| `CLAUDE_CODE_REMOTE_TOOLS_PIN_STORED_LOGIN` | 🔍 | Pins remote tool serving to the stored claude.ai login. It stops with an error if the endpoint is not Anthropic's own service. | On or off. True only for `true`. A token from the env does not satisfy it | Sessions that serve tools to cloud sessions |
| `CLAUDE_CODE_REMOTE_TOOLS_POLICY` | 🔍 | Picks the remote tools policy mode. Details are not clear from the bundle. | Unset or `parity` gives `parity`. Any other value gives `interim` | Sessions that serve tools to cloud sessions |
| `CLAUDE_CODE_REMOTE_TOOLS_SERVE` | 🔍 | Turns off serving local tools to cloud sessions when false. A bundle message says it turns the feature off. | Unset gives on. A true value gives on | Interactive sessions with a cloud link |
| `CLAUDE_CODE_REMOTE_TOOLS_SESSION_CHANNEL` | 🔍 | A false value turns off the session channel of the remote tools module. Details are not clear from the bundle. | On or off. Compared to the boolean `false` only | Sessions that serve tools to cloud sessions |
| `CLAUDE_CODE_REMOTE_TOOLS_SPECULATIVE_CLASSIFIER` | 🔍❌ | The check function always returns false, so this var and an internal flag have no effect. | Read, but both branches return false | All sessions |
| `CLAUDE_CODE_REPO_CHECKOUTS` | 🔍 | Maps repo names to local checkout paths for multi-repo sessions. File attribution uses the paths. | Text. A bad value logs `Failed to parse env map`. Pairs with `CLAUDE_CODE_BASE_REFS` | Sessions with several repos |
| `CLAUDE_CODE_SESSION_ORIGIN` | 🔍 | Marks a session that started from a claude.ai chat. Only the value `claude_ai_chat` is valid. | One of a fixed set of values. Enum with one value `claude_ai_chat`. Used in an origin check, in account context, and in the permission classifier input | Claude.ai chat sessions |
| `CLAUDE_CODE_SYSTEM_PROMPT_GB_FEATURE` | 🔍🧪 | Names a GrowthBook feature whose string value replaces the system prompt on each turn. An empty value keeps the normal prompt. | Text. Read only when `CLAUDE_CODE_REMOTE` is set. The feature name goes to a flag lookup | Remote sessions |
| `CLAUDE_CODE_TEE_SDK_STDOUT` | 🔍 | Sets the `teeStdout` option of the remote I/O transport. The effect of that option is not shown here. | On or off. Claude Code sets it to `1` for self-hosted runner children | Remote I/O and self-hosted runner |
| `CLAUDE_CODE_USE_CCR_V2` | 🔍 | Marks a child as a CCR v2 session. | On or off. Set by Claude Code to `1` in the environment of self-hosted runner children | Self-hosted runner |
| `CLAUDE_CODE_WEBFETCH_USE_CCR_PROXY` | 🔍 | Sends `WebFetch` through the CCR proxy when a CCR session is available. | On or off. Works only with the first-party provider | Cloud sessions, first-party |
| `CLAUDE_CODE_WEBSEARCH_USE_CCR_PROXY` | 🔍 | Sends `WebSearch` through the CCR proxy when a CCR session is available. | On or off. Works only with the first-party provider | Cloud sessions, first-party |
| `CLAUDE_CODE_WORKER_EPOCH` | 🔍 | Counts worker restarts. A value above `1` marks a restored worker, so tools are not announced again. | A number, `1` by default. Integer, default `1`. Also passed in the init data when the remote check is true | Remote workers |
| `CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX` | ✅ | Sets the prefix of auto-generated Remote Control session names. | - | - |
| `CLAUDE_REMOTE_TOOLS_BRIDGE_URL` | 🔍 | Overrides the URL of the device bridge for remote tools. | A URL | - |
| `CLAUDE_REMOTE_WORKFLOW_ARGS` | 🔍🧪 | Passes JSON arguments to the workflow script of a remote session. | - | - |
| `CLAUDE_REMOTE_WORKFLOW_SCRIPT` | 🔍🧪 | Holds the workflow script that a remote session runs through a fixed command. | - | - |
| `CLAUDE_RUNNER_ACTIVITY_FD` | 🔍 | Names an extra file descriptor that the remote IO layer writes to. | - | - |
| `CLAUDE_RUNNER_API_BASE_URL` | ✅ | Gives runner hooks the API base URL. The code-sign helper uses it as a last fallback. | A URL | - |
| `CLAUDE_RUNNER_CLIENT_PLATFORM` | ✅ | Tells hooks and the child session which client platform started the runner session. | - | - |
| `CLAUDE_RUNNER_DISABLE_AWAITING_ACTION_OVERRIDE` | 🔍 | Stops the runner from reporting `awaiting-action` when the child waits at a prompt after a turn ends. | - | - |
| `CLAUDE_RUNNER_FAIL_FAST_FETCH` | 🔍 | It is read as a truthy value in the runner git fetch code next to `Operation too slow` error handling. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | - | - |
| `CLAUDE_RUNNER_FETCH_DEPTH` | ✅ | Sets the `--depth` of the runner git fetch. | - | - |
| `CLAUDE_RUNNER_FETCH_SERVER_PROGRESS_CAP_MS` | ✅ | Sets a cap in ms for the server-progress wait of the runner git fetch. | A number of milliseconds | - |
| `CLAUDE_RUNNER_SESSION_ID` | ✅ | Gives lifecycle hooks the session ID. The code-sign helper reads it when `CLAUDE_CODE_REMOTE_SESSION_ID` is unset. | Text | - |
| `CLAUDE_RUNNER_SKIP_GIT_VERIFY` | ✅ | Skips the check for a `.git` directory after the checkout hook ends. For non-git source control. | - | - |
| `CLAUDE_RUNNER_STALL_GIVEUP` | 🔍 | It is read as a truthy value in the runner git fetch code next to `Operation too slow` error handling. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | - | - |
| `CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM` | 🔍 | Tells the runner to trust the prewarmed canonical checkout and skip its validation. | - | - |
| `CLAUDE_RUNNER_USE_GIT_PROXY` | ✅ | Turns on the Anthropic git proxy for the self-hosted runner. | - | - |
| `CLAUDE_SSH_DAEMON_CHILD` | 🔍 | A presence check in system prompt assembly. With `CLAUDE_SSH_RUN_DIR` it can skip an optional prompt section. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | - | - |
| `CLAUDE_SSH_LOCAL_BINARY` | 🔍❌ | In the schema, but nothing reads it. | - | - |
| `CLAUDE_SSH_RUN_DIR` | 🔍 | A presence check in system prompt assembly. With `CLAUDE_SSH_DAEMON_CHILD` it can skip an optional prompt section. A [Probes](Claude-Code-Probes) run saw no effect. | A path | - |
| `CLAUDE_SSH_VERSION` | 🔍❌ | In the schema, but nothing reads it. | - | - |
| `CLAUDE_STAGE_FILE_ROOT` | 🔍 | Sets the root directory for staged upload files in remote sessions. | - | - |
| `LOCAL_BRIDGE` | 🔍 | Points the bridge URL to `ws://localhost:8765`, like `USE_LOCAL_OAUTH`. | - | - |
| `SELF_HOSTED_RUNNER_BASE_DIR` | ✅🧪 | Sets the base directory for repository checkouts and per-session state. | Text. Flag `--base-dir`. Default is a POSIX container path | Self-hosted runner |
| `SELF_HOSTED_RUNNER_CLIENT_LABEL` | ✅🧪 | Sets the label sent at registration and shown beside the runner in the console. | Text, the by default. Trimmed string, default the hostname. Flag `--client-label` | Self-hosted runner |
| `SELF_HOSTED_RUNNER_CONFIGURE_GIT` | ✅🧪 | Writes a global git identity (`Claude <noreply@anthropic.com>`) and commit signing at runner start. | On or off. Flag `--configure-git` | Self-hosted runner |
| `SELF_HOSTED_RUNNER_CONFINE_REPO_SETTINGS` | ✅🧪 | Sets the guard mode for settings committed in the repo. | Text. An invalid value fails at startup. Flag `--confine-repo-settings` | Self-hosted runner |
| `SELF_HOSTED_RUNNER_DEBUG_DIR` | 🔍🧪 | Writes each work-order JWT, decoded JSON and hook stderr to files in this directory. | Text. Dev only, files are pruned after 5 min. Flag `--debug-dir` | Self-hosted runner orchestrator |
| `SELF_HOSTED_RUNNER_DEBUG_TOKEN_DIR` | ✅🧪 | Writes live tokens to disk for debugging. | Text. Debug only, not for production. Flag `--debug-token-dir` | Self-hosted runner |
| `SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS` | ✅🧪 | On the first SIGTERM, stops new work and waits up to this long before draining. | A number of milliseconds, 0 by default. The flag `--defer-shutdown-max-min` sets it | Self-hosted runner |
| `SELF_HOSTED_RUNNER_DRAIN_GRACE_MS` | ✅🧪 | Keeps the runner warm and polling this long after sessions end. | A number of milliseconds, 0 by default. Max 604800 s. The flag `--drain-grace-sec` sets it | Self-hosted runner |
| `SELF_HOSTED_RUNNER_DRAIN_MARKER_FILE` | ✅🧪 | Names a file whose presence at drain time reports the exit as a host drain. | Text, unset by default. Telemetry only. The first line may hold a Unix time | Self-hosted runner |
| `SELF_HOSTED_RUNNER_DRAIN_WAIT_MS` | ✅🧪 | On SIGTERM, waits up to this long for running turns and background tasks before stopping the session. | A number of milliseconds, 0 by default. Max 86400 s. The flag `--drain-wait-sec` sets it | Self-hosted runner |
| `SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET` | ✅🧪 | Gives the environment secret that the runner uses to authenticate. | Text. Trimmed string. The flag `--environment-secret-file` wins | Self-hosted runner |
| `SELF_HOSTED_RUNNER_EXEC_PATH` | ✅🧪 | Sets the binary that the runner spawns for child sessions. | Text. Default is the runner's own binary. Flag `--exec-path` | Self-hosted runner |
| `SELF_HOSTED_RUNNER_HEALTH_PORT` | ✅🧪 | Sets the port of the `/healthz` HTTP listener. | A number, 8080 by default. Integer from 0 to 65535, default 8080. `0` disables it | Self-hosted runner |
| `SELF_HOSTED_RUNNER_HOOKS_DIR` | ✅🧪 | Names the directory of lifecycle hook scripts (checkout, command, post-session). | Text. Missing hooks use built-in behavior. Flag `--hooks-dir` | Self-hosted runner |
| `SELF_HOSTED_RUNNER_HOST_CONFIG_DIR` | ✅🧪 | Names the host config directory that seeds each session's config dir. | Text. Falls back to `CLAUDE_CONFIG_DIR`, then `~/.claude`. An empty dir turns it off | Self-hosted runner |
| `SELF_HOSTED_RUNNER_HOST_CONFIG_SNAPSHOT` | ✅🧪 | Chooses where the startup snapshot of the host config is kept. | Text. Another value throws | Self-hosted runner |
| `SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS` | ✅🧪 | Exits the runner if it gets no work for this long. | A number of milliseconds, never by default. Max 10080 min. The flag `--exit-if-unused-min` sets it | Self-hosted runner |
| `SELF_HOSTED_RUNNER_LOCK_TO_ACCOUNT` | ✅🧪 | Locks the runner to one account id at registration. | Text. Flag `--lock-to-account`. Only that account's sessions are assigned | Self-hosted runner |
| `SELF_HOSTED_RUNNER_LOG_FILE` | ✅🧪 | Copies runner logs to a file in append mode. | Text. Flag `--log-file`. Stdout is unchanged | Self-hosted runner |
| `SELF_HOSTED_RUNNER_MAX_LIFETIME_MS` | ✅🧪 | Caps the wall-clock life of each session child. | A number of milliseconds, never by default. Max 10080 min. The flag `--kill-session-after-min` sets it | Self-hosted runner |
| `SELF_HOSTED_RUNNER_POOL_SECRET` | ✅🧪 | Deprecated alias of `SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET`. | Text. Used only if the new name is unset. Prints a deprecation warning | Self-hosted runner |
| `SELF_HOSTED_RUNNER_POST_SESSION_HOOK_TIMEOUT_MS` | ✅🧪 | Sets the SIGTERM budget of the post-session hook. | A number of milliseconds. Positive number in ms. Flag `--post-session-hook-timeout-sec` sets it | Self-hosted runner |
| `SELF_HOSTED_RUNNER_PUSH_OUTCOME_ON_RELEASE` | ✅🧪 | Pushes outcome branches to origin when the runner ends a session itself. | On or off. Flag `--push-outcome-on-release`. Adds 30 s to the shutdown budget | Self-hosted runner |
| `SELF_HOSTED_RUNNER_REMOVE_SESSION_STATE` | ✅🧪 | Deletes per-session state under the base dir when a session ends. | On or off, off by default. Another value throws. Flag `--remove-session-state` | Self-hosted runner |
| `SELF_HOSTED_RUNNER_RETIRE_AT` | ✅🧪 | Retires the runner at a Unix time, in seconds. | A number, never by default. Integer in seconds, valid from 1e9 to 1e11. Else ignored (0) | Self-hosted runner |
| `SELF_HOSTED_RUNNER_SERVER_AUTO_MODE_LISTS` | ✅🧪 | Chooses which server auto-mode classifier lists a session may receive. | Text. Another value stops the runner. Flag `--server-auto-mode-lists` | Self-hosted runner |
| `SESSION_INGRESS_URL` | 🔍🧪 | Sets the base URL of the session ingress for remote (CCR) sessions. It wins over `ANTHROPIC_BASE_URL`. | Text. Non-empty string. Reads as `SESSION_INGRESS_URL` first, else `ANTHROPIC_BASE_URL` | Remote sessions |
| `VITALS_EMITTER_BIN` | 🔍🧪 | Sets the path of the guest vitals emitter binary for remote sessions. | Must be an absolute path. Else the log says vitals are disabled | Remote sessions |

## Example

Claude Code sets most of these variables itself in a cloud session or a runner.
You rarely set them by hand.
To test the cloud code paths on your own machine, set the marker variable in the shell.

```sh
CLAUDE_CODE_REMOTE=true claude -p "Say hello"
```

`CLAUDE_CODE_REMOTE` marks the session as a cloud session.
It also raises the Node heap limit to 8192 MB.

## See Also

- [Environment Variables](Claude-Code-Env-Vars)
- [Probes](Claude-Code-Probes)
- [Settings](Claude-Code-Settings)
