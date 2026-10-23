# Sandbox Sessions

A sandbox session can run headless, in a `tmux` TUI, or behind a capture proxy.
This page shows each way and how to clean up.
Read [Sandbox](Sandbox) first.

## Headless Tests

`-p` runs one turn and prints the reply.
Use it for hook behavior that the reply shows.

1. Put test files in `project/` first, such as a `pkg/CLAUDE.md` with a rule the reply must show.
2. Run the prompt:

   ```bash
   just sandbox --model claude-sonnet-5-5 -p "Run cat pkg/a.ts and describe it."
   ```

3. Add `--debug-file <path>` to see which hooks ran and what they returned.

- The script warns when a `--model` value is not in `availableModels` of the sandbox `settings.json`.
  Claude Code gives no error, and the session runs on another model.
- Put the prompt before variadic flags such as `--allowedTools`.
  A variadic flag takes all later arguments, and then `claude` finds no prompt.
- A headless run cannot answer a permission prompt.
  List each tool the test needs, such as `--allowedTools 'Bash' 'Write' 'Edit'`.
  An unlisted tool is denied.

## TUI Tests in `tmux`

The status line and dialogs show only in the TUI.
Run it in a detached `tmux` session and read the screen:

```bash
tmux new-session -d -s sandbox -x 150 -y 40 "just sandbox; sleep 60"
tmux send-keys -t sandbox -l 'your prompt'
tmux send-keys -t sandbox Enter
tmux capture-pane -p -t sandbox | tail -30
tmux kill-session -t sandbox
```

- Wait some seconds after the start and after each prompt, then read the screen.
- Send the text with `-l` and `Enter` in a second command.
  Otherwise `tmux` can read words of the text as key names.

## Capture Session

`just capture` runs `tools/capture/main.ts`, a proxy that writes each request body.
Use it to size each part of the first request of a session.

1. In a terminal, run `just capture`.
   It listens on port `8787` and writes to `claudetto-capture` in `$TMPDIR`.
   The options are `--port N`, `--out DIR`, `--upstream URL`, and `--no-count`.
2. In a second terminal, start the session with the proxy:

   ```bash
   ANTHROPIC_BASE_URL=http://127.0.0.1:8787 ENABLE_TOOL_SEARCH=true claude
   ```

- The proxy forwards to `--upstream URL`, else to `ANTHROPIC_BASE_URL`, else to `https://api.anthropic.com`.
  It stops with an error when the upstream is its own address, because the requests would loop.
  This happens when you export `ANTHROPIC_BASE_URL` in the terminal of `just capture`.
- `ENABLE_TOOL_SEARCH=true` keeps tool search on, because Claude Code turns it off for a base URL that is not first-party.
- The proxy does not write request headers, because they hold the credential.
- A session with a sandbox can block the local port.
  The user sets `sandbox.network.allowLocalBinding: true` in the settings of the session that runs the proxy.

## Status Line Commands

To test the status line script without a session, give it input on stdin:

```bash
echo '<input JSON>' | bun plugins/claudetto/bin/claudetto-statusline
```

Read the input fields in the status line docs of Claude Code and in the script.
To see the real input, set a status line command in `config/settings.json` that writes stdin to a file.

## Clean Up

1. Stop each `tmux` session you started.
2. Run `just sandbox-clean`.
   It removes the `claudetto-sandbox` folder with `config/`, `project/`, `home/`, and the `.claudetto-sandbox` marker.
3. For `just sandbox-alone`, run the recipe again, or run:

   ```bash
   bun tools/sandbox/main.ts --dir /tmp/claudetto-sandbox-alone --clean
   ```

4. For `just sandbox-install`, use the same command with `--dir /tmp/claudetto-sandbox-install`.

The sandbox writes a marker into each folder it makes.
`--clean` of a folder other than the default refuses a folder without the marker and refuses a symlink.
Remove such a folder by hand.

A sandbox session also writes into your checkout.
Claude Code writes `.claude-plugin/types/` and a `tsconfig.json` into each plugin folder it loads, and git ignores them ([Types](Development-Release#types)).

`just sandbox` keeps sessions and settings, so you can continue a test, but an old sandbox can hide a first-run problem.
`just sandbox-alone` starts empty on each run, so it shows a first-run problem.

## Related Pages

- [Sandbox](Sandbox)
- [Sandbox Linux](Sandbox-Linux)
- [Troubleshooting](Troubleshooting)
- [Lab](Lab)
