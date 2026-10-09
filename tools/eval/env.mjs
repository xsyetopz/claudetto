// The credentials of the eval runs come from `.env` in the repository root.
// The harness never prints a value, only a key name.

import fs from "node:fs";

/** The KEY=value pairs of a dotenv text. */
export function parseEnv(text) {
  const out = {};
  for (const raw of text.split("\n")) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(
      raw,
    );
    if (!m || raw.trimStart().startsWith("#")) continue;
    out[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return out;
}

/** The keys of the file at `file`. Throws when the token is missing. */
export function loadCredentials(file) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    throw new Error(
      "No .env file. Copy .env.example to .env and set CLAUDE_CODE_OAUTH_TOKEN.",
    );
  }
  const env = parseEnv(text);
  if (!env.CLAUDE_CODE_OAUTH_TOKEN) {
    throw new Error("CLAUDE_CODE_OAUTH_TOKEN is missing in .env.");
  }
  return env;
}
