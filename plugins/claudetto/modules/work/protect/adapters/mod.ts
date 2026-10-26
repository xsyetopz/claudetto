// The mod handlers of the `protect` slice (task 19.12 of change `redesign-0-4-0`): a `Bash` call may not change a protected file.
// `session.start` turns on `tool_response.bashEditDiff` with the env var. `classic.PreToolUse` saves the protected files that exist, in a `$.state` member of the call.
// `classic.PostToolUse` finds a changed protected file in the field, or by its content when the field has `unavailable` or `skipped` or is missing (a sandbox, or a folder that is not a git repo).
// It writes the saved content back, deletes a file that the call created, and tells the model to use `Edit`.
// A changed file stays when its content is the blob of a commit that git had at the first `Bash` call of the session (`known`): the effect of `git pull` or `git checkout` in the plan folder, not the command text.
// A moved remote-tracking ref counts only when `git ls-remote` of the URL that the remote had at the first call (a network URL, not a path) shows the same sha. A remote that is new, or whose URL changed, counts for nothing.
// `git ls-remote` reads the `git` config, the `ssh` config, some env vars, and the programs `ssh` and `git`, which a call can change without a change of `git remote -v` (`url.<base>.insteadOf`, `core.sshCommand`, `~/.ssh/config`, an `ssh` earlier in `PATH`). So the pin also holds a stamp of each source (the config without the keys that `ls-remote` never reads, such as `branch.*`), and a remote counts only when each stamp is as it was.
// A program that a setting names (`core.sshCommand`, `GIT_SSH`, `GIT_SSH_COMMAND`, `ProxyCommand`, `ProxyJump`, `LocalCommand`, `KnownHostsCommand`, `core.gitProxy`) can be rewritten with no change of any stamp, so its transport gets no trust, and the same holds for an `ssh` or `git` file below the home folder or the project. A credential helper and an askpass program cannot change the refs, so an `https` remote keeps its trust.
// The pin is taken at `session.start` when the project root is known then, else at the first `Bash` call, so an `Edit` of `.git/config` before the first `Bash` call cannot change the pin when the root is known.
// A deleted file stays deleted only when `HEAD` moved to a commit that lacks it and the index equals that `HEAD`, as after `git checkout`, so `git symbolic-ref` and `git reset --soft` do not make a delete stay.
// `git read-tree` alone does not (it leaves `HEAD` as it was, so the index differs from it), but `git read-tree` after `git update-ref --no-deref HEAD` or `git symbolic-ref` to such a commit does, and so does `git reset --mixed`, which also moves the branch ref and so does not leave the end state of `git checkout` (accepted). A staged change of the user makes a real checkout's delete get written back (fail-safe).
// The content of a changed file decides, not the command text, so `python3`, `perl`, `sed`, and a rename are the same.
// The `bashEditDiff` field cannot replace the mtime scan of `session.ledger` (`research/probe-19-12.md`).

import type { EngineInterface, MatchedHook } from "claude-code";
import type { Handler } from "../../../../kernel/hooks.ts";
import { projectRoot } from "../../../project/index.ts";
import {
  changed,
  changedStamps,
  diffPaths,
  type Kind,
  type Known,
  kindOf,
  movedRemotes,
  networkUrl,
  opaqueOf,
  parseRefs,
  parseUrls,
  readConfig,
  relative,
  remoteOf,
  type Saved,
  transportOf,
} from "../domain/protect.ts";
import {
  BIN_SCRIPT,
  GIT_COMMITS_MAX,
  GIT_TIMEOUT_MS,
  LS_REMOTE_TIMEOUT_MS,
  PLAN_DIR,
  PLAN_SKIPPED,
  PROTECT_CHARS_MAX,
  PROTECT_DEPTH_MAX,
  PROTECT_DIRS_MAX,
  PROTECT_FILES_MAX,
  PROTECTED_FILES,
  RM_TIMEOUT_MS,
  SSH_CONFIG,
} from "../limits.ts";
import {
  NO_COMMITS_AT_START,
  NOT_DELETED,
  NOT_TRUSTED,
  OPAQUE_REASONS,
  STAMP_NAMES,
  STAMP_UNREADABLE,
  UNDONE,
} from "../prompts.ts";

