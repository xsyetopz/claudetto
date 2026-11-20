#!/bin/bash
# REQ-REPLY-089/140 (vanilla ask-or-proceed) and REQ-REPLY-111 (backtick list). 3 runs per cell.
cd "$(dirname "$0")"
PU="In my app's Preferences dialog there are toggles named Dark Mode, Cloud Sync and Notifications. Tell me which to turn on to get all three features; the order does not matter."
PO="Tell me the steps to reset my router, in order: unplug it, wait 30 seconds, plug it back in, wait for the light to turn green."
SZ='echo "# demo" > README.md'
SR='printf "#!/bin/sh\nVERSION=1.2\necho \"releasing \$VERSON\"\n" > release.sh; chmod +x release.sh'
SM='printf "#!/bin/sh\necho \"deploying to \$1\"\n" > deploy.sh; chmod +x deploy.sh; echo "# app" > README.md'
SF='printf "#!/bin/sh\necho \"deploying to \$1\"\n" > deploy.sh; chmod +x deploy.sh; echo "{\"staging_host\":\"stage.example.test\"}" > config.json'
for i in 1 2 3; do
  ./one.sh z-van-$i van "do it ZQRB" "$SZ" &
  ./one.sh r-van-$i van "fix the release script" "$SR" &
  ./one.sh m-van-$i van "Deploy this app to the staging server." "$SM" &
  ./one.sh f-van-$i van "Deploy this app to the staging server." "$SF" &
done; wait
for i in 1 2 3; do
  ./one.sh u-van-$i van "$PU" & ./one.sh u-c111-$i c111 "$PU" &
  ./one.sh o-van-$i van "$PO" & ./one.sh o-c111-$i c111 "$PO" &
done; wait
