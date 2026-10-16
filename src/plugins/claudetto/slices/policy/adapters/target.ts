// The repository that an action contributes to: the checkout of a folder, a `gh -R` name, or the parent of a fork.
// The functions take `run`, a callback for a process, because the `$` calls are in `mod.ts`.
// The login of the user is read once, with `gh config get user -h github.com`, which makes no network call.
// The organizations that the user owns come from `gh api user/memberships/orgs`, and a failed read is tried again at the next check.
// When the login is unknown, no repository is the user's, and when the organizations are unknown, each organization is external.

import { ownedOrgsOf } from "../domain/orgs.ts";
import {
  isOwn,
  keyOf,
  type Repo,
  repoOf,
  repoOfSpec,
} from "../domain/remote.ts";

/** Runs a program with its arguments in `cwd`, and gives its exit code and output. It never rejects. */
export type Run = (
  argv: readonly string[],
  cwd?: string,
) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

/** A repository that an action contributes to. `root` is the checkout on disk, when there is one. */
export type Target = {
  repo: Repo;
  key: string;
  root: string | undefined;
  own: boolean;
};

const state = {
  login: undefined as Promise<string | undefined> | undefined,
  orgs: undefined as Promise<string[] | undefined> | undefined,
  dirs: new Map<string, Target | null>(),
  parents: new Map<string, Repo | null>(),
};

/** The GitHub login of the user, or `undefined` when `gh` cannot give it. */
export const loginOf = (run: Run): Promise<string | undefined> => {
  state.login ??= run(["gh", "config", "get", "user", "-h", "github.com"]).then(
    (r) => (r.exitCode === 0 ? r.stdout.trim() || undefined : undefined),
  );
  return state.login;
};

/** The GitHub organizations that the user owns, in lower case, or `undefined` when `gh` cannot give them. Only a read that worked is kept. */
export const orgsOf = (run: Run): Promise<string[] | undefined> => {
  if (state.orgs !== undefined) return state.orgs;
  const read = run([
    "gh",
    "api",
    "--paginate",
    "--slurp",
    "user/memberships/orgs?state=active",
  ]).then((r) => (r.exitCode === 0 ? ownedOrgsOf(r.stdout) : undefined));
  state.orgs = read;
  void read.then((orgs) => {
    if (orgs === undefined && state.orgs === read) state.orgs = undefined;
  });
  return read;
};

/** The owners whose repositories are the user's: the login and the organizations that the user owns. */
export const ownersOf = async (run: Run): Promise<ReadonlySet<string>> => {
  const login = (await loginOf(run))?.toLowerCase();
  if (login === undefined || login === "") return new Set();
  return new Set([login, ...((await orgsOf(run)) ?? [])]);
};

/** The target of a repository that has no checkout here. */
export const targetOfRepo = async (run: Run, repo: Repo): Promise<Target> => ({
  repo,
  key: keyOf(repo),
  root: undefined,
  own: isOwn(repo, await ownersOf(run)),
});

/** The target of the checkout that holds `dir`, or `null` when `dir` is in no repository or the repository has no `origin`. */
export const targetOfDir = async (
  run: Run,
  dir: string,
): Promise<Target | null> => {
  const known = state.dirs.get(dir);
  if (known !== undefined) return known;
  const top = await run(["git", "-C", dir, "rev-parse", "--show-toplevel"]);
  const root = top.stdout.trim();
  const origin =
    top.exitCode === 0 && root !== ""
      ? await run(["git", "-C", root, "remote", "get-url", "origin"])
      : undefined;
  const url = origin?.exitCode === 0 ? origin.stdout.trim() : "";
  let found: Target | null = null;
  if (url !== "") {
    // A remote that no known form reads is kept as it is, and it is external.
    const repo = repoOf(url) ?? { host: "unknown", owner: "", name: url };
    found = {
      repo,
      key: keyOf(repo),
      root,
      own: isOwn(repo, await ownersOf(run)),
    };
  }
  // A checkout that is external only because the organizations are unknown is read again at the next check.
  if (found?.own !== false || (await orgsOf(run)) !== undefined)
    state.dirs.set(dir, found);
  return found;
};