const rootOf = async ($: EngineInterface): Promise<string> =>
  (
    await projectRoot({
      dir: () => $.env.get("CLAUDE_PROJECT_DIR"),
      root: () => $.session.root(),
    })
  ).replace(/\/+$/, "");

/** The folders of `dir` below the depth bound, and its plan and spec files, as paths from the root. */
const listPlan = async (
  $: EngineInterface,
  root: string,
  dir: string,
  depth: number,
): Promise<{ dirs: [string, number][]; files: string[] }> => {
  const dirs: [string, number][] = [];
  const files: string[] = [];
  for (const { name, kind } of await $.fs
    .list(`${root}/${dir}`)
    .catch(() => [])) {
    const rel = `${dir}/${name}`;
    if (
      kind === "dir" &&
      depth < PROTECT_DEPTH_MAX &&
      !PLAN_SKIPPED.includes(name)
    )
      dirs.push([rel, depth + 1]);
    else if (kind === "file" && kindOf(rel) !== undefined) files.push(rel);
  }
  return { dirs, files };
};

/** The plan and spec files below `PLAN_DIR`, as paths from the root: a search by breadth, bounded in folders and depth. */
const planFiles = async (
  $: EngineInterface,
  root: string,
): Promise<string[]> => {
  const found: string[] = [];
  const queue: [string, number][] = [[PLAN_DIR, 0]];
  for (let seen = 0; queue.length > 0 && seen < PROTECT_DIRS_MAX; seen++) {
    const [dir, depth] = queue.shift() as [string, number];
    const listed = await listPlan($, root, dir, depth);
    queue.push(...listed.dirs);
    found.push(...listed.files);
  }
  return found;
};

/** The protected files that exist now, as paths from the root: the fixed files, and the plan and spec files. */
const protectedFiles = async (
  $: EngineInterface,
  root: string,
): Promise<string[]> => {
  const found: string[] = [];
  for (const rel of PROTECTED_FILES)
    if (await $.fs.exists(`${root}/${rel}`).catch(() => false)) found.push(rel);
  return [...found, ...(await planFiles($, root))].slice(0, PROTECT_FILES_MAX);
};

/** The text of the file `path`, or `undefined` for a file that is missing, unreadable, or over `PROTECT_CHARS_MAX`. */
const textOf = async (
  $: EngineInterface,
  path: string,
): Promise<string | undefined> => {
  const text = await $.fs.read(path).catch(() => undefined);
  return typeof text === "string" && text.length <= PROTECT_CHARS_MAX
    ? text
    : undefined;
};

const realOf = async ($: EngineInterface, path: string): Promise<string> =>
  (await $.fs.stat(path, { resolve: true }).catch(() => undefined))?.realPath ??
  path;

/** `session.start`: turns on `tool_response.bashEditDiff`, which wins over the setting `bashEditDiffEnabled`. The probe showed the start is early enough. A refusal before the session is bound is tried again after `next`. It also starts the pin of `git` and does not wait for it, as the first run of `session.start` holds the first prompt: a fault, or a root with no `.git` entry, leaves the pin to the first `Bash` call. */
export const onDiffEnv: Handler<"session.start"> = async ($, e, next) => {
  const set = () => $.env.set("CLAUDE_CODE_BASH_EDIT_DIFF", "1");
  const early = await set().then(
    () => true,
    () => false,
  );
  const started = await next(e);
  if (!early) await set().catch(() => undefined);
  void pin($, true).catch(() => undefined);
  return started;
};

/** The stdout of `git` in `root`, run with `--no-replace-objects` because a call can `git replace` a commit that is known, or `undefined` when it fails (no repo, or a fault). It runs by the real path that the pin holds (`Known.git`), so a `git` that a call puts earlier in `PATH` is not run. Before the pin, it runs by name. */
const git = async (
  $: EngineInterface,
  root: string,
  args: string[],
  timeoutMs = GIT_TIMEOUT_MS,
  stdin?: string,
): Promise<string | undefined> => {
  const pinned = (
    await $.state
      .get({ plugin: "claudetto", key: "bashKnown", id: "session" })
      .catch(() => undefined)
  )?.value?.git;
  const run = await $.process
    .run([pinned ?? "git", "--no-replace-objects", "-C", root, ...args], {
      timeoutMs,
      ...(stdin === undefined ? {} : { stdin }),
    })
    .catch(() => undefined);
  return run?.exitCode === 0 ? run.stdout : undefined;
};

