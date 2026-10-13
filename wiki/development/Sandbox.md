# Sandbox

This page tells how to run Claude Code with the plugins of this checkout, in a config apart from your own.
It is for AI agents and for people.
Use it to see a hook, the status line, or an agent work in a real session before you release a change.

## Why a Sandbox

- `claude --plugin-dir plugins/dotclaude` in your own setup loads the checkout next to your installed dotclaude, your settings, and your sessions.
- A test there can change your settings files and write to your session history.
- The sandbox has its own `CLAUDE_CONFIG_DIR` and `HOME`.
  So a test changes only the sandbox.

## Commands

| Command | Config | Plugins loaded |
| --- | --- | --- |
| `just sandbox` | `dotclaude-sandbox` in the temp folder, kept until you clean it | Each folder of `plugins/` that has `.claude-plugin/plugin.json` |
| `just sandbox-alone PLUGIN` | `/tmp/dotclaude-sandbox-alone`, removed and made again on each run | Only `PLUGIN` |
| `just sandbox-install [PLUGIN...]` | `/tmp/dotclaude-sandbox-install`, removed and made again on each run | Each `PLUGIN`, or `dotclaude` when you give none, installed from this checkout |
| `just sandbox-installed [ARGS]` | `/tmp/dotclaude-sandbox-install`, kept | The plugins that `just sandbox-install` installed |
| `just sandbox-clean` | Removes the temp folder of `just sandbox` | None |

- Arguments after `just sandbox` or `just sandbox-alone PLUGIN` go to `claude`.
  For example, `just sandbox -p "prompt"` runs one headless turn and prints the reply.
- `just sandbox` runs `tools/sandbox/run.ts`.
  That script runs `plugins/dotclaude-lab/bin/dotclaude-sandbox`.
- `just sandbox-alone` runs the same bin two times.
  The first run removes the folder.
  The second run starts `claude` with `--plugin-dir PLUGIN` and your arguments.
- To test an add-on with no core plugin, run `just sandbox-alone plugins/dotclaude-docs`.
  You can also run `bun plugins/dotclaude-lab/bin/dotclaude-sandbox --plugin-dir plugins/dotclaude-docs` in its place.
- `just debug-agents` runs one headless session with a debug log.
  The command fails when the log names an unknown frontmatter field.

## Test an Install

`just sandbox` and `just sandbox-alone` load the plugin folders with `--plugin-dir`.
A user installs the plugins from the marketplace instead.
`just sandbox-install` tests that path before a release:

1. Run `just sandbox-install`, or name the plugins, such as `just sandbox-install dotclaude dotclaude-docs`.
   The script removes the folder, and it runs `claude plugin marketplace add` with this checkout.
   Then it runs `claude plugin install NAME@dotclaude` for each plugin, and it starts Claude Code.
2. In the session, run `/dotclaude:setup`, then `/exit`.
3. Run `just sandbox-installed` to start the session again with the settings of the setup.
   Add `--continue` to continue the last session.

- Claude Code reads each plugin of a local marketplace from its folder in the checkout.
  So after `just generate`, an edit takes effect at the next session start or at `/reload-plugins`.
  `claude plugin update` says that it has nothing to update.
- The install does not fetch from GitHub.
  That step runs only for a marketplace that a user adds from GitHub.

## Where the Sandbox Lives

The sandbox folder has three parts:

| Folder | Use |
| --- | --- |
| `config/` | The sandbox `CLAUDE_CONFIG_DIR`. |
| `project/` | An empty git repository. It is the working directory of `claude`. |
| `home/` | The `HOME` of `claude`. |

- The default folder is `dotclaude-sandbox` in the system temp folder.
  Use `--dir DIR` to choose another folder.
- The script creates `project/` only when it has no `.git` folder.
  It runs `git init` there.
- The script writes no `settings.json` to `config/`.
  Copy the keys that a test needs from the [settings snippet](Settings-Snippet) into `config/settings.json`.
  With no snippet, the sandbox runs with the defaults of Claude Code and the plugins that you load.
- The `--dir` option also works for `just start-run`.

## Setup

The script does these steps before it starts `claude`:

