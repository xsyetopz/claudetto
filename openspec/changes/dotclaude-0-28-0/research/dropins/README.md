# Managed drop-in states for tasks 2.2, 2.3, and 2.22

Historic: these files were for the 0.28.0 probes only, and dotclaude uses no managed settings (design D2).

The user runs each command in a terminal, because each one needs `sudo`.
No agent runs these commands.
The general procedure for any machine is in `wiki/Managed-Drop-In.md`.

| File | State | Task |
| --- | --- | --- |
| `target.json` | dotclaude at the prepend tier from the checkout, then the seated guard | 2.22, and the state to restore after each test |
| `guard-off.json` | no `prependPlugins`, and managed `enabledPlugins` turns the guard off | 2.2 |
| `mods-only.json` | `target.json` with `allowManagedModsOnly: true` | 2.3 |
| `override-deny.json` | `target.json` with `allowModsToOverrideDenyRules: true` | 2.3 |

`mods-only.json` stops each user-tier mod, such as `dotclaude-browser`, in all sessions.
`override-deny.json` lets a user mod approve a call that a deny rule refuses.
Restore `target.json` after each test.

## Set the names once per terminal

```bash
D="/Library/Application Support/ClaudeCode/managed-settings.d/50-dotclaude.json"
S="/Users/krystian/CodeProjects/xsyetopz/dotclaude/openspec/changes/dotclaude-0-28-0/research/dropins"
```

## Keep a backup of route A (one time)

```bash
sudo cp "$D" "/Library/Application Support/ClaudeCode/50-dotclaude.json.route-a-backup"
```

## Install a state

```bash
sudo install -m 644 -o root -g wheel "$S/target.json" "$D"
jq . "$D"
```

Put `guard-off.json`, `mods-only.json`, or `override-deny.json` in place of `target.json` for a test state.

## After the first install of `target.json`

1. Quit and start Claude Code.
   At this start, Claude Code moves the `dotclaude` marketplace from GitHub to the checkout folder.
1. Quit and start Claude Code again, or run `/reload-plugins`.
   The plugin now loads in place from the checkout at the prepend tier.
1. Check the folder:

   ```bash
   claude plugin list | grep -A4 'dotclaude@dotclaude'
   ```

   The output shows `Read from: /Users/krystian/CodeProjects/xsyetopz/dotclaude/plugins/dotclaude`.

The agent then checks the tier in a sandbox run (task 2.22).

## Roll back to route A

```bash
sudo install -m 644 -o root -g wheel "/Library/Application Support/ClaudeCode/50-dotclaude.json.route-a-backup" "$D"
```

To go back to the GitHub install, also run `claude plugin marketplace remove dotclaude` and `claude plugin marketplace add xsyetopz/dotclaude`, then install `dotclaude@dotclaude` again.