/** The name of the remote that a `git push` with no remote word uses: the push remote of the branch, `remote.pushDefault`, the remote of the branch, else `origin`. */
const defaultRemote = async (run: Run, dir: string): Promise<string> => {
  const branch = (
    await run(["git", "-C", dir, "branch", "--show-current"])
  ).stdout.trim();
  const keys = [
    ...(branch === "" ? [] : [`branch.${branch}.pushRemote`]),
    "remote.pushDefault",
    ...(branch === "" ? [] : [`branch.${branch}.remote`]),
  ];
  for (const key of keys) {
    const r = await run(["git", "-C", dir, "config", "--get", key]);
    if (r.exitCode === 0 && r.stdout.trim() !== "") return r.stdout.trim();
  }
  return "origin";
};

/**
 * The repository that `git push` in `dir` sends to, or `null` when it is not found or is a path on this disk.
 * `remote` is the word of the call: a URL, a remote name, or `undefined` for the default.
 * A remote name goes through `git remote get-url --push`, which applies `pushurl` and `insteadOf`.
 */
export const targetOfPush = async (
  run: Run,
  dir: string,
  remote: string | undefined,
): Promise<Target | null> => {
  let url = remote;
  if (url === undefined || repoOf(url) === undefined) {
    const name = remote ?? (await defaultRemote(run, dir));
    if (name.includes("/") || name.includes(":")) return null;
    const r = await run([
      "git",
      "-C",
      dir,
      "remote",
      "get-url",
      "--push",
      name,
    ]);
    if (r.exitCode !== 0) return null;
    url = r.stdout.trim();
  }
  // A remote that no known form reads is kept as it is, and it is external, unless it is a path.
  const repo = repoOf(url);
  if (repo === undefined && (url.startsWith("/") || url.startsWith(".")))
    return null;
  const found = repo ?? { host: "unknown", owner: "", name: url };
  const origin = await targetOfDir(run, dir);
  if (origin !== null && origin.key === keyOf(found)) return origin;
  return targetOfRepo(run, found);
};

/** The repository that `repo` is a fork of, or `undefined` when it is no fork or `gh` cannot tell. Only `github.com` is asked. */
export const parentOf = async (
  run: Run,
  repo: Repo,
): Promise<Repo | undefined> => {
  if (repo.host !== "github.com") return undefined;
  const key = keyOf(repo);
  const known = state.parents.get(key);
  if (known !== undefined) return known ?? undefined;
  const r = await run([
    "gh",
    "repo",
    "view",
    `${repo.owner}/${repo.name}`,
    "--json",
    "parent",
  ]);
  let parent: Repo | null = null;
  try {
    const p = (JSON.parse(r.stdout) as { parent?: unknown }).parent as
      | { name?: unknown; owner?: { login?: unknown } }
      | null
      | undefined;
    if (typeof p?.name === "string" && typeof p.owner?.login === "string")
      parent = { host: "github.com", owner: p.owner.login, name: p.name };
  } catch {
    // Output that is not JSON means `gh` failed, and the repository then has no known parent.
  }
  if (r.exitCode === 0) state.parents.set(key, parent);
  return parent ?? undefined;
};

/** The target of a `gh` action: the `-R` name, else the checkout of `dir`, else the parent of a fork that the user owns. `dir` is read only when no name is given. */
export const ghTargetOf = async (
  run: Run,
  dir: () => Promise<string>,
  spec: string | undefined,
): Promise<Target | null> => {
  const named = spec === undefined ? undefined : repoOfSpec(spec);
  if (named !== undefined) return targetOfRepo(run, named);
  const target = await targetOfDir(run, await dir());
  if (target === null || !target.own) return target;
  const parent = await parentOf(run, target.repo);
  if (parent === undefined || isOwn(parent, await ownersOf(run))) return null;
  return targetOfRepo(run, parent);
};