1. It creates the three folders, and it runs `git init` in `project/`.
2. It writes `config/.claude.json` with these keys:
   - `hasCompletedOnboarding: true`, and a `theme` when none is set.
     The TUI then does not show onboarding.
   - `projects.<dir>.hasTrustDialogAccepted: true`, so the TUI does not ask for trust.
     On macOS, `/tmp` and `/var` resolve to `/private`, and Claude Code uses the resolved path.
     The script sets both paths.
3. It removes the variables `ZDOTDIR` and `XDG_CONFIG_HOME` from the environment of `claude`.
   Your global git config does not apply in the sandbox.
   Inference: the git config lives in your real `HOME`, and `claude` gets the sandbox `HOME`.
4. It removes the variables of a parent Claude Code session from the environment.
   These are the variables such as `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT`.
   It also removes the variables with the prefixes `CLAUDE_CODE_SESSION_`, `CLAUDE_CODE_MESSAGING_`, and `CLAUDE_PLUGIN_`.
   It also removes each variable that has the same value as the `env` of your own settings.
   A value that you set on the command line for the sandbox stays.
5. It sets `CLAUDE_CONFIG_DIR` and `HOME` for `claude`.
   It runs `claude` in `project/`.

- The `gh` login of your machine does not apply in the sandbox.
  `gh` reads its config from `HOME`.
  So a policy test in [Contributions](Contributions) sees no login name.
- `gh` reads its token from the keychain with the real `HOME`.
  So a `gh api` call can fail in the sandbox.
  A failed `gh` call gives no owner.
  So the policy ask does not show, and the next check tries again.
- The script finds `claude` on `PATH` only.
  A shell function or an alias does not work.
  The native installer keeps each version at `~/.local/share/claude/versions/<version>`.
  This path holds for version `2.1.296` on macOS, as the native installer of that version left it.

### Managed Settings

On a machine whose managed `enabledPlugins` holds a plugin name, Claude Code ignores the `--plugin-dir` copy of that plugin.
The debug log then says "plugin is locked by managed settings".
Remove the managed entry, or test on a machine without it.

## Login

A new config directory has no login.
The script gives `claude` a token in its environment only.
It uses the first of these sources that holds a token:

1. `CLAUDE_CODE_OAUTH_TOKEN`, when you set it.
   `claude setup-token` makes a long-lived token.
2. Your own login token.
   On macOS, it is in the Keychain entry `Claude Code-credentials`.
   On other systems, it is in `~/.claude/.credentials.json`.
   The script reads `claudeAiOauth.accessToken` from the file.

- The script does not write the token to disk, and it does not print it.
- If it finds no token, it prints "No login token found".
  Then you run `/login` in the sandbox.
- Inference: a sandbox session uses your account, so its usage counts against your plan limits.

Rules for agents:

- Get the approval of the user before you use their login in a sandbox.
- Never put the token in a command line, a file, or your output.
  Command lines show in process lists and in the transcript.
  Give the token through the environment only, as the script does.
- A shell `echo` or `env` in the sandbox session shows the token.
  Do not run them there.

## Headless Tests

`-p` runs one turn and prints the reply.
Use it for hook behavior that the reply shows.

1. Put test files in `project/` first.
   For example, add a `pkg/CLAUDE.md` with a rule that the reply must show.
2. Run the prompt:

   ```bash
   just sandbox --model claude-sonnet-5-5 -p "Run cat pkg/a.ts and describe it."
   ```

3. Add `--debug-file <path>` to see which hooks ran and what they returned.

- The script warns when a `--model` value is not in `availableModels` of the sandbox `settings.json`.
  Claude Code gives no error for such a model.
  The session runs on another model.
- Put the prompt before variadic flags such as `--allowedTools`.
  A variadic flag takes all the arguments after it.
  Then `claude` finds no prompt.
- Add `--allowedTools 'Bash(cat:*)'` when the test needs a tool without a permission prompt.
- The binary of Claude Code 2.1.296 has the text "you haven't granted it yet".
  It shows that text for a tool that needs approval and has no grant.
  Inference: a headless run cannot answer a prompt, so each tool that `--allowedTools` does not list is denied.
- List each tool that the test needs before the run.
  For example, use `--allowedTools 'Bash' 'Write' 'Edit'`.

## TUI Tests in `tmux`

