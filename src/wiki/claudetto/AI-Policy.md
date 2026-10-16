# AI Policy

This page describes the `policy` slice of the core plugin `claudetto`.
It is for a user who wants to know why Claude stops before it contributes to a repository of another owner.
The slice reads the AI policy of such a repository first, and it follows that policy.
It never stops local work.
You can read and change the code in your own fork or in a private clone.
It stops only an action that reaches the upstream repository.

## What It Does

The gate runs on an action that sends work to a repository whose owner is not your GitHub login.
Your login comes from `gh config get user -h github.com`, which makes no network call.
A repository of an organization is external, unless you are an owner of the organization.
The slice finds your organizations with `gh api user/memberships/orgs`, and an organization where your `role` is `admin` counts as your own.
When that lookup fails, each organization is external.
When the login is unknown, each repository is external.
A push to your own fork passes.
A pull request from your fork to its parent is an action on the parent.

## What Is Never Stopped

These stay allowed in each checkout, also in a checkout with a forbidden verdict:

- `Edit`, `Write`, and `NotebookEdit`.
- Local `Bash` commands, such as `git commit`, `git fetch`, builds, and redirects.
- `gh` groups that work on local state: `auth`, `config`, `alias`, `completion`, `extension`, `pr checkout`, `repo clone`, and `repo fork`.
- `curl` and `wget` calls that only read.

The exception is the verdict store.
The slice denies each call that is not a read and names `.claudetto/policy`.

## What Is Gated

- `git push`.
  The slice finds the target from the remote or URL in the command.
  Without one, it uses the push remote of the branch, or `origin`, with `git remote get-url --push`.
  A remote with a path, and a remote that `git` cannot find, pass.
- `gh` writes, such as `gh pr create`, `gh issue create`, `gh release`, and `gh api` with a method other than `GET`.
  The target comes from `-R`, then from the checkout, and a fork gives its parent.
- GitHub MCP tools whose name has a write verb.
- `curl`, `wget`, `http`, and `xh` calls that write to `github.com`, `api.github.com`, or `uploads.github.com` and name an external repository.

A folder, a remote, or an address that a shell expands cannot be found.
The slice denies such an action only when a verdict `forbidden` exists.

## How It Checks

The first gated action for an external repository is denied.
The deny lists the policy files that the slice found, and it asks Claude to read each one.
The slice looks in the checkout, or in the repository on GitHub when there is no checkout.
It also looks in the `.github` repository of the owner and in the parent repository of a fork.
The slice finds a file by its name and its place only.
It never reads a policy text for meaning.
The places are the root folder, `.github`, `.claude`, `docs`, `doc`, `policies`, `docs/guidelines`, `doc/internals`, and `doc/contribute`.
These names are in the list:

- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, and `copilot-instructions.md`.
- `CONTRIBUTING*`, `CONTRIBUTION*`, `CONVENTIONS*`, `HACKING*`, `SUBMITTINGPATCHES*`, `AI_POLICY*`, `AI-POLICY*`, `CODE_OF_CONDUCT*`, and `README*`.
- Each file with `AI` or `LLM` as a word in its name, such as `AI_USAGE_POLICY.md`, `AI.md`, and `ai-contribution-policy.md`.
- The files in `.github/PULL_REQUEST_TEMPLATE`, `.github/ISSUE_TEMPLATE`, `.gitlab/merge_request_templates`, `.gitlab/issue_templates`, `.cursor/rules`, and `CONTRIBUTING.d`.

