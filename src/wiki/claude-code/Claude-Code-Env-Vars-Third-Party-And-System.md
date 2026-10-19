# Claude Code Environment Variables: Third-Party and System

Claude Code `2.1.303` reads 136 environment variables that the system or another project owns, such as `HOME` and `ALL_PROXY`.
Claude Code reads them and does not define them.
Another 130 names are read only by libraries inside the program, and they have their own table.
An environment variable is a named setting that you put in your shell or in the `env` key of `settings.json`.

The list is in 4 parts: parts 1 and 2 hold the 136 variables, and parts 3 and 4 hold the 130 names that bundled libraries read.
This page lists the 68 rows from `AGENT_NAME` to `HEX_CACERTS_PATH`.

## Example

Run `export ALL_PROXY=http://proxy.example:8080` before `claude` to send `git` traffic through a proxy.
Or put `{ "env": { "ALL_PROXY": "http://proxy.example:8080" } }` in `~/.claude/settings.json`.

## Variables

The marks are explained on the [index](Claude-Code-Env-Vars#marks).

| Name | Mark | What It Does | Value | Where It Works |
| --- | --- | --- | --- | --- |
| `AGENT_NAME` | 🔍 | Confirms an Azure Pipelines agent for the terminal color level. | Text. Presence test together with `TF_BUILD` | All sessions |
| `ALACRITTY_LOG` | 🔍 | Terminal detection. A set value counts as an Alacritty terminal in a terminal-feature check and rules out a plain VTE terminal. | On or off. Truthy test only. Read from the env object and from the `env` of the terminal detector | Terminal UI rendering, all. Not set from project `env` before trust |
| `ALACRITTY_WINDOW_ID` | 🔍 | Terminal detection. A set value rules out a plain `vte-based` or `gnome-terminal` guess, because Alacritty sets it. | On or off. Truthy test only, in the terminal detector | Terminal UI rendering, all. Not set from project `env` before trust |
| `ALLUSERSPROFILE` | 🔍 | Windows path variable. It is the last fallback for the `ProgramData` folder when Claude Code builds the Windows Start Menu path. | Text. Order is `ProgramData`, then `PROGRAMDATA`, then `ALLUSERSPROFILE`. Also in a list of Windows path names | Windows. Not set from project `env` before trust |
| `ALL_PROXY` | ✅ | Standard proxy variable. Claude Code passes it to `git` as `http.proxy` and `remote.origin.proxy` when it runs `git` commands. | Text. Read after `HTTPS_PROXY` and `https_proxy`, with the lowercase `all_proxy` as the last fallback | Git helper commands, all. Not set from project `env` before trust |
| `ANDROID_HOME` | 🔍 | Environment detection. If the path exists, Claude Code records `android-sdk` in the detected build tools. | Text. Read first, with `ANDROID_SDK_ROOT` as the fallback. Only the path check matters | Environment report, all. Not set from project `env` before trust |
| `ANDROID_SDK_ROOT` | 🔍 | Environment detection. It is the fallback for `ANDROID_HOME`. If the path exists, Claude Code records `android-sdk` in the detected build tools. | Text. Read only when `ANDROID_HOME` is unset | Environment report, all. Not set from project `env` before trust |
| `APPDATA` | ✅ | Windows path variable. Claude Code uses it for the `gcloud` config folder, the Alacritty config path, and a Windows path list. | Text. Used on Windows only for `gcloud` and Alacritty paths | Windows. Not set from project `env` before trust |
| `APPVEYOR` | 🔍 | Names AppVeyor for the terminal color level. | Presence test, only when `CI` is set. Gives color level 1 | All sessions |
| `AWS_CA_BUNDLE` | 🔍 | It is in the schema and listed with other CA bundle vars in help text and lists. Purpose unknown. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text | Not set from project `env` before trust |
| `AWS_EXECUTION_ENV` | 🔍 | Names the AWS runtime. Claude Code uses it to detect `aws-fargate` and `aws-ecs` as the deployment environment. The AWS SDK adds it to its user agent. | Compared with `AWS_ECS_FARGATE` and `AWS_ECS_EC2` | All (deployment detection) and AWS SDK calls |
| `AWS_LAMBDA_FUNCTION_NAME` | 🔍 | Marks an AWS Lambda host. Claude Code reports `aws-lambda` as the deployment environment when it is set. | Text. Any non-empty value. The AWS SDK also reads it for trace headers | All (deployment detection) |
| `AWS_PAGER` | 🔍 | Sets the pager of the AWS CLI. Claude Code lists it among env names that can run a program, for safety checks. | Text. No direct read | Settings `env` and Bash safety checks |
| `AZURE_AUTH_LOCATION` | 🔍 | Names an Azure auth file path. Claude Code lists it among credential file names to protect. | Text. No direct read | Settings `env` and sandbox credential lists |
| `AZURE_CONFIG_DIR` | 🔍 | Sets the Azure CLI config folder. Claude Code treats it as a credential path to protect, default `~/.azure`. | Text | Sandbox credential deny paths |
| `AZURE_FUNCTIONS_ENVIRONMENT` | 🔍 | Marks an Azure Functions host. Claude Code reports `azure-functions` as the deployment environment when it is set. | Any non-empty value | All (deployment detection) |
| `BASH_ENV` | ✅ | Names the startup file that bash reads. Claude Code treats it as an unsafe inlet and flags it in settings and plugin env. | Claude Code never reads it for its own use | Settings `env`, plugin env, sandbox checks |
| `BAT_THEME` | 🔍 | Is the color theme variable of the `bat` tool.  No property read of this name was found. No visible effect in a print-mode probe ([Probes](Claude-Code-Probes)). | Text | Unknown |
| `BROWSER` | ✅ | Names the command that opens URLs. Claude Code uses it before `open` on macOS, and the `browser` setting wins over it. | Text. The `browser` setting wins over it. On Linux with no display the open step fails with `no_display` | All sessions |
| `BUILDKITE` | 🔍 | Marks a Buildkite CI run. Claude Code uses it for CI detection, deployment detection, and color depth hints. | Text. Any non-empty value counts | All sessions |
| `C9_PID` | 🔍 | Marks an AWS Cloud9 workspace. Claude Code reports `aws-cloud9` as the environment when it is set. | Any non-empty value. Read directly in deployment detection | All (deployment detection) |
| `C9_USER` | 🔍 | Marks an AWS Cloud9 workspace. Claude Code reports `aws-cloud9` as the environment when it is set. | Any non-empty value. Read directly in deployment detection | All (deployment detection) |
| `CDPATH` | 🔍 | Is the shell `cd` search path. Claude Code blanks it in `cd` helper commands and treats it as an unsafe env name to override. | Text | Bash tool, Git and settings `env` checks |
| `CF_PAGES` | 🔍 | Marks Cloudflare Pages. Claude Code reports `cloudflare-pages` as the deployment environment and counts it as a CI signal. | On or off. Truthy value check | All (deployment detection) |
| `CI` | ✅ | Marks a CI run for the terminal color level. | Presence test (`"CI" in env`), any value counts. A CI vendor variable then picks the level | All sessions |
| `CIRCLECI` | 🔍 | Marks a CircleCI run. Claude Code uses it for CI detection, deployment detection, and terminal color depth. | Text. Presence counts | All sessions |
| `CI_NAME` | 🔍 | Names the CI vendor. Claude Code checks for `codeship` when it picks the terminal color depth. | Text. Only the value `codeship` matters | Terminal color detection (all) |
| `CLAUDE_CODE_SLACK_TAG_TOKEN` | 🔍 | The name is only in a list of env names that sit next to credential names. Nothing reads it, and a [Probes](Claude-Code-Probes) run saw no effect. | Text | Unknown |
| `CODER` | 🔍 | Marks a Coder workspace. The environment detector records deployment `coder`. | - | - |
| `CODER_WORKSPACE_NAME` | 🔍 | Marks a Coder workspace by name. The environment detector records deployment `coder`. | Text | - |
| `CODESPACES` | 🔍 | Marks GitHub Codespaces. The environment detector records deployment `codespaces`. | - | - |
| `COLORTERM` | 🔍 | Reports terminal color support. `truecolor` or `24bit` means 24-bit color. | - | - |
| `COLUMNS` | ✅ | Gives hook commands the terminal width. | - | - |
| `COMPUTERNAME` | 🔍 | The Windows host name. Claude Code uses it as the device name. | - | - |
| `COMSPEC` | 🔍 | The Windows command interpreter path. Claude Code uses it as a shell path fallback in environment info. | - | - |
| `CONTAINER_SANDBOX_MOUNT_POINT` | 🔍 | Marks a Windows container. The check turns off the registry sweep. | - | - |
| `COREPACK_ENABLE_AUTO_PIN` | 🔍 | Set to `0` at startup so that `corepack` does not edit `package.json`. | - | - |
| `CURSOR_TRACE_ID` | 🔍 | Marks the Cursor editor. Claude Code uses it to name the terminal host. | Text | - |
| `ComSpec` | ✅ | The Windows command interpreter path. The terminal opener uses it for the Command Prompt entry. | - | - |
| `ConEmuANSI` | 🔍 | Marks ConEmu. Any of the three `ConEmu` vars turns on terminal progress reporting. | - | - |
| `ConEmuPID` | 🔍 | Marks ConEmu. Any of the three `ConEmu` vars turns on terminal progress reporting. | - | - |
| `ConEmuTask` | 🔍 | Marks ConEmu. The value `{cmd::Cmder}` also selects Unicode symbols. | - | - |
| `DAYTONA_WS_ID` | 🔍 | Marks a Daytona workspace. The environment detector records deployment `daytona`. | Text | - |
| `DENO_DEPLOYMENT_ID` | 🔍 | Marks Deno Deploy. The environment detector records deployment `deno-deploy`. | Text | - |
| `DEVPOD` | 🔍 | Marks a DevPod workspace. The environment detector records deployment `devpod`. | - | - |
| `DEVPOD_WORKSPACE_UID` | 🔍 | Marks a DevPod workspace by ID. The environment detector records deployment `devpod`. | - | - |
| `DISPLAY` | 🔍 | Tells Claude Code if a local display exists on Linux. With no `DISPLAY` and no `WAYLAND_DISPLAY`, it treats the browser open as not possible. | Text. Matched against `:N` or `unix:N` forms | Linux. Not set from project `env` before trust |
| `DRONE` | 🔍 | Names Drone CI for the terminal color level. | Presence test, only when `CI` is set. Gives color level 1 | All sessions |
| `DYNO` | 🔍 | Heroku sets it. Environment detection reports the deployment platform as `heroku` when it is non-empty. | Any non-empty value counts | All sessions. Environment detection only |
| `EDITOR` | ✅ | Names the editor that Claude Code opens for files, for example for `/memory`. `VISUAL` wins over it, and the fallback is the first of `code`, `vi`, `nano` found. | Text. Also sent in environment detection as the editor value | Interactive. Not set from project `env` before trust |
| `FLY_APP_NAME` | 🔍 | Fly.io sets it. Environment detection reports the platform as `fly.io` when it is non-empty. | Text | All sessions. Environment detection only |
| `FLY_MACHINE_ID` | 🔍 | Fly.io sets it. Environment detection reports the platform as `fly.io` when it is non-empty. | Text | All sessions. Environment detection only |
| `FORCE_COLOR` | ✅ | Forces the color depth. The Bun runtime maps `""`, `1`, `true` to 16 colors and `2` to 256 colors. | Text. Untrimmed string | All sessions. Not set from project `env` before trust |
| `GH_CONFIG_DIR` | 🔍 | Names the `gh` config directory. Claude Code checks it for `hosts.yml` or `config.yml` to see if `gh` has a login. | Text. Falls back to `XDG_CONFIG_HOME/gh`, then `~/.config/gh`. Also used in a secrets scan | GitHub features. Not set from project `env` before trust |
| `GH_HOST` | ✅ | Names the GitHub host. It picks the enterprise token and is passed to the `gh` stand-in shim. | Text | GitHub features. Not set from project `env` before trust |
| `GH_REPO` | 🔍 | Names the repository for `gh`. Claude Code passes it to the `gh` shim, which uses a host in it to choose the route. | Text | GitHub features. Not set from project `env` before trust |
| `GITEA_ACTIONS` | 🔍 | Names Gitea Actions for the terminal color level. | Presence test, only when `CI` is set. Gives color level 3 in one helper | All sessions |
| `GITHUB_ACTIONS` | 🔍 | Marks a GitHub Actions run. It adds run metadata to telemetry and turns on the subprocess env scrub unless that scrub is set off. | On or off. Truthy parse. `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` set to `0`, `false`, `no`, or `off` turns the scrub off | GitHub Actions. Not set from project `env` before trust |
| `GITHUB_ACTION_PATH` | 🔍 | Path of the running action. Claude Code protects it in the scrub path list and logs the `claude-code-action` ref. | A path | GitHub Actions. Not set from project `env` before trust |
| `GITHUB_ACTOR` | 🔍 | Gives a user label for a cache diagnostic. It falls back to `USER`, `USERNAME`, then the git email name. | Text. The label drops chars outside `a-zA-Z0-9._-` and is cut to 64 chars. Telemetry also reads it in Actions | GitHub Actions. Not set from project `env` before trust |
| `GITHUB_ENV` | 🔍 | Path of the runner env file. Claude Code adds it to the protected path list of the subprocess scrub. | Resolved to a path | GitHub Actions. Not set from project `env` before trust |
| `GITHUB_EVENT_PATH` | 🔍 | Path of the event payload file. Claude Code adds it to the protected path list of the subprocess scrub. | A path | GitHub Actions. Not set from project `env` before trust |
| `GITHUB_WORKSPACE` | 🔍 | Path of the workspace. If it differs from the cwd, Claude Code protects its `.git` hooks and config in the scrub path list. | - | GitHub Actions. Not set from project `env` before trust |
| `GITLAB_CI` | 🔍 | GitLab CI marker. It appears in CI vendor lists of the Bun runtime and the color support code. | Text. Use is by name in lists. No direct Claude Code read was seen | GitLab CI. Not set from project `env` before trust |
| `GITPOD_WORKSPACE_ID` | 🔍 | Gitpod sets it. Environment detection reports the deployment as `gitpod` when it is non-empty. | Text | All sessions. Environment detection only |
| `GNOME_TERMINAL_SERVICE` | 🔍 | Terminal marker for GNOME Terminal. Environment detection records if it is set. | Presence only | Terminal detection |
| `GOOGLE_CLOUD_WORKSTATIONS` | 🔍 | Marks Google Cloud Workstations. Environment detection reports `gcp-cloud-workstations` when it is set. | Presence check | All sessions. Environment detection only |
| `HEX_CACERTS_PATH` | 🔍 | It is named in a list of CA bundle env vars of other tools, such as Hex. Nothing reads it, and a [Probes](Claude-Code-Probes) run saw no effect. | Text. Seen in a CA diagnosis text and a list only | Unknown |

## See Also

- [Part 2](Claude-Code-Env-Vars-Third-Party-And-System-2)
- [Part 3](Claude-Code-Env-Vars-Third-Party-And-System-3)
- [Part 4](Claude-Code-Env-Vars-Third-Party-And-System-4)
- [Environment Variables](Claude-Code-Env-Vars)
- [Probes](Claude-Code-Probes)
- [Settings](Claude-Code-Settings)