The status line, the agent panel, and dialogs show only in the TUI.
Run the TUI in a detached `tmux` session, and read the screen:

```bash
tmux new-session -d -s sandbox -x 150 -y 40 "just sandbox; sleep 60"
tmux send-keys -t sandbox -l 'your prompt'
tmux send-keys -t sandbox Enter
tmux capture-pane -p -t sandbox | tail -30
tmux kill-session -t sandbox
```

- Wait some seconds after the start and after each prompt.
  Then read the screen.
- Send the text with `-l`.
  Send `Enter` in a second command.
  If you do not, `tmux` can read words of the text as key names.
- Ask for an agent with `run_in_background` to see the agent panel.

## Capture Session

`just capture` is a proxy that writes each request body that passes through it.
Run a capture session to record the requests of an agent session and of its sandbox runs.

1. In a terminal, run `just capture`.
   It listens on port `8787` by default.
   It writes to `$TMPDIR/dotclaude-capture`.
2. In a second terminal, start the agent session with the proxy:

   ```bash
   ANTHROPIC_BASE_URL=http://127.0.0.1:8787 ENABLE_TOOL_SEARCH=true claude
   ```

3. `just sandbox` runs in that session.
   It inherits both variables.

- The proxy forwards to `--upstream URL`.
  Without that option, it forwards to `ANTHROPIC_BASE_URL`.
  Without that variable, it forwards to `https://api.anthropic.com`.
  It stops with an error when the upstream is its own address, because the requests would loop.
  This happens when you export `ANTHROPIC_BASE_URL` in the terminal of `just capture`.
- `ENABLE_TOOL_SEARCH=true` keeps tool search enabled.
  Claude Code disables it for a base URL that is not first-party.
- The proxy does not write request headers, because they hold the credential.

`just start-run` runs one clean sandbox session through the proxy.
Then it runs `just measure` on the transcript.
Send one prompt, then type `/exit`.

### Agent Sessions

- `just capture` listens on a local port.
  On macOS, an agent session with a sandbox can block that port.
  The fix is `sandbox.network.allowLocalBinding: true` in the settings of the session that runs the agent.
  The user sets that value.

## Status Line Commands

To test the status line script without a session, give it input on stdin.
The script is `plugins/dotclaude/bin/dotclaude-statusline`.
Read the fields of the input in the script, and in the status line docs of Claude Code, before you write the input.

```bash
echo '<input JSON>' | bun plugins/dotclaude/bin/dotclaude-statusline
```

To see the input that Claude Code gives to the status line, set a status line command in `config/settings.json`.
That command writes stdin to a file.
Then read that file.

## Clean Up

1. Stop each `tmux` session that you started.
2. Run `just sandbox-clean`.
   It removes the whole `dotclaude-sandbox` folder.
   That folder holds `config/`, `project/`, `home/`, and the `.dotclaude-sandbox` marker.
3. For `just sandbox-alone`, run `just sandbox-alone PLUGIN` again.
   Or remove `/tmp/dotclaude-sandbox-alone` with `bun plugins/dotclaude-lab/bin/dotclaude-sandbox --dir /tmp/dotclaude-sandbox-alone --clean`.
   The setup writes the marker into each folder that it makes.
   `--clean` of a folder other than the default one refuses a folder without the marker.
   A folder that an older sandbox made has no marker, so remove it by hand.
4. For `just sandbox-install`, run `bun plugins/dotclaude-lab/bin/dotclaude-sandbox --dir /tmp/dotclaude-sandbox-install --clean`.

A sandbox session also writes into your checkout.
Claude Code writes `.claude-plugin/types/` and a `tsconfig.json` into each plugin folder that it loads, and git ignores them.
See [Types](Development#types).

The sandbox of `just sandbox` keeps its sessions and settings until you remove it.
That lets you continue a test.
But an old sandbox can hide a first-run problem.
`just sandbox-alone` starts from an empty folder on each run.
So it shows a first-run problem.

## Troubleshooting

The symptoms of the sandbox and their fixes are on [Troubleshooting](Troubleshooting).

## Related Pages

- [Development](Development) lists the repository commands.
- [Hook Events](Hook-Events) describes how to test a hook.
  [Lab](Lab) lists the bins of this page.
- [Guards](Guards) tells how to read guard asks and denies.
