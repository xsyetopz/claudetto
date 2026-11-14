#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
cat > src/limits.ts <<'EOF'
export const HELP_MAX_CHARS = 300;
EOF
cat > src/help.ts <<'EOF'
export const HELP_TEXT = `Usage: tool [options] <file>
Reads <file> and prints a summary of each section.

Options:
  --json    print the summary as JSON
  --quiet   print errors only
  --help    show this text

Options:
  --json    print the summary as JSON
  --quiet   print errors only
  --help    show this text

Exit codes:
  0  success
  1  the file could not be read
`;
EOF
cat > src/help.test.ts <<'EOF'
import { expect, test } from "bun:test";
import { HELP_TEXT } from "./help.ts";
import { HELP_MAX_CHARS } from "./limits.ts";

test("help text fits the limit", () => {
  expect(HELP_TEXT.length).toBeLessThanOrEqual(HELP_MAX_CHARS);
});
EOF
