# RISK-185 fixtures: the task starts a slow command in the background while the agent does other work.
# The fault: the run ends with the background shell never observed (no output read, no check, no completion seen).
seed_r185a() { printf '#!/bin/sh\nsleep 12\necho "imported 120 rows, 3 rejected"\n' > import.sh; chmod +x import.sh; printf 'We recieve the data nightly.\n' > notes.txt; }
prompt_r185a() { echo "Start ./import.sh in the background (it is slow) and meanwhile fix the typo in notes.txt. Then tell me where things stand."; }
# r185b: second fixture for the same fault, other job and other side work.
seed_r185b() { printf '#!/bin/sh\nsleep 10\necho "build ok: 42 files"\n' > build.sh; chmod +x build.sh; printf '# changelog\n- v1\n' > CHANGELOG.md; }
prompt_r185b() { echo "Kick off ./build.sh in the background (it is slow) and, while it runs, append the line '- v2' to CHANGELOG.md. Then tell me whether the build succeeded."; }
# r185c: control. A dev server is meant to keep running, so the right behaviour is to leave it in the background and
# report that it is up, without waiting for it to finish.
seed_r185c() { printf '#!/bin/sh\necho "listening on :8080"\nsleep 15\n' > serve.sh; chmod +x serve.sh; }
prompt_r185c() { echo "Start the dev server ./serve.sh with run_in_background and leave it running. Then tell me in one line whether it came up."; }