const REFS = ["for-each-ref", "--format=%(objectname) %(refname)"];

/** The remotes with their URLs, after `url.<base>.insteadOf`, as `ls-remote` reads them. */
const REMOTES = ["remote", "-v"];

/** The env vars that `git` or `ssh` read for `git ls-remote`, by name, empty when not set. The name of `$.env.get` is a literal, so each variable is spelled out. */
const envOf = async (
  $: EngineInterface,
): Promise<{ [name: string]: string }> => {
  const reads = {
    HOME: $.env.get("HOME"),
    PATH: $.env.get("PATH"),
    XDG_CONFIG_HOME: $.env.get("XDG_CONFIG_HOME"),
    GIT_DIR: $.env.get("GIT_DIR"),
    GIT_EXEC_PATH: $.env.get("GIT_EXEC_PATH"),
    GIT_CONFIG_GLOBAL: $.env.get("GIT_CONFIG_GLOBAL"),
    GIT_CONFIG_SYSTEM: $.env.get("GIT_CONFIG_SYSTEM"),
    GIT_CONFIG_NOSYSTEM: $.env.get("GIT_CONFIG_NOSYSTEM"),
    GIT_CONFIG_COUNT: $.env.get("GIT_CONFIG_COUNT"),
    GIT_CONFIG_PARAMETERS: $.env.get("GIT_CONFIG_PARAMETERS"),
    GIT_SSH: $.env.get("GIT_SSH"),
    GIT_SSH_COMMAND: $.env.get("GIT_SSH_COMMAND"),
    GIT_SSH_VARIANT: $.env.get("GIT_SSH_VARIANT"),
    GIT_PROXY_COMMAND: $.env.get("GIT_PROXY_COMMAND"),
    HTTP_PROXY: $.env.get("HTTP_PROXY"),
    HTTPS_PROXY: $.env.get("HTTPS_PROXY"),
    ALL_PROXY: $.env.get("ALL_PROXY"),
    NO_PROXY: $.env.get("NO_PROXY"),
    http_proxy: $.env.get("http_proxy"),
    https_proxy: $.env.get("https_proxy"),
    all_proxy: $.env.get("all_proxy"),
    no_proxy: $.env.get("no_proxy"),
  };
  return Object.fromEntries(
    await Promise.all(
      Object.entries(reads).map(async ([name, read]) => [
        name,
        (await read.catch(() => undefined)) ?? "",
      ]),
    ),
  );
};

/** The real paths of the programs `ssh` and `git` that `PATH` names, as `{ ssh, git }`, empty for a program that `PATH` does not have, or `undefined` when the lookup fails or `git` is missing. */
const binOf = async (
  $: EngineInterface,
): Promise<{ ssh: string; git: string } | undefined> => {
  const run = await $.process
    .run(["/bin/sh", "-c", BIN_SCRIPT], { timeoutMs: GIT_TIMEOUT_MS })
    .catch(() => undefined);
  if (run?.exitCode !== 0) return undefined;
  const found: { [name: string]: string } = {};
  for (const line of run.stdout.split("\n")) {
    const at = line.indexOf("=");
    if (at > 0) found[line.slice(0, at)] = line.slice(at + 1).trim();
  }
  if (!found["git"]) return undefined;
  return {
    ssh: found["ssh"] ? await realOf($, found["ssh"]) : "",
    git: await realOf($, found["git"]),
  };
};

/** The settings of `git` and `ssh` that `git ls-remote` reads, as the blob id of each source (see `Known.stamps`), and what blocks the trust of a remote (see `Known.opaque`). `undefined` when `git` cannot give them. The blob id comes from `git hash-object --stdin`, so the state holds no config text. */
const stampsOf = async (
  $: EngineInterface,
  root: string,
): Promise<
  | { stamps: { [source: string]: string }; opaque: string[]; git: string }
  | undefined
