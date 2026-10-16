#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
# Each read of 600 lines of `a.txt` is about 21k tokens, below the 25,000 tokens that `Read` gives at most,
# so the fourth or the fifth read passes the Haiku trigger of the plugin settings, and the auto compaction starts.
# The first line of `a.txt` is only in the first read, so the reply needs the handoff or a new read.
# The eval does not read the settings of the project, and it drops the env vars of the compaction,
# so the trigger is the one of the plugin settings.
set -euo pipefail
python3 -I -c "
import random
random.seed(7)
w = ['alpha', 'bravo', 'delta', 'echo', 'kilo', 'lima', 'oscar', 'tango', 'zulu', 'quartz']
lines = ['FIRST-LINE: amber-falcon-42'] + [' '.join(random.choice(w) for _ in range(12)) for _ in range(6000)]
open('a.txt', 'w').write('\\n'.join(lines) + '\\n')
"
echo "CODEWORD: velvet-mirror-913" > b.txt
