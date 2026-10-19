# Lab Sandbox

The command `claudetto-sandbox` of the plugin `claudetto-lab` runs Claude Code in a config folder apart from yours.
Read this page if you test a plugin and need to know what the sandbox sets, reads, and removes.

```text
claudetto-sandbox [--dir DIR] [--check-frontmatter] [--plugin-dir DIR]... [claude arguments...]
claudetto-sandbox [--dir DIR] --clean
```

The sandbox runs Claude Code in a config folder apart from yours.
A test of a plugin then cannot change your settings, sessions, or installed plugins.

- The first form sets up the folder, then runs `claude` with the arguments.
  The command loads no plugin by itself.
  Pass `--plugin-dir DIR` once for each plugin folder.
  The command makes each `--plugin-dir` path absolute, because `claude` runs in the `project/` folder.
- `--check-frontmatter` adds `--debug-file` and `-p "Reply with OK."` to the call.
  It prints each line of the debug log that names an unknown field.
  It exits 1 when the session fails, when the log names a field, or when the log shows no loaded plugin, because the check then proves nothing.
- `--clean` removes the folder.

The option `--dir DIR` sets the folder.
A value that starts with `--` exits 1 with a message.
The default is `claudetto-sandbox` in the system temp folder.
The folder holds three parts:

- `config/`, which is `CLAUDE_CONFIG_DIR`.
  The setup marks onboarding as done, and it trusts `project/`.
- `project/`, an empty git repository that is the working directory.
- `home/`, which is the `HOME` of Claude Code.
  A setup script that changes shell files changes only the sandbox.

The setup also writes the marker file `.claudetto-sandbox` in the folder.

## Clean Rules

`--clean` exits 0 with a note when the folder does not exist.
It refuses a symbolic link and exits 1.
For a folder other than the default, it also refuses and exits 1 when:

- the folder holds an entry outside `config`, `project`, `home`, and the marker, or
- the folder has no marker file, which means the sandbox did not make it.

The default folder skips these two checks.

## Login Token

The command reads the token from these sources, in this order:

1. The variable `CLAUDE_CODE_OAUTH_TOKEN`.
2. On macOS, the Keychain entry `Claude Code-credentials`.
3. The file `~/.claude/.credentials.json`.

The token goes only into the environment of the child process.
The command does not write the token to disk or print it.
If no token is found, the command still runs, and it tells you to run `/login` in the sandbox.

## The Child Environment

The child process drops the variables that the parent Claude Code session sets for its own tools, such as `CLAUDECODE`, `CLAUDE_PROJECT_DIR`, and each `CLAUDE_CODE_SESSION_`, `CLAUDE_CODE_MESSAGING_`, and `CLAUDE_PLUGIN_` variable.
In the sandbox, they would join the parent session or fake its state.
The child process also drops each variable that your own settings `env` sets to the same value.
It drops `ZDOTDIR` and `XDG_CONFIG_HOME`, and it sets `HOME` and `CLAUDE_CONFIG_DIR` to the sandbox.

## The Model Check

Claude Code gives no error for a `--model` that `availableModels` leaves out.
The session then runs on another model.
The command reads `availableModels` of the sandbox settings.
It warns when a `claude-` model is not in the list.

A managed setting can lock a plugin name.
Then Claude Code ignores the `--plugin-dir` copy.

## Related Pages

- [Lab](Lab): the other commands of the plugin.
- [Sandbox](Sandbox): the repository recipes that run Claude Code in a sandbox.
- [Troubleshooting](Troubleshooting): the symptoms of the sandbox and their fixes.