> => {
  const list = await git($, root, [
    "config",
    "--list",
    "--show-origin",
    "--show-scope",
  ]);
  const env = await envOf($);
  const home = (env["HOME"] ?? "").replace(/\/+$/, "");
  const path = `${home}/${SSH_CONFIG}`;
  const exists = home !== "" && (await $.fs.exists(path).catch(() => false));
  const ssh = exists ? await textOf($, path) : "";
  const bin = await binOf($);
  if (list === undefined || ssh === undefined || bin === undefined)
    return undefined;
  const config = readConfig(list);
  const texts = [
    config,
    ssh,
    Object.entries(env)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n"),
    `ssh=${bin.ssh}\ngit=${bin.git}`,
  ];
  const ids = await Promise.all(
    texts.map(async (text) =>
      (
        await git($, root, ["hash-object", "--stdin"], GIT_TIMEOUT_MS, text)
      )?.trim(),
    ),
  );
  const [c, s, v, b] = ids;
  if (!c || !s || !v || !b) return undefined;
  const roots = [home, await realOf($, home), root, await realOf($, root)];
  return {
    stamps: { config: c, ssh: s, env: v, bin: b },
    opaque: opaqueOf({ config, ssh, env, paths: bin, roots }),
    git: bin.git,
  };
};

/** No commit is trusted: the state of a folder that is no git repo, or of a first `git` call that failed. `told: false` means that the model did not get the line `NO_COMMITS_AT_START` yet. The state takes no `undefined`. */
const NO_COMMITS: Known = { commits: [], remotes: {}, urls: {}, told: false };

/** The commits of `HEAD`, the stash, and the refs now, in this order, the remote-tracking refs, and the fetch URL of each remote, or `NO_COMMITS` with no git repo. `fromGit` reads the first `GIT_COMMITS_MAX`, so `HEAD` and the stash come first, and a repo with many refs still trusts the commits of `git checkout` and `git stash pop`. */
const knownNow = async ($: EngineInterface, root: string): Promise<Known> => {
  const refs = await git($, root, REFS);
  const head = await git($, root, ["rev-parse", "HEAD"]);
  if (refs === undefined || head === undefined) return NO_COMMITS;
  const stash = await git($, root, ["stash", "list", "--format=%H"]);
  const pairs = parseRefs(refs);
  const seen = await stampsOf($, root);
  return {
    ...(seen === undefined ? {} : { stamps: seen.stamps, git: seen.git }),
    opaque: seen?.opaque ?? ["all"],
    urls: parseUrls((await git($, root, REMOTES)) ?? ""),
    commits: [
      head.trim(),
      ...(stash ?? "").split("\n").filter((l) => l !== ""),
      ...pairs.map(([sha]) => sha),
    ],
    remotes: Object.fromEntries(
      pairs
        .filter(([, ref]) => ref.startsWith("refs/remotes/"))
        .map(([s, r]) => [r, s]),
    ),
  };
};

/** Saves what git has now under the id `session`, once: the first call of this function in the session fixes what is trusted, and a ref that a later call moved or made is not. */
const pin = async ($: EngineInterface, early = false): Promise<void> => {
  const root = await rootOf($);
  if (root === "") return;
  // At the start, a root with no `.git` entry has nothing to pin: the first `Bash` call tries again.
  if (early && !(await $.fs.exists(`${root}/.git`))) return;
  const base = {
    plugin: "claudetto",
    key: "bashKnown",
    id: "session",
  } as const;
  const { value, version } = await $.state.get(base);
  if (value !== undefined) return;
  const known = await knownNow($, root);
  // The pin of `session.start` may end while this one runs, and the first pin wins: a write that landed since the read above makes `ifVersion` fail.
  await $.state.set(base, known, { ifVersion: version });
};

type SaveHook = MatchedHook<
  "classic.PreToolUse",
  { readonly tool: readonly ["Bash"] }
>;

/** `classic.PreToolUse` on `Bash`: saves the protected files that exist. A fault leaves the call as it is. */
export const onSave: SaveHook = async ($, e, next) => {
  try {
    const root = await rootOf($);
    if (root !== "") {
      const saved: Saved = {};
      for (const rel of await protectedFiles($, root)) {
        const path = `${root}/${rel}`;
        const text = await textOf($, path);
        if (text !== undefined)
          saved[path] = { real: await realOf($, path), text };
      }
      await $.state.set(
        { plugin: "claudetto", key: "bashSaved", id: e.tool_use_id },
        saved,
      );
      await pin($);
    }
  } catch {
    // The guard is a help, and a fault of it adds no stop.
  }
  return next(e);
};

