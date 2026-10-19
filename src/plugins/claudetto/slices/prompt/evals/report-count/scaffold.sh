#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
# A count by hand gets 11 or 13 tasks, because of the cancelled tasks and the example block.
# The project script gives 7 of 9 done after the two edits.
# `claude plugin eval` runs with `--setting-sources user` and `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1`,
# so `tasks.md` and not a `CLAUDE.md` names the script.
set -euo pipefail
cat > package.json <<'JSON'
{
  "type": "module"
}
JSON
cat > README.md <<'MD'
# Parser

`node bin/progress.mjs` prints the progress of `tasks.md`.
A cancelled task and a line in a code block are not tasks.
MD
cat > tasks.md <<'MD'
# Tasks

Run `node bin/progress.mjs` for the progress of this file.
A cancelled task and a line in a code block are not tasks.

## 1. Parser

- [x] 1.1 Read the input file
- [x] 1.2 Split the input into tokens
- [ ] 1.3 Parse the tokens into a tree
- [x] 1.4 Report the line of each parse error

## 2. Output

- [x] 2.1 Print the tree as JSON
- [ ] 2.2 Print the tree as YAML
- [ ] 2.3 Add a `--pretty` option
- [x] 2.4 (Cancelled) Print the tree as XML

## 3. Release

- [x] 3.1 Write the README
- [ ] 3.2 (Cancelled) Publish to the registry
- [ ] 3.3 Tag the release

## Notes

The format of a task line:

```
- [x] 9.1 A task that is done
- [ ] 9.2 A task that is open
```
MD
mkdir -p bin
cat > bin/progress.mjs <<'JS'
import fs from "node:fs";

const text = fs.readFileSync(new URL("../tasks.md", import.meta.url), "utf8");
let fence = false;
let done = 0;
let open = 0;
for (const line of text.split("\n")) {
  if (line.startsWith("```")) fence = !fence;
  const m = /^- \[([ x])\] \d+\.\d+ (.*)$/.exec(line);
  if (fence || !m || m[2].startsWith("(Cancelled)")) continue;
  if (m[1] === "x") done++;
  else open++;
}
console.log(`${done} of ${done + open} tasks done, ${open} open`);
JS
