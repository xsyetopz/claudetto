#!/bin/bash
# Dogfood on vanilla 2.1.327: claudetto and claudetto-you-should-know loaded from a second clone ($D/plug), so core writes
# their types there and an edit in the working repo is not an edit of a loaded plugin, which auto mode always sends to its
# classifier; an isolated logged-in config dir; a fresh clone of HEAD as the working repo.
# usage: run.sh start | send "<text>" | keys <key> | shot | stop
set -u
D=/private/tmp/claude-501/df; S=claudetto-dogfood; T="tmux -S $D/tmux.sock"
root=$(cd "$(dirname "$0")/../../.." && pwd)
case $1 in
  start)
    rm -rf "$D/repo" "$D/plug"; git clone -q --no-hardlinks "$root" "$D/repo"; git clone -q --no-hardlinks "$root" "$D/plug"
    $T new-session -d -s $S -x 200 -y 50 -c "$D/repo" \
      "DISABLE_AUTOUPDATER=1 CLAUDE_CONFIG_DIR=$D/cfg $HOME/.local/share/claude/versions/2.1.327 --model claude-sonnet-5-5 --plugin-dir $D/plug/plugins/claudetto --plugin-dir $D/plug/plugins/claudetto-you-should-know 2>$D/stderr.txt" ;;
  send) $T send-keys -t $S -l "$2"; sleep 0.3; $T send-keys -t $S Enter ;;
  keys) $T send-keys -t $S "$2" ;;
  shot) $T capture-pane -p -t $S -S -60 ;;
  stop) $T kill-session -t $S ;;
esac