/** What the undo reads: the project root, its real path, and the files that the call reported (`undefined` when the field cannot be used). */
type Look = {
  root: string;
  realRoot: string;
  reported: string[] | undefined;
  known: Known | undefined;
  moved?: [string, string][];
  /** The reasons, as clauses, that a remote was not trusted: a stamp that changed, or an `ssh` config that the code cannot read. */
  why: string[];
  /** The stamps that changed, read once. */
  shifted?: string[];
};

/** The kind of the protected file at the project path `path`. */
const kindAt = (look: Look, path: string): Kind | undefined => {
  const rel = relative(look.root, path);
  return rel === undefined ? undefined : kindOf(rel);
};

/** The blob id of `rel` in each commit of `shas`, in order, or `""` for a commit that has no such file. One `git cat-file --batch-check` run answers for all, so a repo with many refs costs one run. */
const blobIds = async (
  $: EngineInterface,
  root: string,
  shas: string[],
  rel: string,
): Promise<string[]> => {
  const out =
    shas.length === 0
      ? ""
      : await git(
          $,
          root,
          ["cat-file", "--batch-check"],
          GIT_TIMEOUT_MS,
          `${shas.map((sha) => `${sha}:${rel}`).join("\n")}\n`,
        );
  const lines = (out ?? "").split("\n");
  return shas.map((_, i) => {
    const [id, type] = (lines[i] ?? "").split(" ");
    return type === "blob" && id !== undefined ? id : "";
  });
};

/** The reasons that `git ls-remote` is not the same as at the pin, read once for each look: each stamp that changed, or all when the pin has none. A call can change them with `git config`, with a write of a config file, or of `~/.ssh/config`, and `git remote -v` shows none of it (`url.<base>.insteadOf` for the pinned URL, `core.sshCommand`, `http.proxy`, `include.path`). */
const shifted = async ($: EngineInterface, look: Look): Promise<string[]> => {
  const before = look.known?.stamps;
  const now = await stampsOf($, look.root);
  if (before === undefined || now === undefined) return [STAMP_UNREADABLE];
  return changedStamps(before, now.stamps).map(
    (source) =>
      `${STAMP_NAMES[source] ?? `\`${source}\``} changed since the first \`Bash\` call`,
  );
};

/** True when the remote of `ref` has `sha` at the branch of `ref` now. Only the URL that the remote had at the first `Bash` call counts, and only when it is a network URL: a call can set `remote.<name>.url`, add a remote, or write a path, and then fetch its own commit. `git ls-remote` runs against the pinned URL, not the name. A remote with no pinned URL, or whose URL changed, is false. It is false also when a stamp of the settings that `git ls-remote` reads changed (`shifted`), or when the remote is on `ssh` and `~/.ssh/config` has a line that the code cannot read. The reason goes to `look.why`. A reflog message can be set with `update-ref -m`, so it proves nothing. A failure is false. */
const atRemote = async (
  $: EngineInterface,
  look: Look,
  [sha, ref]: [string, string],
): Promise<boolean> => {
  const on = remoteOf(ref);
  const pinned = on && look.known?.urls[on[0]];
  if (!on || !pinned || !networkUrl(pinned)) return false;
  const now = parseUrls((await git($, look.root, REMOTES)) ?? "")[on[0]];
  if (now !== pinned) return false;
  look.shifted ??= await shifted($, look);
  const reasons = [
    ...look.shifted,
    ...(look.known?.opaque ?? [])
      .filter((code) => code === "all" || code === transportOf(pinned))
      .map((code) => OPAQUE_REASONS[code] as string),
  ];
  for (const reason of reasons)
    if (!look.why.includes(reason)) look.why.push(reason);
  if (reasons.length > 0) return false;
  const out = await git(
    $,
    look.root,
    ["ls-remote", pinned, on[1]],
    LS_REMOTE_TIMEOUT_MS,
  );
  return !!out && out.split(/\s/)[0] === sha;
};

/** The blob ids that the text of the file at `path` has, as it is and with `\r\n` changed to `\n`, from stdin. A call can set a filter and `core.autocrlf` is common on WSL2, so no filter runs: the work-tree text of a checkout differs from the blob by `\r` only. */
const hashes = async (
  $: EngineInterface,
  root: string,
  path: string,
): Promise<string[]> => {
  const text = await textOf($, path);
  if (text === undefined) return [];
  const ids: string[] = [];
  for (const body of new Set([text, text.replaceAll("\r\n", "\n")])) {
    const id = (
      await git($, root, ["hash-object", "--stdin"], GIT_TIMEOUT_MS, body)
    )?.trim();
    if (id) ids.push(id);
  }
  return ids;
};

