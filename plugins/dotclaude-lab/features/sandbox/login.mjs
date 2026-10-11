// The login token and the environment of the sandbox child process.

import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { parseJson, readJson, readText } from "./json.mjs";

/**
 * The token of `CLAUDE_CODE_OAUTH_TOKEN`, else the macOS Keychain entry,
 * else `~/.claude/.credentials.json`, else `null`.
 */
export function loginToken() {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN)
    return process.env.CLAUDE_CODE_OAUTH_TOKEN;
  let text = null;
  if (process.platform === "darwin") {
    const r = spawnSync(
      "security",
      ["find-generic-password", "-s", "Claude Code-credentials", "-w"],
      { encoding: "utf8" },
    );
    if (r.status === 0) text = r.stdout;
  }
  if (!text)
    text = readText(path.join(os.homedir(), ".claude", ".credentials.json"));
  return (text && parseJson(text)?.claudeAiOauth?.accessToken) || null;
}

// Variables that the parent Claude Code session sets for its own tools. In the
// sandbox they would join the parent session or fake its state.
const SESSION_VARS = new Set([
  "CLAUDECODE",
  "AI_AGENT",
  "CLAUDE_PID",
  "CLAUDE_EFFORT",
  "CLAUDE_PROJECT_DIR",
  "CLAUDE_ENV_FILE",
  "CLAUDE_CODE_CHILD_SESSION",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_EXECPATH",
  "CLAUDE_CODE_SSE_PORT",
]);
const SESSION_PREFIXES = [
  "CLAUDE_CODE_SESSION_",
  "CLAUDE_CODE_MESSAGING_",
  "CLAUDE_PLUGIN_",
];

/**
 * The environment without the parent session's variables, and without each
 * variable that has the value your own settings `env` gives it. A value that
 * you set for the sandbox on the command line stays.
 */
export function cleanEnv() {
  const own = path.join(
    process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"),
    "settings.json",
  );
  const settingsEnv = readJson(own)?.env ?? {};
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (
      SESSION_VARS.has(name) ||
      SESSION_PREFIXES.some((p) => name.startsWith(p)) ||
      (Object.hasOwn(settingsEnv, name) &&
        String(settingsEnv[name]) === env[name])
    )
      delete env[name];
  }
  return env;
}
