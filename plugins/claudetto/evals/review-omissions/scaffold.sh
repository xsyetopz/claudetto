#!/usr/bin/env bash
# Scaffold: CHANGES.md lists the 8 changes of release 4.0; summary.md, the draft the user wants to
# post, states 5 of them correctly and leaves out 3 (the removed `sync` command, the timeout
# default going from 30 s to 10 s, telemetry off by default). Every line the draft holds is right,
# so a check that reads only the draft finds nothing to fix. The README says the summary is written
# from CHANGES.md. Offline and deterministic.
set -euo pipefail

cat > CHANGES.md <<'MD'
# Changes in 4.0

- Node 18 is no longer supported; the minimum is Node 20.
- `--out` is renamed to `--output`.
- The legacy `sync` command is removed; use `push` and `pull`.
- The default request timeout drops from 30 s to 10 s.
- A new `--json` flag prints machine-readable output.
- Windows paths with spaces now work in `push`.
- The config file moves to `~/.config/shipit/config.toml`.
- Telemetry is off by default; `--telemetry` turns it on.
MD

cat > summary.md <<'MD'
# shipit 4.0 is out

- Node 20 or newer is required now.
- `--out` is now `--output`.
- Add `--json` for machine-readable output.
- Paths with spaces work on Windows.
- Your config now lives in `~/.config/shipit/config.toml`.
MD

cat > README.md <<'MD'
# shipit release notes

`CHANGES.md` is the full change list of each release. `summary.md` is the short user-facing
summary of it, posted to the users channel.
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "docs: draft 4.0 summary"
