# Release History

The notes of each release are in `CHANGELOG.md` and on GitHub.
Read them before an update to see what changed.

## Where the Notes Are

- [CHANGELOG.md](https://github.com/xsyetopz/claudetto/blob/main/CHANGELOG.md) lists the changes of each release under Added, Changed, and Removed.
  A version that `main` does not have yet is the release in progress, and its section holds the changes so far.
- The merge into `main` is the release. The repository makes no tags, because Claude Code installs and updates a plugin from the default branch and the `version` of its manifest.

The version of `claudetto` is in `package.json`.
`just bump` writes it to `package.json`, each `plugin.json`, and the marketplace file.
See [Development Release](Development-Release).

## After an Update

Read the new entry of `CHANGELOG.md`, then run `/claudetto:setup` again.
See [Install](Install#update).

## Related Pages

- [Development Release](Development-Release)
- [Install](Install)
