# Claude Code Sandbox

The sandbox runs `Bash` commands inside a wall that the operating system enforces.
It limits which files a command can write and which hosts it can reach, even when a permission rule allows the command.
For example, `{ "sandbox": { "enabled": true } }` turns it on.
The marks are explained on [Permissions and Sandbox](Claude-Code-Permissions-And-Sandbox).

## Core Keys

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `sandbox.enabled` | Runs `Bash` in the sandbox | Default `false`. Without dependencies, a warning shows and commands run unsandboxed | Each scope | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes), [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing) |
| ✅ | `sandbox.failIfUnavailable` | Exit at startup if the sandbox cannot start | Default `false`. For managed hard gates | Each scope | [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sandbox.autoAllowBashIfSandboxed` | Auto-allows sandboxed commands | Reason text `Auto-allowed with sandbox`. Default `true` per the `filesystem.disabled` text | Each scope | [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sandbox.allowUnsandboxedCommands` | Lets a call use `dangerouslyDisableSandbox` | Default `true`. When `false`, the parameter is ignored. A `false` from managed, `--settings`, or user settings holds | Each scope | [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sandbox.excludedCommands` | Patterns that run outside the sandbox | `Bash` rule syntax. A convenience, not a boundary: the permission flow still applies. Only managed, `--settings`, and user entries count | Merged | [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sandbox.ignoreViolations` | Map of command patterns (`*` for all) to paths whose violations are not reported | Merged across scopes | Each scope | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sandbox.enableWeakerNestedSandbox` | Linux: no fresh `/proc` mount | For hosts like unprivileged Docker. Reduces security. Default `false` | Each scope | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Configure Server-managed Settings](https://code.claude.com/docs/en/server-managed-settings) |
| ✅ | `sandbox.enableWeakerNetworkIsolation` | macOS: allow `com.apple.trustd.agent` | For Go tools with a MITM proxy. Reduces security. Default `false` | Each scope | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Configure Server-managed Settings](https://code.claude.com/docs/en/server-managed-settings) |
| ✅ | `sandbox.allowAppleEvents` | macOS: allow Apple Events | Needed for `open` and `osascript`. Removes code-execution isolation. Default `false` | User, managed, `--settings` | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Configure Server-managed Settings](https://code.claude.com/docs/en/server-managed-settings) |
| 🔍 | `sandbox.ripgrep.command`, `sandbox.ripgrep.args` | Custom `rg` for bundled ripgrep support | Strings | User, managed, `--settings` | schema |
| ✅ | `sandbox.bwrapPath` | Linux and WSL: path to `bwrap` | Absolute path. Overrides `PATH` detection | Managed only | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Deploy Managed Settings](https://code.claude.com/docs/en/managed-settings) |
| ✅ | `sandbox.socatPath` | Linux and WSL: path to `socat` | Absolute path | Managed only | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Deploy Managed Settings](https://code.claude.com/docs/en/managed-settings) |

## Network Keys

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `sandbox.network.allowedDomains` | Domains reachable without a prompt | Wildcards like `*.example.com`. Merged with `WebFetch(domain:...)` allow rules | Merged | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Deploy Managed Settings](https://code.claude.com/docs/en/managed-settings) |
| ✅ | `sandbox.network.deniedDomains` | Domains always blocked | Wins over `allowedDomains`. Merged from all scopes | Merged | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sandbox.network.allowManagedDomainsOnly` | Only managed domains count | Denied domains still come from all scopes | Managed only | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Deploy Managed Settings](https://code.claude.com/docs/en/managed-settings) |
| ✅ | `sandbox.network.strictAllowlist` | Deny hosts not in `allowedDomains` without a prompt | Not for in-process tools like `WebFetch`. `WebFetch` rules leave the allowlist | User, managed, `--settings` | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Deploy Managed Settings](https://code.claude.com/docs/en/managed-settings) |
| ✅ | `sandbox.network.allowUnixSockets` | macOS: socket paths to allow | Ignored on Linux | Merged | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Configure Server-managed Settings](https://code.claude.com/docs/en/server-managed-settings) |
| ✅ | `sandbox.network.allowAllUnixSockets` | Allow all Unix sockets | Both platforms | Each scope | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Configure Server-managed Settings](https://code.claude.com/docs/en/server-managed-settings) |
| ✅ | `sandbox.network.allowLocalBinding` | macOS: bind to localhost ports | Boolean | Each scope | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sandbox.network.allowMachLookup` | macOS: extra XPC or Mach names | Trailing `*` prefix match. For iOS Simulator or Playwright | Merged | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Configure Server-managed Settings](https://code.claude.com/docs/en/server-managed-settings) |
| ✅ | `sandbox.network.httpProxyPort`, `sandbox.network.socksProxyPort` | Use your own proxy | Local TCP port | Each scope | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Configure Server-managed Settings](https://code.claude.com/docs/en/server-managed-settings) |
| 🧪 | `sandbox.network.tlsTerminate.caCertPath`, `.caKeyPath` | Experimental TLS termination | Lets the filter see HTTPS bodies. Omit both for an ephemeral CA. Gate: marked `[EXPERIMENTAL]` | User, managed, `--settings` | schema |

## Filesystem Keys

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `sandbox.filesystem.allowWrite` | Extra writable paths | Repo-committed entries are limited to trusted tiers | Merged | [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sandbox.filesystem.denyWrite` | Paths denied for writes | - | Merged | [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sandbox.filesystem.denyRead` | Paths denied for reads | - | Merged | [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sandbox.filesystem.allowRead` | Re-allows reads inside `denyRead` | Wins over `denyRead` | Merged | [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sandbox.filesystem.allowManagedReadPathsOnly` | Only managed `allowRead` paths | Boolean | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Deploy Managed Settings](https://code.claude.com/docs/en/managed-settings) |
| ✅ | `sandbox.filesystem.disabled` | Skip filesystem isolation | macOS and Linux and WSL only. Network and seccomp stay. Ignored on native Windows. Pinned to managed when managed sets filesystem rules | User, managed, `--settings` | [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |

## Credential Keys

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `sandbox.credentials.files[]` | Protects credential files or directories | Fields `path`, `mode` (`deny` or `mask`), `extract`, `onExtractNoMatch` (`warn`, `deny`, `error`), `decode` (`jwt`), `maskClaims`, `maskDuplicates`, `injectHosts`. | Merged | [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sandbox.credentials.envVars[]` | Protects environment variables | Fields `name`, `mode`, `extract`, `onExtractNoMatch`, `decode`, `maskClaims`, `injectHosts`. `extract` and `decode` cannot combine | Merged | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sandbox.credentials.allowPlaintextInject` | Sentinel swap on the plain HTTP path | Default `false` | User, managed, `--settings` | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sandbox.credentials.awsPairs` | Groups masked env vars into AWS pairs for SigV4 re-signing | The standard AWS trio pairs by itself | User, managed, `--settings` | [Settings Reference](https://code.claude.com/docs/en/settings-reference), [Deploy Managed Settings](https://code.claude.com/docs/en/managed-settings) |
| ✅ | `sandbox.credentials.sigv4` | Policy for SigV4 shapes the proxy cannot re-sign | `deny` (default) or `passthrough` | User, managed, `--settings` | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |

## Environment Variables

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| 🔍 | `CLAUDE_CODE_BASH_SANDBOX_SHOW_INDICATOR` | Shows `SandboxedBash` as the tool name | Truthy value, for sandboxed calls | Env | bundle |
| 🔍 | `IS_SANDBOX` | Marks a host that is already a sandbox | Skips the sandbox gate when truthy | Env | bundle |
| 🔍 | `CLAUDE_CODE_SANDBOXED` | Treats the folder as trusted | Skips the trust dialog check | Env | bundle |
| 🔍 | `CLAUDE_CODE_SANDBOX_LEAVE_PARENT_FOLDERS_ALONE` | Windows: skip the parent-folder grants | Boolean | Env | bundle |
| 🔍 | `CLAUDE_CODE_SANDBOX_LEAVE_DENIES_TO_SRT_WIN` | Windows: leave the deny lists to `sandbox-runtime` | Boolean | Env | bundle |

## Other Behavior

- The `Bash` tool takes `dangerouslyDisableSandbox: true`.
  The prompt tells the model to use it only after a violation that blocks the task.
  Source: bundle prompt text.
- A call with `allowed_domains` goes to the auto mode classifier.
  Allow rules do not approve the hosts.
  Source: bundle text.
- The sandbox creates 0-byte placeholder files such as `.mcp.json` in missing places.
  Source: bundle prompt text.
- Linux ignores glob patterns in `Edit` and `Read` rules for the sandbox, with a warning.
  Source: bundle text.

## See Also

- [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing) is the docs page.
- [Rules](Claude-Code-Permissions-And-Sandbox-Rules) explains how rules and the sandbox work together.
