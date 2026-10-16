# Settings Apply

This page tells users how to apply the [settings snippet](Settings-Snippet) of claudetto.
It is for a user who installs claudetto, with setup or by hand.

## Apply It with Setup

1. Run `/claudetto:setup`.
2. Pick the scope: `user`, `project`, or `local`.
3. Read the list of changes, and approve the write.

The `settings` command of setup prints the changes, and it writes them only with `--apply`.
A failed read of the settings file writes nothing.
The merge adds keys and rules, and keeps your other keys.
It replaces the `availableModels` list.
A status line of another tool stays.
The project scope gets no status line, because the command holds the path of one computer.
Setup writes the `autoMode` lists of the [destructive floor](Guards#the-destructive-floor) to the user scope only.
The project and local scopes get none.
Setup makes no backup, so the list of changes is the record.

Setup also writes these sandbox and worktree keys:

- `sandbox.filesystem.allowWrite` lists the package caches, so that `bun install` writes its cache with no `EPERM`.
  Only the Bun cache is tested.
  The caches of `npm`, `pip`, `cargo`, and `go` are an assumption.
- `sandbox.filesystem.allowRead` gets the SSH signing key from `git config user.signingkey`, so that a signed commit works in the sandbox.
  Setup writes it only when the value is a path that starts with `~/` or `/`.
  The entry always names the `.pub` file.
  When the setting is the path of the private key, setup writes the `.pub` file next to it.
  The sandbox never reads the private key, so git signs through the ssh-agent.
- `sandbox.network.allowUnixSockets` gets the folder of `SSH_AUTH_SOCK`, so that git reaches the ssh-agent in the sandbox.
  Setup writes it only with a signing key file and an absolute `SSH_AUTH_SOCK`.
  Load the key in the agent before the session.
  On macOS, run `ssh-add --apple-use-keychain ~/.ssh/id_ed25519`, or set `AddKeysToAgent yes` and `UseKeychain yes` in `~/.ssh/config`.
  The macOS agent folder changes at each boot.
  The drift notice then names the old folder, and `/claudetto:setup` writes the new one.
- `autoMode` keeps `$defaults` and adds the entries of claudetto.
- `worktree.baseRef` is `head`, so that an agent worktree starts from the current `HEAD`.

At session start, the drift notice also names an env key that has no effect.
`BASH_OUTPUT_MAX_CHARS` is one, and the setting `bashOutputMaxChars` does the work.
`CLAUDE_CODE_MAX_CONTEXT_TOKENS` is another, when `DISABLE_COMPACT` is not on.

The status line commands get the absolute path of the plugin folder.
That path holds the plugin version, so run setup again after each plugin update.

## Starter Rules for CLAUDE.md

The `claude-md` command of setup writes a block of working rules to a `CLAUDE.md` file.
Pick the file with `--scope`:

- `user` gives `~/.claude/CLAUDE.md`.
- `project` gives `CLAUDE.md` in the project.
- `local` gives `CLAUDE.local.md` in the project.

The command prints the changes, and it writes them only with `--apply`.
The block starts with `<!-- claudetto:begin -->` and ends with `<!-- claudetto:end -->`.
A second run replaces only the text between the markers.
Your text outside the markers stays as it is.
A file with a missing, repeated, or reversed marker is refused, and the file stays as it is.
The block holds three rules: do what the request asks, settle what a check can settle, and call a part done only after a check.
It also holds a section for each installed add-on among `claudetto-codegraph`, `claudetto-docs`, and `claudetto-browser`.
Run setup again after you install an add-on, to add its section.
The exclude step of setup adds `CLAUDE.local.md` to `.git/info/exclude`, so git does not track it.

When the model catalog of your account offers Mythos, setup puts `claude-mythos-5-1` in place of `claude-fable-5-1`.
See [Mythos detection](Settings-Snippet-Keys#mythos-detection).

Setup also gives an alias line for your shell that starts Claude Code with `Glob` and `Grep`.
It does not edit the startup file of your shell.
See [Trim](Trim#glob-and-grep).

When `claudetto-docs` is installed, the merge also adds the [lines for the `claudetto-docs` add-on](Settings-Snippet-Docs).

## The Hard Stop for an External Checkout

The `sandbox` command of setup writes the hard stop of the [AI policy](AI-Policy#the-token-blank) to `.claude/settings.local.json`.
Run `/claudetto:setup sandbox` in the checkout.

- It acts only in a checkout of a repository that you do not own, when the verdict of the repository is not `allowed` or `conditions`.
  In another checkout, it writes nothing and tells why.
- It checks the programs that the sandbox needs on your platform before it writes, because `failIfUnavailable` stops Claude Code at startup when the sandbox cannot start.
  The [sandbox page of Claude Code](https://code.claude.com/docs/en/sandboxing) gives the prerequisites.
  macOS needs no program, because the sandbox uses Seatbelt, which is a part of macOS.
  Linux and WSL2 need `bwrap` (the package `bubblewrap`), `socat`, and the seccomp filter helper `apply-seccomp`.
  Native Windows and WSL1 have no sandbox.
- When a program is missing, it writes nothing, names the program, and prints the install command for the package manager that it finds: `apt-get`, `dnf`, `pacman`, `zypper`, `apk`, or `brew`.
  With no known package manager, it names the packages.
  `/claudetto:setup sandbox` shows you the command and runs it only after your approval, because the command uses `sudo` and changes the system.
  Then it runs the `sandbox` command again.
- On native Windows or WSL1, it writes nothing and tells why.
- On Linux and WSL2, the seccomp filter is required, because the filter blocks Unix sockets.
  Without it, a sandboxed command can reach the socket of `ssh-agent`.
  On WSL2, it can also start a Windows program, such as `git.exe` or `gh.exe`, which has the Windows credentials.
  The native build of Claude Code embeds the helper, so setup passes when the running `claude` is an ELF file.
  The running copy is the one in `CLAUDE_CODE_EXECPATH`, and else the `claude` on `PATH`.
  For the npm build, setup looks for the helper as Claude Code does: the file in `sandbox.seccomp.applyPath`, and then `vendor/seccomp/<arch>/apply-seccomp` in a global install of `@anthropic-ai/sandbox-runtime`.
  The arch is `x64` or `arm64`, and the filter has no other build.
  When the helper is missing, setup writes nothing and gives `npm install -g @anthropic-ai/sandbox-runtime`.
  `/claudetto:setup sandbox` runs it only after your approval, and then runs the `sandbox` command again.
- `sandbox.network.allowAllUnixSockets: true` turns the filter off, so setup writes nothing and names the file that sets it.
  Setup does not change a setting that you chose.
- On Linux, it also runs `bwrap` one time, because AppArmor can stop an installed `bwrap`, such as on Ubuntu 24.04 and later.
  The run uses the `bwrap` that Claude Code uses: `sandbox.bwrapPath` when a settings file sets it, and `bwrap` from `PATH` if not.
  It resolves links, so a Homebrew `bwrap` gives its real path.
  When the run fails, it writes nothing and shows the error.
  When the sysctl `kernel.apparmor_restrict_unprivileged_userns` is 1, it also prints the AppArmor profile of the sandbox page with the real path of that `bwrap`.
  `/claudetto:setup sandbox` writes the profile to `/etc/apparmor.d/bwrap` and runs `sudo systemctl reload apparmor` only after your approval.
  The error `Can't mount proc` means an unprivileged container.
  The sandbox page names `sandbox.enableWeakerNestedSandbox` for that case, and the hard stop does not set it, because it weakens the sandbox.
- It prints the changes and the costs, and it writes them only with `--apply`.
- It keeps your other keys, and a second run changes nothing.
- It writes a record of its changes to `.claudetto/sandbox-stop.json`.
  `claudetto-setup sandbox --remove --apply` takes out only those changes and puts back each old value.
- The exclude step adds `.claude/settings.local.json` and the record to `.git/info/exclude`, so git does not track them.

## Copy It by Hand

1. Copy the keys that you want into `~/.claude/settings.json` (user scope).
2. Replace `<plugin folder>` in `statusLine` and `subagentStatusLine` with the absolute path of the plugin folder, or delete both keys.
   The commands are `bun --no-env-file "<plugin folder>/bin/claudetto-statusline"` for `statusLine`, and the same command with `--subagent` for `subagentStatusLine`.
   A status line command gets no `${CLAUDE_PLUGIN_ROOT}`, so the path must be absolute.
   The path holds the version, so change the two commands again after each plugin update.
3. Replace `claude-fable-5-1` with `claude-mythos-5-1` only if your account has Mythos.
   See [Mythos detection](Settings-Snippet-Keys#mythos-detection) and [the CVP procedure](Settings-Snippet-Keys#cvp-procedure).
4. Restart Claude Code.

The snippet sets a key only when the Claude Code default does not give the result that claudetto needs.
A test fails when the block holds a key of the [never-set list](Off-Switches#never-set).

## Related Pages

- [Settings Snippet](Settings-Snippet)
- [Settings Snippet Keys](Settings-Snippet-Keys)
- [Settings Snippet Docs](Settings-Snippet-Docs)
- [Install](Install)