The catalog [open-source-ai-contribution-policies](https://github.com/melissawm/open-source-ai-contribution-policies) shows these names.
About half of its projects publish the policy on a website or a wiki with no file in the repository.
The slice cannot find such a policy.
Claude reads the files and calls the tool `ai_policy` with one verdict:

- `allowed`: a file allows AI tools with no rule.
- `silent`: no file says anything about AI tools.
- `conditions`: a file allows AI tools under rules.
- `forbidden`: a file forbids AI tools, LLM contributions, or generated code.

The tool refuses a verdict when `read` leaves out a listed file.
It also refuses a verdict other than `silent` when the `quote` is not word for word in a listed file.
When no file exists and none is unread, the slice records `silent` and the action passes.

## What a Forbidden Policy Blocks

With the verdict `forbidden`, each gated action for that repository is denied.
The deny quotes the policy and tells Claude to tell you and to ask you what to do.
Your edits, commits, and builds in your own copy stay allowed.

## Ask Before Each Action on a Silent Verdict

A verdict `silent` means that Claude found no AI policy in the repository.
The project can keep its policy on a website or on a mailing list, where Claude cannot read it.
So a repository of another owner gets no agent-made push, `gh` write, MCP write, or network write without your consent.
For each such action, the `tool.check` handler of the slice returns an `ask`.
The text names the repository and asks you to approve only if you know that the project accepts AI contributions.
The consent is for one action and is not kept.
The next action asks again.
The verdicts `allowed` and `conditions` do not ask, and `forbidden` still denies.

No permission mode approves this `ask` by itself.
`bypassPermissions`, `auto`, and `acceptEdits` show the prompt.
`dontAsk` and `-p` runs deny the call, which is safe.
A mod gets no permission mode, so one design holds in each mode.
If Claude Code offers to remember the choice, the slice asks again, because the stricter verdict wins.
The `auto` mode is an inference: the docs state it for hooks, and the mod path uses the same pipeline.

## Fail Closed

When the remote of a push or a `gh` write cannot be found, or the command cannot be read, and the session folder is in an external repository, `tool.check` asks you.
In other folders the call passes to the push hook.
When the check itself fails, the slice denies a gated action at `tool.call` and passes every other call.
A failed check on `Edit` passes.
A failed check on `git push`, on a `gh` write, on a network write, or on a GitHub MCP write is denied.
At `tool.check`, a failed check on such an action asks you, and never passes.

## The Push Hook

`/claudetto:setup` writes the `env` keys of a git `pre-push` hook, next to the `commit-msg` hook.
Git runs it for each push that Claude makes, also from a script, an alias, or a subshell, and gives it the real remote.
The slice sets `CLAUDETTO_AGENT_CALL` while a `Bash` call of Claude runs, and the hook checks a push only when that name is set.
So a `!` command that you type yourself, such as `! git push`, passes the hook.
The hook is a shell script that reads plain files in `~/.claudetto/policy/`, with no `jq` and no `gh`.
It works by these rules:

- A push to a repository of the user passes.
  This includes each organization in `~/.claudetto/policy/orgs`, which the slice writes at session start.
- A push with the verdict `forbidden` or with no verdict is rejected, and the note tells Claude to run a plain `git push`.
- A push with the verdict `silent` passes once, with the consent token that the slice armed at the `ask`.
  The slice clears the token at the next tool call, and the hook ends it after 15 minutes.
- A push with the verdict `allowed` or `conditions` passes.

The slice denies a `Bash` push that skips or changes the hook:
`--no-verify`, `-c hook.*`, `core.hooksPath`, a change of `GIT_CONFIG_*`, `env -i`, and `env -u` of such a name.
It also denies each `Bash` command that sets or removes `CLAUDETTO_AGENT_CALL`.

## The Token Blank

A script, a build, or an interpreter can call the GitHub API, and the slice cannot read what it does.
When a `Bash` call runs such a program in a checkout that is not yours and has no verdict `allowed` or `conditions`, the slice sets `GH_TOKEN` and `GITHUB_TOKEN` to a value that is not a token.
It restores the two values after the call.
The checkout is the session folder or a folder of a `cd` in the command.

The blank is a soft barrier.
A script can still read a token from the keychain, from the config of `gh`, or from another file, and it can push over SSH.
`GH_ENTERPRISE_TOKEN` is not blanked.
A `gh` command in the same command as the script also gets no token.
The hard barrier is `/claudetto:setup sandbox`, because a plugin cannot change the `sandbox` settings from a hook.
It acts only in a checkout that is not yours and has no verdict `allowed` or `conditions`.
After your approval, it writes these keys to `.claude/settings.local.json` of the checkout:

- `sandbox.enabled` is `true`.
- `sandbox.allowUnsandboxedCommands` is `false`, so Claude Code ignores `dangerouslyDisableSandbox`.
- `sandbox.failIfUnavailable` is `true`, so Claude Code does not start when the sandbox cannot start.
  Without it, Claude Code runs the commands with no sandbox in that case.
- `sandbox.network.deniedDomains` gets `github.com` and `*.github.com`.
  A denied host stays blocked when an `allowedDomains` entry matches it too.

The hard stop has these costs in that checkout:

- Each shell command of Claude runs in the sandbox.
- Each connection to GitHub from a shell command fails, also a read such as `git fetch`, `gh pr view`, or a script that reads the GitHub API.
- A connection to a host that is not in `sandbox.network.allowedDomains` asks for your approval, or fails in auto mode.
- Claude Code does not start in the checkout when the sandbox cannot start.
  On Linux and WSL2, the sandbox needs `bubblewrap`, `socat`, and the seccomp filter helper of `@anthropic-ai/sandbox-runtime`.
  Without the filter, a command can reach the socket of `ssh-agent`, and on WSL2 it can start `git.exe` with Windows credentials.
  So setup checks them first and writes nothing when one is missing.
  It also writes nothing when `sandbox.network.allowAllUnixSockets` is `true`, or when a test run of the `bwrap` that Claude Code uses fails.
  It gives the install command, and `/claudetto:setup sandbox` runs it only after your approval.
  Native Windows and WSL1 have no sandbox, so setup writes nothing there.

The hard stop does not cover a command that you type at the `!` prompt, an MCP tool, or a hook, because they run outside the sandbox.
The gate of this slice still checks the MCP tools.
An entry of `sandbox.excludedCommands` also runs outside the sandbox, so setup names each entry that it finds.
`*.githubusercontent.com` stays open, because it serves files to read and no endpoint that writes.
Setup keeps a record of its changes in `.claudetto/sandbox-stop.json`.
`/claudetto:setup sandbox` with `--remove` takes out only those changes and puts back each old value.
After Claude records a verdict `silent` or `forbidden` for a checkout with no hard stop, the reply of the tool tells Claude to offer the command.

## The Verdict Store

Each verdict is in `~/.claudetto/policy/`, with a hash of the policy files.
A stored verdict is reused only when the hash is the same.
When a file changes, Claude reads the files again.
The slice denies each call that is not a read and names `.claudetto/policy`, also with a glob.
This covers `Edit`, `Write`, `NotebookEdit`, a redirect, and a command such as `cp`.
This holds also when the policy gate finds no external repository.
Files from GitHub are cached in `~/.claudetto/policy/cache/` so that Claude can read them with `Read`.

## Limits

The slice reads argv, tool names, and URLs.
It cannot read what a script does, so these stay open:

- Code that an interpreter or a script runs, such as `python script.py` or `python -c` that calls `git push`.
  The push hook checks the push, and the token blank makes a `gh` write or an HTTP write from a script harder, but does not stop it.
  Claude Code has no documented point to put a shim in `PATH` from a mod, and `sandbox.network` filters by host and not by method.
- A shell trick that hides a folder or program.
  A dynamic folder or remote is denied only when a verdict `forbidden` exists.
- Symlinks and aliases for `gh` and HTTP.
  A push is checked by the hook.
- Network clients other than the ones in the list, and `curl` inside a script.
- A `cd` inside a subshell, for `gh` and HTTP.
  The hook checks a push there.
- A script that clears its environment (`env={}`) hides the hook from git.
- A consent token is armed at the `ask`, before you answer, and the next tool call clears it.
  A mod cannot see your answer and cannot delete a file, so it writes an empty file.
- Git connects to the remote before it runs `pre-push`, so the hook sees only a push that can connect.
- A `!` command that you type while a `Bash` call of Claude runs gets the marker, and it can get the blank tokens.
  The hook then checks your push, which fails closed.
- In a session where the organization of your account manages the settings, `$.env.set` can refuse a change.
  Then a push from a script has no marker and passes the hook, and only the `tool.call` gate checks a plain `git push`.
- The file of your organizations changes only at session start.
- Git older than 2.54 runs no config hook.
  Then a plain `git push` is still gated by the `tool.call` deny and the `tool.check` ask, but a push from a script is not checked.
  `/claudetto:setup` says so when it finds an older git.
- The hash is for change detection only.
- A `404` in the `gh` error text means that a file is absent.

## Settings

The option `aiPolicy` is a boolean and is on by default.
Set it to `false` to turn the gate off.
With the option off, the plugin registers no tool.

## Related Pages

- [Guards](Guards): the other slices that deny a call.
- [Architecture](Architecture): the slices and the kernel.
