# Sandbox

The sandbox runs Claude Code with the plugins of this checkout in a config apart from your own.
Use it to see a hook or the status line work in a real session before a release.
A test there changes only the sandbox, not your settings or your session history.

## Commands

| Command | Config | Plugins loaded |
| --- | --- | --- |
| `just sandbox` | `claudetto-sandbox` in the temp folder, kept until you clean it | Each folder of `plugins/` with a `.claude-plugin/plugin.json` |
| `just sandbox-alone PLUGIN` | `/tmp/claudetto-sandbox-alone`, made again on each run | Only `PLUGIN` |
| `just sandbox-install [PLUGIN...]` | `/tmp/claudetto-sandbox-install`, made again on each run | Each `PLUGIN` (or `claudetto`), installed from this checkout |
| `just sandbox-installed [ARGS]` | `/tmp/claudetto-sandbox-install`, kept | The plugins that `just sandbox-install` installed |
| `just sandbox-linux` | A container | See [Sandbox Linux](Sandbox-Linux) |
| `just sandbox-clean` | Removes the temp folder of `just sandbox` | None |

- Arguments after `just sandbox` or `just sandbox-alone PLUGIN` go to `claude`.
  For example, `just sandbox -p "prompt"` runs one headless turn.
- `just sandbox` runs `tools/sandbox/run.ts`, which runs `tools/sandbox/main.ts` with a `--plugin-dir` for each plugin.
- To test an add-on with no core plugin, run `just sandbox-alone plugins/claudetto-docs`.
- `just debug-agents` runs one headless session with a debug log.
  It fails when the log names an unknown frontmatter field.

Running `claude --plugin-dir plugins/claudetto` in your own setup is worse.
It loads the checkout next to your installed `claudetto`, your settings, and your sessions.

## Test an Install

`just sandbox` loads plugin folders with `--plugin-dir`, but a user installs from the marketplace.
Test that path before a release:

1. Run `just sandbox-install`, or name plugins, such as `just sandbox-install claudetto claudetto-docs`.
   The script runs `claude plugin marketplace add` with this checkout, then `claude plugin install NAME@claudetto` for each plugin, then starts Claude Code.
2. In the session, run `/claudetto:setup`, then `/exit`.
3. Run `just sandbox-installed` to start again with the settings of the setup.
   Add `--continue` to continue the last session.

Claude Code reads each plugin of a local marketplace from its folder in the checkout.
So an edit takes effect at the next session start or at `/reload-plugins`.
`claude plugin update` says there is nothing to update, and nothing is fetched from GitHub.

## Where the Sandbox Lives

| Folder | Use |
| --- | --- |
| `config/` | The sandbox `CLAUDE_CONFIG_DIR` |
| `project/` | An empty git repository, the working directory of `claude` |
| `home/` | The `HOME` of `claude` |

- The default folder is `claudetto-sandbox` in the system temp folder.
  Use `--dir DIR` to choose another one.
- The script runs `git init` in `project/` only when it has no `.git` folder.
- The script writes no `settings.json` to `config/`.
  Copy the keys a test needs from the [settings snippet](Settings-Snippet).
  With none, the sandbox runs with the defaults of Claude Code and your loaded plugins.

## What the Script Does

1. Creates the three folders and runs `git init` in `project/`.
2. Writes `config/.claude.json` with `hasCompletedOnboarding: true`, a `theme` when none is set, and `projects.<dir>.hasTrustDialogAccepted: true`.
   On macOS, `/tmp` and `/var` resolve to `/private`, so the script sets both paths.
3. Removes `ZDOTDIR` and `XDG_CONFIG_HOME` from the environment of `claude`.
4. Removes the variables of a parent Claude Code session: `CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT`, and the prefixes `CLAUDE_CODE_SESSION_`, `CLAUDE_CODE_MESSAGING_`, and `CLAUDE_PLUGIN_`.
   It also removes each variable with the same value as the `env` of your own settings.
   A value you set on the command line for the sandbox stays.
5. Sets `CLAUDE_CONFIG_DIR` and `HOME`, and runs `claude` in `project/`.

Known limits:

- `gh` reads its token with the real `HOME`, so a `gh api` call can fail in the sandbox.
- The script finds `claude` on `PATH` only, not a shell function or alias.
- When a managed `enabledPlugins` holds a plugin name, Claude Code ignores the `--plugin-dir` copy.
  The debug log says "plugin is locked by managed settings".
  Remove the managed entry, or test on another machine.

## Login

A new config directory has no login.
The script gives `claude` a token in its environment only, from the first of these sources:

1. `CLAUDE_CODE_OAUTH_TOKEN`, when you set it (`claude setup-token` makes a long-lived token).
2. Your own login token, in the Keychain entry `Claude Code-credentials` on macOS or in `~/.claude/.credentials.json` elsewhere.

The script does not write the token to disk or print it.
If it finds none, it prints "No login token found. Run /login inside the sandbox."
A sandbox session uses your account, so its usage counts against your plan limits.

Rules for agents:

- Ask the user before each new paid run, unless a repository rule already gives approval.
- Never put the token in a command line, a file, or your output.
- Do not run `echo` or `env` in the sandbox session, because they show the token.

## Related Pages

- [Sandbox Sessions](Sandbox-Sessions)
- [Sandbox Linux](Sandbox-Linux)
- [Development](Development)
- [Lab](Lab)
