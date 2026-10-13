// The read of the account for the tier picks of setup.
// It runs `claude auth status --json` and reads `subscriptionType` and `loggedIn` from it.
// The rate limit tier comes from `CLAUDE_CODE_RATE_LIMIT_TIER`, because Claude Code exposes it there without the credentials file.
// It never reads the credentials file, and it prints no part of the status output.

import { type Account, accountOf } from "../domain/tiers.ts";
import { AUTH_STATUS_TIMEOUT_MS } from "../limits.ts";

/** The parsed output of `claude auth status --json`, or `undefined` when the program is missing, fails, or prints no JSON. */
const authStatus = (env: NodeJS.ProcessEnv): unknown => {
  try {
    const run = Bun.spawnSync(["claude", "auth", "status", "--json"], {
      env,
      stdout: "pipe",
      stderr: "ignore",
      timeout: AUTH_STATUS_TIMEOUT_MS,
    });
    return JSON.parse(run.stdout.toString());
  } catch {
    return undefined;
  }
};

/** The account of this run, from `claude auth status --json` and `CLAUDE_CODE_RATE_LIMIT_TIER`. */
export const readAccount = (env: NodeJS.ProcessEnv): Account =>
  accountOf(authStatus(env), env["CLAUDE_CODE_RATE_LIMIT_TIER"]);
