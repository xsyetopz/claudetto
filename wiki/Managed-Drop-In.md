# Managed drop-in

This page tells an administrator how to put dotclaude at the prepend tier of Claude Code, before the built-in guard `sec-default`.
At the prepend tier, dotclaude gets the system-prompt events, and the guard stays on.
The facts are for Claude Code 2.1.293.

## Why a managed drop-in

- A plugin from GitHub loads from a cache copy, so it runs at tier `user`.
- On a machine with managed settings, the guard sends the system-prompt events past each user-tier mod.
  So a user-tier dotclaude cannot change the system prompt there.
- A managed plugin runs at tier `prepend` only when all of these are true (**binary** and **official**):
  - Managed `enabledPlugins` sets its id to `true`.
  - Managed `extraKnownMarketplaces` declares its marketplace as a local folder by an absolute path.
  - The marketplace lists the plugin by a relative path, so that Claude Code loads it in place from that folder.
- `prependPlugins` sets the order.
  The guard sends the system-prompt events past each hook after it, so dotclaude comes first.

## The drop-in

Write this file as `managed-settings.d/50-dotclaude.json` in the managed settings folder.
On macOS, the folder is `/Library/Application Support/ClaudeCode/`.
On Linux, it is `/etc/claude-code/`.

```json
{
  "extraKnownMarketplaces": {
    "dotclaude": { "source": { "source": "directory", "path": "<folder>" } }
  },
  "enabledPlugins": { "dotclaude@dotclaude": true },
  "prependPlugins": ["dotclaude@dotclaude", "sec-default@builtin"]
}
```

- `<folder>` holds `.claude-plugin/marketplace.json` of dotclaude.
- `sec-default@builtin` is the id of the guard that every release reads.
- Use a clone at a release tag in a folder that only an administrator can write.
  Claude Code does not check the owner of the folder.
  A person who can write the folder can change code that runs before the guard.
- On a development machine, `<folder>` can be the checkout.
  Then live sessions and `just sandbox` run the work tree.

## Install

```bash
D="/Library/Application Support/ClaudeCode/managed-settings.d/50-dotclaude.json"
sudo mkdir -p "$(dirname "$D")"
sudo install -m 644 -o root -g wheel 50-dotclaude.json "$D"
```

1. Quit and start Claude Code.
   At this start, Claude Code moves an earlier registration of the `dotclaude` marketplace, such as GitHub, to the folder of the drop-in.
1. Quit and start Claude Code again, or run `/reload-plugins`.
1. Run `claude plugin list`.
   The `dotclaude@dotclaude` entry shows `Read from:` and the folder.
1. Run `claude --debug-file <log> -p "hi"`, and find the line `hooks module dotclaude@dotclaude loaded`.
   It shows `tier prepend`.

## Effects

- The managed `enabledPlugins` entry locks the name `dotclaude` in every config on the machine.
  A user cannot turn dotclaude off in user settings.
- Claude Code ignores a `--plugin-dir` copy of a plugin named `dotclaude` ("plugin is locked by managed settings").
  `just sandbox` therefore loads dotclaude from the folder of the drop-in, and the evals run in a Linux container.
- The guard reads its two options from managed settings only: `allowManagedModsOnly` and `allowModsToOverrideDenyRules`.
  dotclaude sets neither.

## Fallbacks

Use these in order when dotclaude does not get `prompt.section` before the guard:

1. `prependPlugins` with `dotclaude@dotclaude` only.
   The guard is then not seated (**measured**, 2.1.293).
1. Managed `enabledPlugins["cc-plugin-sec-default@builtin"]: false`.
   The bundle shows that this turns the guard off, and no run has checked it yet.
1. Attachment and tool cuts only, with no system-prompt change.

## Remove

Remove the drop-in, and quit and start Claude Code.
To go back to the GitHub install, run `claude plugin marketplace remove dotclaude` and `claude plugin marketplace add xsyetopz/dotclaude`, and install `dotclaude@dotclaude` again.

## Related pages

- [Claude Mods](Claude-Mods)
- [Sandbox](Sandbox)
