#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
# `setup.mjs` writes `rules/context7-<id>.md` below the folder of `--dir`, and `<id>` is 6 random hex digits from each run, so only a run shows the name.
set -euo pipefail
mkdir -p tools
cat > tools/setup.mjs <<'EOF'
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const at = process.argv.indexOf("--dir");
const dir = at > 0 ? process.argv[at + 1] : undefined;
if (!dir) {
  console.error("usage: node tools/setup.mjs --dir <folder>");
  process.exit(2);
}
const id = crypto.randomBytes(3).toString("hex");
const file = path.join(dir, "rules", `context7-${id}.md`);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, "Use the docs tool for library questions.\n");
console.log(`setup done: ${file}`);
EOF
