// The owner and the name of a repository, read from a remote URL or from the `OWNER/REPO` form that `gh -R` takes.
// The reading is structural: it splits the URL and never reads a policy text.
// The `policy` and `setup` slices read it from here, because a slice imports only `src/kernel/` and its own folder.

/** A repository on a host. */
export type Repo = { host: string; owner: string; name: string };

/** The scp form of git: `git@github.com:owner/name.git`. */
const SCP = /^[^@/\s]+@([^:/\s]+):(.+)$/;

/** The URL form: `https://github.com/owner/name.git` or `ssh://git@github.com:22/owner/name`. */
const URL_FORM = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]*@)?([^/:]+)(?::\d+)?\/(.+)$/i;

/** The repository of a path such as `owner/name.git`, or `undefined` when it has fewer than two parts. */
const fromPath = (host: string, path: string): Repo | undefined => {
  const parts = path
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .replace(/\.git$/, "")
    .split("/")
    .filter((p) => p !== "");
  const owner = parts[0];
  const name = parts.at(-1);
  if (parts.length < 2 || owner === undefined || name === undefined)
    return undefined;
  return { host: host.toLowerCase(), owner, name };
};

/** The repository of a remote URL, or `undefined` when the URL has none of the known forms. */
export const repoOf = (url: string): Repo | undefined => {
  const text = url.trim();
  const form = URL_FORM.exec(text) ?? SCP.exec(text);
  return form === null ? undefined : fromPath(form[1] ?? "", form[2] ?? "");
};

/** The repository of a `gh -R` value: `OWNER/REPO`, `HOST/OWNER/REPO`, or a URL. */
export const repoOfSpec = (spec: string): Repo | undefined => {
  if (spec.includes("://") || spec.includes("@")) return repoOf(spec);
  const parts = spec.split("/");
  if (parts.length === 2) return fromPath("github.com", spec);
  if (parts.length === 3)
    return fromPath(parts[0] ?? "", `${parts[1]}/${parts[2]}`);
  return undefined;
};

/** The key of a repository: `host/owner/name` in lower case. */
export const keyOf = (repo: Repo): string =>
  `${repo.host}/${repo.owner}/${repo.name}`.toLowerCase();

/** True when the owner of `repo` is in `owners`: the GitHub login of the user and the organizations that the user owns, in lower case. */
export const isOwn = (repo: Repo, owners: ReadonlySet<string>): boolean =>
  repo.owner !== "" && owners.has(repo.owner.toLowerCase());