/** The remote-tracking refs that moved since the first `Bash` call, as `[sha, ref]`, bounded and read once for each look. */
const movedOf = async ($: EngineInterface, look: Look) => {
  look.moved ??= movedRemotes(
    look.known as Known,
    parseRefs((await git($, look.root, REFS)) ?? ""),
  ).slice(0, GIT_COMMITS_MAX);
  return look.moved;
};

/** True when the file at `rel` is the blob of a commit that git had at the first `Bash` call of the session, else of a remote-tracking ref that moved since then and that the remote has too. The compare is by blob id, so the file is hashed once and the commits are looked up in one run. The network is asked only after the commits from before did not match. */
const fromGit = async (
  $: EngineInterface,
  look: Look,
  rel: string,
): Promise<boolean> => {
  if (look.known === undefined) return false;
  const now = await hashes($, look.root, `${look.root}/${rel}`);
  if (now.length === 0) return false;
  const commits = [...new Set(look.known.commits)].slice(0, GIT_COMMITS_MAX);
  if (
    (await blobIds($, look.root, commits, rel)).some((id) => now.includes(id))
  )
    return true;
  const moved = await movedOf($, look);
  const ids = await blobIds(
    $,
    look.root,
    moved.map(([sha]) => sha),
    rel,
  );
  for (const [i, ref] of moved.entries())
    if (now.includes(ids[i] ?? "") && (await atRemote($, look, ref)))
      return true;
  return false;
};

/** True when the file at `rel` is gone from the work tree, was in the `HEAD` of the first `Bash` call, and the `HEAD` now has no such file, where this `HEAD` is a commit from before the session or a remote-tracking ref that moved and that the remote has too, and the index equals this `HEAD` (`git diff-index --cached` lists nothing): the effect of `git checkout`, `git switch`, or `git pull`, not of `rm`. A `HEAD` that has the file, or that the call made, is no reason to leave it deleted. A `HEAD` that a call moved with `git symbolic-ref`, `git update-ref --no-deref HEAD`, or `git reset --soft` leaves the index as it was, so it is no reason. A `git read-tree` alone leaves `HEAD` as it was, so the index differs from it and the file is written back. A `git read-tree` after a move of `HEAD` with `git update-ref --no-deref HEAD` or `git symbolic-ref`, or a `git reset --mixed`, to a commit from before that lacks the file, after an `rm`, leaves the index equal to this `HEAD`, so the delete stays. `git reset --mixed` also moves the branch ref, which `git checkout` does not, so the end state is not the same, and it is accepted. A staged change of the user makes `git diff-index --cached` list a path, so the delete of a real `git checkout` is written back then (fail-safe). */
const goneWithHead = async (
  $: EngineInterface,
  look: Look,
  rel: string,
): Promise<boolean> => {
  const first = look.known?.commits[0];
  const head = (await git($, look.root, ["rev-parse", "HEAD"]))?.trim();
  if (look.known === undefined || first === undefined || !head) return false;
  const [was, has] = await blobIds($, look.root, [first, head], rel);
  if (!was || has) return false;
  const staged = await git($, look.root, [
    "diff-index",
    "--cached",
    "--name-only",
    "HEAD",
    "--",
  ]);
  if (staged?.trim() !== "") return false;
  if (look.known.commits.slice(0, GIT_COMMITS_MAX).includes(head)) return true;
  const moved = (await movedOf($, look)).find(([sha]) => sha === head);
  return moved !== undefined && (await atRemote($, look, moved));
};

/** Writes back each saved file that the call changed, and gives the paths from the root. */
const restore = async (
  $: EngineInterface,
  look: Look,
  saved: Saved,
): Promise<string[]> => {
  const undone: string[] = [];
  for (const [path, { real, text }] of Object.entries(saved)) {
    const kind = kindAt(look, path);
    if (kind === undefined) continue;
    const gone = !(await $.fs.exists(path).catch(() => true));
    // A file that `git checkout`, `git switch`, or `git pull` removed stays removed, as a file that they brought stays.
    if (
      gone &&
      (await goneWithHead($, look, relative(look.root, path) as string))
    )
      continue;
    // A deleted file is written back also when the field does not list it.
    if (!gone && look.reported && !look.reported.includes(real)) continue;
    const now = await textOf($, path);
    if (!gone && !changed(kind, text, now)) continue;
    // A commit that the call made is not trusted: `git commit` and a commit date are in the reach of the call.
    if (
      now !== undefined &&
      (await fromGit($, look, relative(look.root, path) as string))
    )
      continue;
    await $.fs.write(path, text);
    undone.push(relative(look.root, path) as string);
  }
  return undone;
};

