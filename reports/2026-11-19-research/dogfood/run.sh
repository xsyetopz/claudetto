#!/bin/bash
# Dogfood on vanilla 2.1.327: the three plugins loaded from a second clone ($D/plug), so core writes
# their types there (start copies them into the working repo) and an edit in the working repo is not an edit of a loaded plugin, which auto mode always sends to its
# classifier; an isolated logged-in config dir; a fresh clone of HEAD as the working repo.
# usage: run.sh start | send "<text>" | keys <key> | shot | stop
set -u
D=/private/tmp/claude-501/df; S=claudetto-dogfood; T="tmux -S $D/tmux.sock"
root=$(cd "$(dirname "$0")/../../.." && pwd)
case $1 in
  start)
    rm -rf "$D/repo" "$D/plug"; git clone -q --no-hardlinks "$root" "$D/repo"; git clone -q --no-hardlinks "$root" "$D/plug"
    # gh maps a repo to GitHub through a remote URL, and the clone's origin is a local path (issue #80).
    # The push URL is unusable on purpose, so a session can read tickets but cannot push from the clone.
    git -C "$D/repo" remote add github "$(git -C "$root" remote get-url origin)"
    git -C "$D/repo" remote set-url --push github no-push-from-dogfood
    $T new-session -d -s $S -x 200 -y 50 -c "$D/repo" \
      "DISABLE_AUTOUPDATER=1 CLAUDE_CONFIG_DIR=$D/cfg $HOME/.local/share/claude/versions/2.1.327 --model claude-sonnet-5-5 --plugin-dir $D/plug/plugins/claudetto --plugin-dir $D/plug/plugins/claudetto-openspec --plugin-dir $D/plug/plugins/claudetto-you-should-know 2>$D/stderr.txt"
    # Core writes the types into the loaded copy only; the working repo needs them for tsc (issue #68).
    for p in claudetto claudetto-you-should-know; do
      t=.claude-plugin/types; for _ in $(seq 60); do [ -f "$D/plug/plugins/$p/$t/claude-code/index.d.ts" ] && break; sleep 2; done
      cp -R "$D/plug/plugins/$p/$t/." "$D/repo/plugins/$p/$t/"
    done ;;
  send) $T send-keys -t $S -l "$2"; sleep 0.3; $T send-keys -t $S Enter ;;
  keys) $T send-keys -t $S "$2" ;;
  shot) $T capture-pane -p -t $S -S -60 ;;
  stop) $T kill-session -t $S ;;
esac
