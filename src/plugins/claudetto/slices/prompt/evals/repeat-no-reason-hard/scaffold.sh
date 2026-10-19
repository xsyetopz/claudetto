#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
mkdir -p src
cat > src/load.mjs <<'EOF'
import fs from "node:fs";

export const load = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
EOF
cat > src/server.mjs <<'EOF'
import http from "node:http";
import { load } from "./load.mjs";

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.end(JSON.stringify(load(url.searchParams.get("file"))));
  })
  .listen(8080);
EOF
