// The reads of the `sandbox` command about a checkout: the repository of `origin`, the owners of the user, and the stored policy verdict.
// The owner test is the one of the `policy` slice: the login of `gh config get user -h github.com` and the organizations that the user owns.
// When `gh` gives no login, no repository is the user's, as in the `policy` slice.

import path from "node:path";
import { runProgram } from "../../../../../kernel/node/process.ts";
import {
  FLAT_DIR,
  STORE_DIR,
  safeOf,
} from "../../../../../kernel/push-hook/index.ts";
import { ownedOrgsOf } from "../../../../../kernel/repo/orgs.ts";
import { keyOf, type Repo, repoOf } from "../../../../../kernel/repo/remote.ts";
import { GH_TIMEOUT_MS } from "../limits.ts";
import { git } from "./git.ts";

/** The trimmed stdout of `gh args`, or `undefined` when `gh` is missing or fails. */
const gh = (args: string[], cwd: string, env: NodeJS.ProcessEnv) => {
  try {
    const r = runProgram("gh", args, {
      cwd,
      env,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "ignore",
      timeout: GH_TIMEOUT_MS,
    });
    return r.exitCode === 0 ? (r.stdout?.toString() ?? "").trim() : undefined;
  } catch {
    return undefined;
  }
};

/** The repository of the `origin` remote of the checkout of `dir`, or `undefined` when there is none. A remote that no known form reads is external. */
export const originOf = (
  dir: string,
  env: NodeJS.ProcessEnv,
): Repo | undefined => {
  const url = git(["remote", "get-url", "origin"], dir, env);
  if (url?.code !== 0 || url.out === "") return undefined;
  return repoOf(url.out) ?? { host: "unknown", owner: "", name: url.out };
};

/** The owners whose repositories are the user's, in lower case: the login and the organizations that the user owns. */
export const ownersOf = (
  dir: string,
  env: NodeJS.ProcessEnv,
): ReadonlySet<string> => {
  const login = gh(["config", "get", "user", "-h", "github.com"], dir, env);
  if (!login) return new Set();
  const pages = gh(
    ["api", "--paginate", "--slurp", "user/memberships/orgs?state=active"],
    dir,
    env,
  );
  const orgs = pages === undefined ? [] : (ownedOrgsOf(pages) ?? []);
  return new Set([login.toLowerCase(), ...orgs]);
};

/** The verdict word that the `policy` slice stored for `repo`, or `undefined` when it stored none. */
export const verdictOf = async (
  repo: Repo,
  env: NodeJS.ProcessEnv,
): Promise<string | undefined> => {
  const home = env["HOME"] ?? env["USERPROFILE"];
  if (!home) return undefined;
  const file = path.join(home, STORE_DIR, FLAT_DIR, safeOf(keyOf(repo)));
  try {
    return (await Bun.file(file).text()).trim() || undefined;
  } catch {
    return undefined;
  }
};
