claudetto checks each `git push` with a `pre-push` hook of git.
This command skips the hook or changes the settings of the hook: `{{what}}`.
Do not use `--no-verify`, `-c hook.*`, `core.hooksPath`, `GIT_CONFIG_*`, `env -i`, or `env -u` in a push.
Run a plain `git push`.