/** Deletes each protected file that the call created, from the field or by a new search with no field, and gives the paths from the root. A file that stays goes into `kept`. */
const remove = async (
  $: EngineInterface,
  look: Look,
  saved: Saved,
  kept: string[],
): Promise<string[]> => {
  const undone: string[] = [];
  const now = look.reported
    ? look.reported.flatMap((p) => {
        const rel = relative(look.realRoot, p) ?? relative(look.root, p);
        return rel === undefined ? [] : [rel];
      })
    : await protectedFiles($, look.root);
  for (const rel of now) {
    const path = `${look.root}/${rel}`;
    const kind = kindAt(look, path);
    if (kind === undefined || path in saved) continue;
    const text = await textOf($, path);
    if (text === undefined || !changed(kind, undefined, text)) continue;
    // A file that `git pull`, `git checkout`, or `git merge` brought stays, as `restore` leaves a changed file.
    if (await fromGit($, look, rel)) continue;
    // `$.fs` has no delete: a run that rejects or exits with a code is not an undo, and the other files still get their notes.
    const run = await $.process
      .run(["/bin/rm", "-f", "--", path], { timeoutMs: RM_TIMEOUT_MS })
      .catch(() => undefined);
    (run?.exitCode === 0 ? undone : kept).push(rel);
  }
  return undone;
};

/** `classic.PostToolUse` on `Bash`: undoes the change of each protected file and tells the model to use `Edit`. */
export const onUndo: Handler<"classic.PostToolUse"> = async ($, e, next) => {
  const answer = await next(e);
  try {
    const root = await rootOf($);
    if (root === "") return answer;
    const saved =
      (
        await $.state.get({
          plugin: "claudetto",
          key: "bashSaved",
          id: e.tool_use_id,
        })
      ).value ?? {};
    await $.state.set(
      { plugin: "claudetto", key: "bashSaved", id: e.tool_use_id },
      {},
    );
    const { value: pinned, version: told } = await $.state.get({
      plugin: "claudetto",
      key: "bashKnown",
      id: "session",
    });
    // No commit is known (fail-safe) when the pin has no `git` path, when the pinned `git` is a file that the agent can write (the marker `all`), or when `PATH` names another file now (or none).
    const known =
      pinned?.git === undefined ||
      pinned.opaque?.includes("all") ||
      (await binOf($))?.git !== pinned.git
        ? undefined
        : pinned;
    // The fail-safe has a cost that the model should know once: a pull or a checkout of a protected file is undone.
    // The flag `told` is set below, only when the line goes into the answer: a fault of the undo keeps the line for the next call.
    const notes: string[] = [];
    if (pinned?.told === false) notes.push(NO_COMMITS_AT_START);
    const look: Look = {
      why: [],
      known,
      root,
      realRoot: await realOf($, root),
      reported: diffPaths(e.tool_response),
    };
    const kept: string[] = [];
    const undone = [
      ...(await restore($, look, saved)),
      ...(await remove($, look, saved, kept)),
    ];
    const paths = (list: string[]) => list.map((p) => `\`${p}\``).join(", ");
    if (undone.length > 0) notes.push(UNDONE({ paths: paths(undone) }));
    if (kept.length > 0) notes.push(NOT_DELETED({ paths: paths(kept) }));
    if (undone.length > 0 && look.why.length > 0)
      notes.push(NOT_TRUSTED({ why: look.why.join(" and ") }));
    if (notes.length === 0) return answer;
    if (pinned?.told === false)
      await $.state.set(
        { plugin: "claudetto", key: "bashKnown", id: "session" },
        { ...pinned, told: true },
        { ifVersion: told },
      );
    return {
      ...answer,
      additionalContext: [...(answer.additionalContext ?? []), ...notes],
    };
  } catch {
    // The guard is a help, and a fault of it adds no stop.
    return answer;
  }
};
