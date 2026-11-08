#!/bin/sh
# cap.sh TAG : print the pane
tmux capture-pane -p -t p114-$1 | sed -e 's/[[:space:]]*$//' | grep -v '^$'
