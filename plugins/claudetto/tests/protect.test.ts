// Lab tests of the `work.bash-*` hooks (task 19.12 of change `redesign-0-4-0`): a `Bash` call that changes a protected file is undone.
// The protected files are the boxes of a `tasks.md`, the plan and spec files, `.claudetto/goal.json`, and `.jscpd-baseline.json`.
// The stub keeps all files in one map. The project is `/p`, and its real path is `/private/p`, as `/tmp` is `/private/tmp` on macOS.
// The file is self-contained, because a lab test cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { listing } from "./stubs/files.ts";
import { ran } from "./stubs/process.ts";

const TASKS = "/p/openspec/changes/x/tasks.md";
const OPEN = "- [ ] 1.1 first\n- [ ] 1.2 second\n";
const TICKED = "- [x] 1.1 first\n- [ ] 1.2 second\n";
const GOAL = "/p/.claudetto/goal.json";
const BASELINE = "/p/.jscpd-baseline.json";

type World = {
  files: Record<string, string>;
  /** The argv of each process run. */
  runs: string[][];
  /** The stdout of each `git` run by its args after `-C /p` joined with a space. A run with no entry fails, as in a folder that is no git repo. */
  git: Record<string, string>;
  /** The `tasks.md` text of each commit, by sha: what `git cat-file --batch-check` finds with `<sha>:<path>`. */
  blobs: Record<string, string>;
  /** The replacement of a commit by sha, as `git replace` makes it: `cat-file` follows it unless the call has `--no-replace-objects`. */
  replaced: Record<string, string>;
  /** The stdin of each `git cat-file` run. */
  lookups: string[];
  /** True when `fs.write` is refused, as on a read-only disk. */
  readOnly: boolean;
  /** The variables set with `env.set`. */
  env: Record<string, string>;
  /** The sha of each branch ref on the server at a URL: what `git ls-remote <url> <ref>` finds. A URL with no entry fails. An `ssh` URL is looked up as `via:<command>` when `core.sshCommand`, `GIT_SSH_COMMAND`, or a `ProxyCommand` of `~/.ssh/config` sets a command, as that command picks the server. */
  servers: Record<string, Record<string, string>>;
  /** The file that `command -v` finds for `ssh` and `git`. */
  bin: { ssh: string; git: string };
  /** The `git` file that a call wrote: a run is fake when the file it runs is this one. The name `git` runs `bin.git`, as `PATH` resolves it, and an absolute path runs that file. A run of any other file is the real `git`. The fake prints one blob id for each `hash-object` and `cat-file` run. */
  fakeGit: string | undefined;
  /** How `/bin/rm` ends: `ok`, `fail` (exit code 1), or `reject` (the run rejects, as with no `/bin/rm`). */
  rm: "ok" | "fail" | "reject";
  /** The state, with versions as the engine keeps it. */
  store: Map<string, { value: unknown; version: number }>;
  /** Runs once before the next `state.set` of the pin, and stands for a write of another call that lands between the read and the write. */
  beforeSet: (() => void) | undefined;
};

/** The blob id of a text in the stub: the encoded text behind a prefix, with no space. */
const blobId = (text: string) => `blob-${encodeURIComponent(text)}`;

const BIN = { ssh: "/usr/bin/ssh", git: "/usr/bin/git" };

const real = (path: string) => path.replace(/^\/p/, "/private/p");

const LOCAL = "/p/.git/config";
const GLOBAL = "/home/u/.gitconfig";
const SSH_CONFIG = "/home/u/.ssh/config";

/** The config files in the order that `git` reads them, with a `key=value` line for each entry. */
const entriesOf = (world: World) =>
  [GLOBAL, LOCAL].flatMap((path) =>
    (world.files[path] ?? "")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => ({
        path,
        key: l.slice(0, l.indexOf("=")),
        value: l.slice(l.indexOf("=") + 1),
      })),
  );

/** Sets `key` to `value` in the config file `path`. */
const setConfig = (world: World, path: string, key: string, value: string) => {
  const kept = (world.files[path] ?? "")
    .split("\n")
    .filter((l) => l !== "" && !l.startsWith(`${key}=`));
  world.files[path] = `${[...kept, `${key}=${value}`].join("\n")}\n`;
};

/** Sets the URL of the remote `name` in the local config. */
const setUrl = (world: World, name: string, url: string) => {
  setConfig(world, LOCAL, `remote.${name}.url`, url);
};

/** The config value of `key` now: the last entry wins. */
const configOf = (world: World, key: string) =>
  entriesOf(world)
    .filter((e) => e.key === key)
    .at(-1)?.value;

/** `url` after `url.<base>.insteadof`, as `git` does it: the longest matching prefix, one time. */
const rewrite = (world: World, url: string) => {
  const rule = entriesOf(world)
    .filter(
      (e) => /^url\..*\.insteadof$/.test(e.key) && url.startsWith(e.value),
    )
    .sort((a, b) => b.value.length - a.value.length)[0];
  return rule
    ? rule.key.slice(4, -".insteadof".length) + url.slice(rule.value.length)
    : url;
};

const sshLike = (url: string) =>
  /^ssh:\/\//.test(url) || /^[\w.-]+@[\w.-]+:/.test(url);

/** The command that picks the server for an `ssh` URL, or `undefined` for the plain server. */
const sshVia = (world: World) => {
  const command =
    configOf(world, "core.sshcommand") ??
    world.env["GIT_SSH_COMMAND"] ??
    world.env["GIT_SSH"] ??
    /(?:ProxyCommand|ProxyJump|LocalCommand|KnownHostsCommand) (.+)/.exec(
      world.files[SSH_CONFIG] ?? "",
    )?.[1];
  return command === undefined || /^ssh\b/.test(command) ? undefined : command;
};

/** The `git` stdout for the config: `git config --list --show-origin --show-scope`. */
const configList = (world: World) =>
  entriesOf(world)
    .map(
      (e) =>
        `${e.path === GLOBAL ? "global" : "local"}\tfile:${e.path}\t${e.key}=${e.value}`,
    )
    .join("\n");

/** `git remote -v`: the URLs of the config files after `insteadOf`. */
const remoteList = (world: World) =>
  ran(
    entriesOf(world)
      .flatMap((e) => {
        const name = /^remote\.(.+)\.url$/.exec(e.key)?.[1];
        const url = rewrite(world, e.value);
        return name
          ? [`${name}\t${url} (fetch)`, `${name}\t${url} (push)`]
          : [];
      })
      .join("\n"),
  );

/** `git ls-remote <url> <ref>`: it takes a URL only, so a remote name fails. */
const lsRemote = (world: World, args: readonly string[]) => {
  const url = rewrite(world, args[1] as string);
  const fake = [
    world.bin.git === BIN.git ? undefined : world.bin.git,
    sshLike(url) && world.bin.ssh !== BIN.ssh ? world.bin.ssh : undefined,
  ].find((path) => path !== undefined);
  const via =
    fake !== undefined
      ? `bin:${fake}`
      : sshLike(url)
        ? sshVia(world)
        : /^git:\/\//.test(url)
          ? configOf(world, "core.gitproxy")
          : undefined;
  const refs = world.servers[via === undefined ? url : `via:${via}`];
  const sha = refs?.[args[2] as string];
  return refs === undefined
    ? ran("", 128)
    : ran(sha ? `${sha}\t${args[2]}\n` : "");
};

/** The answer of a stubbed `git` run: `hash-object --stdin` gives the blob id of the stdin and fails for any other args, so a filter flag or a `--path` is caught, `ls-remote` asks the server at a URL after `url.<base>.insteadOf` and fails for a remote name, `remote -v` prints the URLs of the config files after `insteadOf`, `config --list` prints these files, `cat-file --batch-check` looks up `<sha>:<path>` lines in `blobs` (a commit in `replaced` gives the blob of its replacement, unless the argv has `--no-replace-objects`), and the rest is read from `git`. */
const gitRun = (world: World, argv: readonly string[], stdin = "") => {
  const flagged = argv[1] === "--no-replace-objects";
  const args = argv.slice(flagged ? 4 : 3);
  if (args[0] === "hash-object")
    return args.join(" ") === "hash-object --stdin"
      ? ran(`${blobId(stdin)}\n`)
      : ran("", 128);
  if (args[0] === "remote" && args[1] === "-v") return remoteList(world);
  if (args.join(" ") === "config --list --show-origin --show-scope")
    return ran(configList(world));
  if (args[0] === "ls-remote") return lsRemote(world, args);
  if (args[0] === "cat-file") {
    world.lookups.push(stdin);
    return ran(
      stdin
        .split("\n")
        .filter((l) => l !== "")
        .map((l) => {
          const sha = l.split(":")[0] as string;
          const text =
            world.blobs[flagged ? sha : (world.replaced[sha] ?? sha)];
          return text === undefined
            ? `${l} missing`
            : `${blobId(text)} blob ${text.length}`;
        })
        .join("\n"),
    );
  }
  const out = world.git[args.join(" ")];
  return out === undefined ? ran("", 128) : ran(out);
};

/** The answer of the `git` file in `fakeGit`: one blob id for every text, so each lookup matches. */
const fakeGitRun = (argv: readonly string[], stdin = "") => {
  const same = "f".repeat(40);
  return argv.includes("cat-file")
    ? ran(
        stdin
          .split("\n")
          .filter((l) => l !== "")
          .map(() => `${same} blob 1`)
          .join("\n"),
      )
    : ran(`${same}\n`);
};

/** The answer of a stubbed `/bin/rm`: it deletes the paths of its args, unless `world.rm` makes it fail or reject. */
const rmRun = (world: World, argv: readonly string[]) => {
  if (world.rm === "reject") return { deny: "ENOENT" };
  if (world.rm === "fail") return ran("", 1);
  for (const a of argv.slice(1)) delete world.files[a];
  return ran("");
};

/** Stubs the files in `files`, the state, and `process.run`, which stands for the `rm` of a created file, and for `git`. */
const stub = (on: On, files: Record<string, string>): World => {
  const world: World = {
    files: { ...files },
    runs: [],
    git: {},
    blobs: {},
    replaced: {},
    lookups: [],
    readOnly: false,
    env: { HOME: "/home/u" },
    servers: {},
    bin: { ...BIN },
    fakeGit: undefined,
    rm: "ok",
    store: new Map(),
    beforeSet: undefined,
  };
  on("tool.call", () => ({ result: "ok" }));
  on("classic.PostToolUse", () => ({}));
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("session.root", () => ({ value: "/p" }));
  on("session.cwd", () => ({ value: "/p" }));
  on("session.id", () => ({ value: "s1" }));
  on("env.get", (_$, e) => ({ value: world.env[e.name] }));
  on("env.set", (_$, e) => {
    world.env[e.name] = e.value ?? "";
    return { value: {} };
  });
  on("clock.now", () => ({ value: 0 }));
  on("state.get", (_$, e) => ({
    value: {
      ...(world.store.get(`${e.key}/${e.id}`) ?? {
        value: undefined,
        version: 0,
      }),
    },
  }));
  on("state.set", (_$, e) => {
    const key = `${e.key}/${e.id}`;
    if (key === "bashKnown/session") {
      const race = world.beforeSet;
      world.beforeSet = undefined;
      race?.();
    }
    const held = world.store.get(key) ?? { value: undefined, version: 0 };
    if (e.ifVersion !== undefined && e.ifVersion !== held.version)
      return { value: { isSet: false, version: held.version } };
    world.store.set(key, { value: e.value, version: held.version + 1 });
    return { value: { isSet: true, version: held.version + 1 } };
  });
  on("fs.list", (_$, e) => ({
    value: listing(Object.keys(world.files), e.path),
  }));
  on("fs.exists", (_$, e) => ({ value: e.path in world.files }));
  on("fs.read", (_$, e) =>
    e.path in world.files
      ? { value: world.files[e.path] as string }
      : { deny: "ENOENT" },
  );
  on("fs.write", (_$, e) => {
    if (world.readOnly) return { deny: "EROFS" };
    world.files[e.path] = e.text;
    return { value: undefined };
  });
  on("fs.stat", (_$, e) =>
    e.path in world.files || e.path === "/p"
      ? {
          value: {
            kind: e.path === "/p" ? "dir" : "file",
            size: 0,
            mtimeMs: 0,
            isLink: false,
            realPath: real(e.path),
          },
        }
      : { deny: "ENOENT" },
  );
  on("process.run", (_$, e) => {
    world.runs.push([...e.argv]);
    const file = e.argv[0] === "git" ? world.bin.git : e.argv[0];
    if (file !== undefined && file === world.fakeGit)
      return fakeGitRun(e.argv, e.init?.stdin);
    if (e.argv[0]?.endsWith("git")) return gitRun(world, e.argv, e.init?.stdin);
    if (e.argv[0]?.endsWith("sh"))
      return ran(`ssh=${world.bin.ssh}\ngit=${world.bin.git}\n`);
    if (e.argv[0]?.endsWith("rm")) return rmRun(world, e.argv);
    return ran("");
  });
  return world;
};

/** The call `t1`: `$.tool.call` raises `classic.PreToolUse`, and the stub of `tool.call` stands for core. */
const before = ($: Engine, id = "t1") =>
  $.tool.call({ tool: "Bash", tool_use_id: id, command: "x" });

/** The `PostToolUse` of the `Bash` call `t1` with the field `diff` in `tool_response`. */
const after = ($: Engine, diff?: unknown, id = "t1") =>
  $.classic.PostToolUse({
    tool_name: "Bash",
    tool_input: { command: "x" },
    tool_response: diff === undefined ? {} : { bashEditDiff: diff },
    tool_use_id: id,
  });

const listed = (...paths: string[]) => ({
  files: paths.map((filePath) => ({ filePath, hunks: [] })),
  moreFiles: 0,
  changedFiles: paths.map(real),
});

const UNAVAILABLE = { files: [], moreFiles: 0, unavailable: true };

/** The call ticks `tasks.md`, and the tick must be written back with a line that names `Edit`. */
const tickUndone = async ($: Engine, world: World) => {
  world.files[TASKS] = TICKED;
  const answer = await after($, listed(TASKS));
  expect(world.files[TASKS]).toBe(OPEN);
  expect((answer.additionalContext ?? []).join("\n")).toContain("`Edit`");
};

test("Tick Undone: a `Bash` tick of a `tasks.md` is written back, and the line names `Edit`", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  await before($);
  await tickUndone($, world);
});

test("Other Write: a `Bash` write of a file that is not protected stays", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN, "/p/src/a.ts": "one\n" });
  repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN });
  await before($);
  world.files["/p/src/a.ts"] = "two\n";
  const answer = await after($, listed("/p/src/a.ts"));
  expect(world.files["/p/src/a.ts"]).toBe("two\n");
  expect(answer.additionalContext ?? []).toStrictEqual([]);
});

test("Text Change: a `Bash` change of a `tasks.md` that leaves each box as it was stays", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN });
  await before($);
  world.files[TASKS] = "- [ ] 1.1 first, changed\n- [ ] 1.2 second\n";
  const answer = await after($, listed(TASKS));
  expect(world.files[TASKS]).toContain("changed");
  expect(answer.additionalContext ?? []).toStrictEqual([]);
});

test("Unavailable Field: with `unavailable` in the field, the hashes find the tick and it is undone", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN, [GOAL]: '{"check":"just check"}' });
  await before($);
  world.files[TASKS] = TICKED;
  const answer = await after($, UNAVAILABLE);
  expect(world.files[TASKS]).toBe(OPEN);
  expect((answer.additionalContext ?? []).join("\n")).toContain("`Edit`");
});

test("Missing Field: with no field, the hashes find a changed baseline and it is written back", async ($: Engine, on: On) => {
  const world = stub(on, { [BASELINE]: '{"clones":[]}' });
  await before($);
  world.files[BASELINE] = '{"clones":["a"]}';
  await after($);
  expect(world.files[BASELINE]).toBe('{"clones":[]}');
});

test("Created File: a protected file that the call created is deleted", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  await before($);
  world.files[GOAL] = '{"check":"true"}';
  await after($, listed(GOAL));
  expect(GOAL in world.files).toBe(false);
});

test("Plan File: a changed plan file is written back", async ($: Engine, on: On) => {
  const plan = "/p/openspec/changes/x/design.md";
  const world = stub(on, { [plan]: "one\n" });
  await before($);
  world.files[plan] = "two\n";
  await after($, UNAVAILABLE);
  expect(world.files[plan]).toBe("one\n");
});

test("Field Switch: `session.start` turns on `bashEditDiff` with the env var", async ($: Engine, on: On) => {
  const world = stub(on, {});
  await $.session.start({
    cwd: "/p",
    surface: "terminal",
    isInteractive: true,
  });
  expect(world.env["CLAUDE_CODE_BASH_EDIT_DIFF"]).toBe("1");
});

const REFS = "for-each-ref --format=%(objectname) %(refname)";
const OLD = "a".repeat(40);
const NEW = "b".repeat(40);
const FETCHED = "c".repeat(40);
const REAL = "https://example.com/real.git";
const ELSEWHERE = "https://example.net/other.git";
const INDEX_DIFF = "diff-index --cached --name-only HEAD --";

/** The server at `url` has `sha` at the branch `main`. */
const serve = (world: World, url: string, sha: string) => {
  world.servers[url] = { "refs/heads/main": sha };
};

/** A repo with the branch `main` at `OLD` before the call, and the remote `origin` at `REAL`; `blobs` is the `tasks.md` of each commit. */
const repo = (world: World, refs: string, blobs: Record<string, string>) => {
  world.git[REFS] = refs;
  setUrl(world, "origin", REAL);
  serve(world, REAL, OLD);
  world.git["rev-parse HEAD"] = `${OLD}\n`;
  world.git["stash list --format=%H"] = "";
  world.files["/p/.git"] = "gitdir: /p/.git-dir\n";
  Object.assign(world.blobs, blobs);
};

/** The call ticks `tasks.md` (`before` is its text, or `undefined` for a new file) and `git checkout` of a branch from before brings the tick. The file stays. */
const checkoutTick = async ($: Engine, on: On, before_?: string) => {
  const world = stub(on, before_ === undefined ? {} : { [TASKS]: before_ });
  repo(world, `${OLD} refs/heads/main\n${NEW} refs/heads/other`, {
    [NEW]: TICKED,
  });
  await before($);
  world.files[TASKS] = TICKED;
  const answer = await after($, listed(TASKS));
  expect(world.files[TASKS]).toBe(TICKED);
  expect(answer.additionalContext ?? []).toStrictEqual([]);
};

test("Git Checkout: a tick that `git checkout` of a branch from before brings stays", async ($: Engine, on: On) => {
  await checkoutTick($, on, OPEN);
});

/** The call moves `origin/main` to `FETCHED` and ticks `tasks.md`. `setup` sets the config before the first call. `change` sets what the call did to the remote: the server, the config, or the refs. */
const remoteMoved = async (
  $: Engine,
  on: On,
  change: (world: World) => void,
  setup: (world: World) => void = () => undefined,
) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main\n${OLD} refs/remotes/origin/main`, {
    [FETCHED]: TICKED,
  });
  setup(world);
  await before($);
  world.git[REFS] =
    `${OLD} refs/heads/main\n${FETCHED} refs/remotes/origin/main`;
  change(world);
  world.files[TASKS] = TICKED;
  await after($, listed(TASKS));
  return world;
};

test("Git Pull: a tick from a commit that a remote-tracking ref got in the call stays", async ($: Engine, on: On) => {
  const world = await remoteMoved($, on, (w) => serve(w, REAL, FETCHED));
  expect(world.files[TASKS]).toBe(TICKED);
});

test("Update Ref: a tick from a remote-tracking ref that the call moved with `update-ref` is undone, as the remote has another sha", async ($: Engine, on: On) => {
  const world = await remoteMoved($, on, (w) => serve(w, REAL, OLD));
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Remote Url Changed: a tick from a ref that the call fetched from its own URL, set with `git config remote.origin.url`, is undone", async ($: Engine, on: On) => {
  const world = await remoteMoved($, on, (w) => {
    setUrl(w, "origin", "/tmp/x");
    serve(w, "/tmp/x", FETCHED);
  });
  expect(world.files[TASKS]).toBe(OPEN);
});

test("New Remote: a tick from a ref of a remote that the call added is undone, as the remote had no URL at the first call", async ($: Engine, on: On) => {
  const world = await remoteMoved($, on, (w) => {
    setUrl(w, "evil", ELSEWHERE);
    serve(w, ELSEWHERE, FETCHED);
    w.git[REFS] = `${OLD} refs/heads/main\n${FETCHED} refs/remotes/evil/main`;
  });
  expect(world.files[TASKS]).toBe(OPEN);
});

const GH = "https://h.invalid/x/y";
const SSH_URL = "git@h.invalid:x/y.git";

/** `origin` is `gh:x/y`, which `url.https://h.invalid/.insteadOf=gh:` turns into `GH`. */
const aliased = (world: World) => {
  setUrl(world, "origin", "gh:x/y");
  setConfig(world, LOCAL, "url.https://h.invalid/.insteadof", "gh:");
  serve(world, GH, OLD);
};

/** `origin` is the `ssh` URL `SSH_URL`, and the server there has `OLD`. */
const overSsh = (world: World) => {
  setUrl(world, "origin", SSH_URL);
  serve(world, SSH_URL, OLD);
};

/** The call makes the server `via` a command have `FETCHED`: its own repo. */
const evilVia = (world: World, command: string) => {
  world.servers[`via:${command}`] = { "refs/heads/main": FETCHED };
};

test("Aliased Url: a tick from a ref that a remote with an `insteadOf` URL got stays when the config is as it was", async ($: Engine, on: On) => {
  const world = await remoteMoved($, on, (w) => serve(w, GH, FETCHED), aliased);
  expect(world.files[TASKS]).toBe(TICKED);
});

test("Rewritten Url: a tick is undone when the call set `url.<base>.insteadOf` for the pinned URL to a repo of its own, as `git remote -v` does not show it", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => {
      setConfig(w, LOCAL, "url.file:///tmp/evil.insteadof", GH);
      serve(w, "file:///tmp/evil", FETCHED);
    },
    aliased,
  );
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Ssh Url: a tick from a ref that an `ssh` remote got stays when the config is as it was", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => serve(w, SSH_URL, FETCHED),
    overSsh,
  );
  expect(world.files[TASKS]).toBe(TICKED);
});

test("Ssh Command: a tick is undone when the call set `core.sshCommand` to a script that serves its own repo", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => {
      setConfig(w, LOCAL, "core.sshcommand", "evil");
      evilVia(w, "evil");
    },
    overSsh,
  );
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Global Ssh Command: a tick is undone when the call set `core.sshCommand` in the global config", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => {
      setConfig(w, GLOBAL, "core.sshcommand", "evil");
      evilVia(w, "evil");
    },
    overSsh,
  );
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Ssh Config: a tick is undone when the call wrote a `ProxyCommand` in `~/.ssh/config`", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => {
      w.files[SSH_CONFIG] = "Host *\n  ProxyCommand evil\n";
      evilVia(w, "evil");
    },
    overSsh,
  );
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Ssh Env: a tick is undone when `GIT_SSH_COMMAND` changed after the first call", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => {
      w.env["GIT_SSH_COMMAND"] = "evil";
      evilVia(w, "evil");
    },
    overSsh,
  );
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Ssh Include: a tick from an `ssh` remote is undone when `~/.ssh/config` has an `Include` line, which the code cannot read", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => serve(w, SSH_URL, FETCHED),
    (w) => {
      overSsh(w);
      w.files[SSH_CONFIG] = "Include conf.d/*\n";
    },
  );
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Include Https: an `Include` line in `~/.ssh/config` does not stop the trust of an `https` remote", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => serve(w, REAL, FETCHED),
    (w) => {
      w.files[SSH_CONFIG] = "Include conf.d/*\n";
    },
  );
  expect(world.files[TASKS]).toBe(TICKED);
});

/** The call writes `lines` to the config, which `git remote -v` does not show. */
const NOT_READ = [
  "branch.feat.remote=origin",
  "branch.feat.merge=refs/heads/feat",
  "submodule.lib.url=https://h.invalid/lib.git",
  "submodule.lib.active=true",
];

test("Branch Config: a tick from a fetched ref stays when the call only added the keys that `git ls-remote` never reads, such as `branch.<n>.merge` after `git push -u`", async ($: Engine, on: On) => {
  const world = await remoteMoved($, on, (w) => {
    serve(w, REAL, FETCHED);
    for (const line of NOT_READ) {
      const at = line.indexOf("=");
      setConfig(w, LOCAL, line.slice(0, at), line.slice(at + 1));
    }
  });
  expect(world.files[TASKS]).toBe(TICKED);
});

test("Read Key: a tick is undone when the call added a key that `git ls-remote` reads, here `http.proxy`", async ($: Engine, on: On) => {
  const world = await remoteMoved($, on, (w) => {
    serve(w, REAL, FETCHED);
    setConfig(w, LOCAL, "http.proxy", "http://evil.invalid:3128");
  });
  expect(world.files[TASKS]).toBe(OPEN);
});

/** The ssh remote with a program that the pinned settings name: the call rewrites the program, so the text of every setting is as it was, and `git ls-remote` gets a fake advertisement. */
const programRewritten =
  (setup: (world: World) => void, program: string) =>
  async ($: Engine, on: On) => {
    const world = await remoteMoved(
      $,
      on,
      (w) => evilVia(w, program),
      (w) => {
        overSsh(w);
        setup(w);
      },
    );
    expect(world.files[TASKS]).toBe(OPEN);
  };

test(
  "Pinned Ssh Command: a tick is undone when `core.sshCommand` names a script at the pin, which the call rewrites",
  programRewritten(
    (w) => setConfig(w, LOCAL, "core.sshcommand", "evil"),
    "evil",
  ),
);

test(
  "Pinned Ssh Env: a tick is undone when `GIT_SSH_COMMAND` names a script at the pin",
  programRewritten((w) => {
    w.env["GIT_SSH_COMMAND"] = "evil";
  }, "evil"),
);

test(
  "Pinned Git Ssh: a tick is undone when `GIT_SSH` names a program at the pin",
  programRewritten((w) => {
    w.env["GIT_SSH"] = "/home/u/wrap.sh";
  }, "/home/u/wrap.sh"),
);

for (const keyword of [
  "ProxyCommand",
  "ProxyJump",
  "LocalCommand",
  "KnownHostsCommand",
])
  test(
    `Pinned ${keyword}: a tick is undone when \`~/.ssh/config\` has a \`${keyword}\` line at the pin`,
    programRewritten((w) => {
      w.files[SSH_CONFIG] = `Host *\n  ${keyword} evil\n`;
    }, "evil"),
  );

test("Pinned Git Proxy: a tick from a `git://` remote is undone when `core.gitProxy` names a program at the pin", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => evilVia(w, "evil"),
    (w) => {
      setUrl(w, "origin", "git://h.invalid/x/y");
      serve(w, "git://h.invalid/x/y", OLD);
      setConfig(w, LOCAL, "core.gitproxy", "evil");
    },
  );
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Plain Ssh Command: a tick from an `ssh` remote stays when `core.sshCommand` is `ssh` with a key file, as it names no other program", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => serve(w, SSH_URL, FETCHED),
    (w) => {
      overSsh(w);
      setConfig(w, LOCAL, "core.sshcommand", "ssh -i ~/.ssh/key");
    },
  );
  expect(world.files[TASKS]).toBe(TICKED);
});

test("Https Helpers: a tick from an `https` remote stays when a credential helper and `core.askPass` are set, as they cannot change the refs", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => serve(w, REAL, FETCHED),
    (w) => {
      setConfig(w, LOCAL, "credential.helper", "!evil");
      setConfig(w, LOCAL, "core.askpass", "/home/u/ask.sh");
      w.env["GIT_ASKPASS"] = "/home/u/ask.sh";
    },
  );
  expect(world.files[TASKS]).toBe(TICKED);
});

const FAKE_SSH = "/home/u/bin/ssh";

test("Fake Ssh: a tick from an `ssh` remote is undone when an `ssh` earlier in `PATH` appeared after the pin", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => {
      w.bin.ssh = FAKE_SSH;
      w.servers[`via:bin:${FAKE_SSH}`] = { "refs/heads/main": FETCHED };
    },
    overSsh,
  );
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Fake Git: a tick from an `https` remote is undone when a `git` earlier in `PATH` appeared after the pin", async ($: Engine, on: On) => {
  const world = await remoteMoved($, on, (w) => {
    w.bin.git = "/home/u/bin/git";
    w.servers["via:bin:/home/u/bin/git"] = { "refs/heads/main": FETCHED };
  });
  expect(world.files[TASKS]).toBe(OPEN);
});

/** The tick is in a commit from before the session, so a trusted pin keeps it. `setup` runs before the pin, `change` after it and before the call ticks `tasks.md`. */
const trustedTick = async (
  $: Engine,
  on: On,
  setup: (w: World) => void,
  change: (w: World) => void,
) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main\n${NEW} refs/heads/other`, {
    [NEW]: TICKED,
  });
  setup(world);
  await before($);
  change(world);
  world.files[TASKS] = TICKED;
  await after($, listed(TASKS));
  return world;
};

test("Same Git: a tick from a commit from before stays when `git` is the same file at the undo", async ($: Engine, on: On) => {
  const world = await trustedTick(
    $,
    on,
    () => undefined,
    () => undefined,
  );
  expect(world.files[TASKS]).toBe(TICKED);
});

test("Fake Git Name: a tick is undone when a `git` earlier in `PATH` appeared after the pin and a run by the name `git` would find it", async ($: Engine, on: On) => {
  const world = await trustedTick(
    $,
    on,
    () => undefined,
    (w) => {
      w.bin.git = "/usr/local/bin/git";
      w.fakeGit = "/usr/local/bin/git";
    },
  );
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Git Gone: a tick is undone when `PATH` has no `git` at the undo", async ($: Engine, on: On) => {
  const world = await trustedTick(
    $,
    on,
    () => undefined,
    (w) => {
      w.bin.git = "";
    },
  );
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Git Overwritten: a tick is undone when the pinned `git` is a file under the home folder that a call overwrote after the pin", async ($: Engine, on: On) => {
  const world = await trustedTick(
    $,
    on,
    (w) => {
      w.bin.git = "/home/u/.local/bin/git";
    },
    (w) => {
      w.fakeGit = "/home/u/.local/bin/git";
    },
  );
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Writable Ssh: a tick from an `ssh` remote is undone when `ssh` is a file under the home folder at the pin, which the call can rewrite", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => {
      w.servers[`via:bin:${FAKE_SSH}`] = { "refs/heads/main": FETCHED };
    },
    (w) => {
      overSsh(w);
      w.bin.ssh = FAKE_SSH;
    },
  );
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Writable Ssh Https: a tick from an `https` remote stays when only `ssh` is under the home folder", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => serve(w, REAL, FETCHED),
    (w) => {
      w.bin.ssh = FAKE_SSH;
    },
  );
  expect(world.files[TASKS]).toBe(TICKED);
});

test("Writable Git: a tick from an `https` remote is undone when `git` is a file under the home folder at the pin", async ($: Engine, on: On) => {
  const world = await remoteMoved(
    $,
    on,
    (w) => {
      w.servers["via:bin:/home/u/bin/git"] = { "refs/heads/main": FETCHED };
    },
    (w) => {
      w.bin.git = "/home/u/bin/git";
    },
  );
  expect(world.files[TASKS]).toBe(OPEN);
});

/** Another write lands the pin `seed` first, and a call ticks `tasks.md` with `NEW` as a known commit that has the tick. */
const seededTick = async ($: Engine, on: On, seed: Record<string, unknown>) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN, [NEW]: TICKED });
  world.beforeSet = () =>
    world.store.set("bashKnown/session", {
      value: { commits: [NEW], remotes: {}, urls: {}, ...seed },
      version: 1,
    });
  await before($);
  world.files[TASKS] = TICKED;
  await after($, listed(TASKS));
  return world;
};

test("First Pin: a pin that another write landed first keeps the first pin, so its commit is trusted", async ($: Engine, on: On) => {
  const world = await seededTick($, on, { git: BIN.git });
  expect(world.files[TASKS]).toBe(TICKED);
});

test("Pin Without Git: a tick is undone when the pin has no `git` path", async ($: Engine, on: On) => {
  const world = await seededTick($, on, {});
  expect(world.files[TASKS]).toBe(OPEN);
});

/** A call ticks `tasks.md` and writes a new `.jscpd-baseline.json`, and `/bin/rm` ends as `rm`. */
const removeFails = async ($: Engine, on: On, rm: World["rm"]) => {
  const world = stub(on, { [TASKS]: OPEN });
  world.rm = rm;
  await before($);
  world.files[TASKS] = TICKED;
  world.files[BASELINE] = '{"clones":[]}';
  const answer = await after($, listed(TASKS, BASELINE));
  expect(world.files[TASKS]).toBe(OPEN);
  const notes = answer.additionalContext ?? [];
  const [tasks, baseline] = [
    "openspec/changes/x/tasks.md",
    ".jscpd-baseline.json",
  ];
  // The restored file and the file that is still there are named in separate lines.
  expect(notes.find((n) => n.includes(tasks))).not.toContain(baseline);
  expect(notes.some((n) => n.includes(baseline) && !n.includes(tasks))).toBe(
    true,
  );
};

test("Rm Rejects: when `/bin/rm` cannot run, the restored file and the created file that is still there each get a line", async ($: Engine, on: On) => {
  await removeFails($, on, "reject");
});

test("Rm Fails: a file that `/bin/rm` could not delete gets its own line, not the line of the undone files", async ($: Engine, on: On) => {
  await removeFails($, on, "fail");
});

/** A repo with an `ssh` remote and `origin/main` at `OLD`. */
const sshRepo = (on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main\n${OLD} refs/remotes/origin/main`, {
    [FETCHED]: TICKED,
  });
  overSsh(world);
  return world;
};

/** `core.sshCommand` is a script with its own repo. */
const evilConfig = (world: World) => {
  setConfig(world, LOCAL, "core.sshcommand", "evil");
  evilVia(world, "evil");
};

/** The call moves `origin/main` to `FETCHED` and ticks `tasks.md`. */
const moveAndTick = (world: World, $: Engine) => {
  world.git[REFS] =
    `${OLD} refs/heads/main\n${FETCHED} refs/remotes/origin/main`;
  world.files[TASKS] = TICKED;
  return after($, listed(TASKS));
};

test("Config Before First Call: a tick is undone when the config was changed after `session.start` and before the first `Bash` call", async ($: Engine, on: On) => {
  const world = sshRepo(on);
  await $.session.start({
    cwd: "/p",
    surface: "terminal",
    isInteractive: true,
  });
  await new Promise((resolve) => setTimeout(resolve, 20)); // The pin does not hold the start.
  evilConfig(world);
  await before($);
  await moveAndTick(world, $);
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Config Line: the undo of a tick that a changed config made untrusted gets a second line", async ($: Engine, on: On) => {
  const world = sshRepo(on);
  await before($);
  evilConfig(world);
  const answer = await moveAndTick(world, $);
  expect(answer.additionalContext ?? []).toHaveLength(2);
});

test("Local Remote: a tick from a remote with a path as URL is undone, as the call can write the path", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main\n${OLD} refs/remotes/origin/main`, {
    [FETCHED]: TICKED,
  });
  setUrl(world, "origin", "/srv/repo.git");
  serve(world, "/srv/repo.git", OLD);
  await before($);
  world.git[REFS] =
    `${OLD} refs/heads/main\n${FETCHED} refs/remotes/origin/main`;
  serve(world, "/srv/repo.git", FETCHED);
  world.files[TASKS] = TICKED;
  await after($, listed(TASKS));
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Own Commit: a tick that the call wrote and committed is undone, as the new `HEAD` is not from before", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN });
  await before($);
  world.git[REFS] = `${NEW} refs/heads/main`;
  world.git["rev-parse HEAD"] = `${NEW}\n`;
  world.blobs[NEW] = TICKED;
  await tickUndone($, world);
});

test("No Git Match: a tick that no commit from before has is undone", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main\n${NEW} refs/heads/other`, {
    [OLD]: OPEN,
    [NEW]: OPEN,
  });
  await before($);
  world.files[TASKS] = TICKED;
  await after($, listed(TASKS));
  expect(world.files[TASKS]).toBe(OPEN);
});

test("No Repo: a tick with no git repo is undone", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  await before($);
  world.files[TASKS] = TICKED;
  await after($, listed(TASKS));
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Deleted File: a call that deletes a `tasks.md` gets it written back, and the line names `Edit`", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  await before($);
  delete world.files[TASKS];
  const answer = await after($, listed(TASKS));
  expect(world.files[TASKS]).toBe(OPEN);
  expect((answer.additionalContext ?? []).join("\n")).toContain("`Edit`");
});

test("Session Commit: a tick from a ref that an earlier call of the session moved is undone in a later call", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN });
  await before($, "t1");
  world.git[REFS] = `${NEW} refs/heads/main`;
  await after($, undefined, "t1");
  world.blobs[NEW] = TICKED;
  await before($, "t2");
  world.files[TASKS] = TICKED;
  await after($, listed(TASKS), "t2");
  expect(world.files[TASKS]).toBe(OPEN);
});

/** More refs than `GIT_COMMITS_MAX` (200), none with the blob. */
const manyRefs = () =>
  Array.from(
    { length: 250 },
    (_, i) => `${i.toString(16).padStart(40, "0")} refs/tags/t${i}`,
  ).join("\n");

/** More than 200 refs with none of the blob, and the tick in the commit `NEW`, which `where` makes known: `"stash"` or `"HEAD"`. The call ticks `tasks.md`. */
const manyRefsTick = async ($: Engine, on: On, where: "stash" | "HEAD") => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, manyRefs(), {});
  if (where === "stash") world.git["stash list --format=%H"] = `${NEW}\n`;
  else world.git["rev-parse HEAD"] = `${NEW}\n`;
  world.blobs[NEW] = TICKED;
  await before($);
  world.files[TASKS] = TICKED;
  await after($, listed(TASKS));
  return world.files[TASKS];
};

test("Many Refs, Stash: a tick that `git stash pop` brings stays with more than 200 refs", async ($: Engine, on: On) => {
  expect(await manyRefsTick($, on, "stash")).toBe(TICKED);
});

test("Many Refs, HEAD: a tick that `git checkout` of the detached `HEAD` brings stays with more than 200 refs", async ($: Engine, on: On) => {
  expect(await manyRefsTick($, on, "HEAD")).toBe(TICKED);
});

test("Deleted File Not Listed: a deleted `tasks.md` that the diff does not list is written back", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN, "/p/src/a.ts": "one\n" });
  await before($);
  delete world.files[TASKS];
  const answer = await after($, listed("/p/src/a.ts"));
  expect(world.files[TASKS]).toBe(OPEN);
  expect((answer.additionalContext ?? []).join("\n")).toContain("`Edit`");
});

test("Pulled New File: a `tasks.md` that `git checkout` of a branch from before brings new stays", async ($: Engine, on: On) => {
  await checkoutTick($, on);
});

test("Written New File: a ticked `tasks.md` that the call wrote and no commit from before has is deleted, also in a repo", async ($: Engine, on: On) => {
  const world = stub(on, {});
  repo(world, `${OLD} refs/heads/main\n${NEW} refs/heads/other`, {
    [OLD]: OPEN,
  });
  await before($);
  world.files[TASKS] = TICKED;
  const answer = await after($, listed(TASKS));
  expect(TASKS in world.files).toBe(false);
  expect((answer.additionalContext ?? []).join("\n")).toContain("`Edit`");
});

test("One Lookup: the commits repeat in the refs, and one git call looks up the blob in the distinct ones", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main\n${manyRefs()}`, {});
  world.git["stash list --format=%H"] = `${OLD}\n`;
  await before($);
  world.files[TASKS] = TICKED;
  await after($, listed(TASKS));
  const lines = world.lookups
    .join("")
    .split("\n")
    .filter((l) => l !== "");
  expect(world.lookups).toHaveLength(1);
  expect(new Set(lines).size).toBe(lines.length);
  expect(lines.length).toBeLessThanOrEqual(200);
  expect(world.runs.filter((r) => r.includes("show"))).toStrictEqual([]);
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Replaced Remote Commit: a tick whose blob only a `git replace` of a fetched commit gives is undone", async ($: Engine, on: On) => {
  const world = await remoteMoved($, on, (w) => {
    serve(w, REAL, FETCHED);
    w.blobs[FETCHED] = OPEN;
    w.replaced[FETCHED] = NEW;
    w.blobs[NEW] = TICKED;
  });
  expect(world.files[TASKS]).toBe(OPEN);
});

test("Replaced Commit: a tick whose blob only a `git replace` of a known commit gives is undone", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN, [NEW]: TICKED });
  await before($);
  world.replaced[OLD] = NEW;
  await tickUndone($, world);
});

/** The text of `tasks.md` after a call wrote `tree` while the branch `other`, which is from before, has `blob`. */
const treeAgainst = async ($: Engine, on: On, blob: string, tree: string) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main\n${NEW} refs/heads/other`, {
    [NEW]: blob,
  });
  await before($);
  world.files[TASKS] = tree;
  await after($, listed(TASKS));
  return world.files[TASKS];
};

const CRLF = TICKED.replaceAll("\n", "\r\n");

test("CRLF Work Tree: a tick that `git checkout` brings as `\\r\\n` text of an LF blob stays", async ($: Engine, on: On) => {
  expect(await treeAgainst($, on, TICKED, CRLF)).toBe(CRLF);
});

test("CRLF Blob: a tick as `\\n` text of a blob with `\\r\\n` is undone, because a checkout never turns `\\r\\n` of a blob into `\\n`", async ($: Engine, on: On) => {
  expect(await treeAgainst($, on, CRLF, TICKED)).toBe(OPEN);
});

test("CRLF Tick: a tick written as `\\r\\n` text that no commit has is undone", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN });
  await before($);
  world.files[TASKS] = TICKED.replaceAll("\n", "\r\n");
  await after($, listed(TASKS));
  expect(world.files[TASKS]).toBe(OPEN);
});

/** The file is tracked at `OLD`, the call deletes it, `HEAD` is `head` after the call, and `git diff-index --cached` lists `staged`: empty when the index is `head`, as after `git checkout`. */
const deleteAt = async (
  $: Engine,
  on: On,
  head: string,
  staged: string,
  change: (world: World) => void = () => undefined,
) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main\n${NEW} refs/heads/before`, {
    [OLD]: OPEN,
  });
  await before($);
  world.git["rev-parse HEAD"] = `${head}\n`;
  world.git[INDEX_DIFF] = staged;
  change(world);
  delete world.files[TASKS];
  await after($, listed(TASKS));
  return world.files;
};

test("Switched Branch: a `tasks.md` gone with `git checkout` of a branch from before that lacks it is not written back", async ($: Engine, on: On) => {
  const files = await deleteAt($, on, NEW, "");
  expect(TASKS in files).toBe(false);
});

test("Removed File: a `tasks.md` that a call deletes with `HEAD` as it was, in a repo, is written back", async ($: Engine, on: On) => {
  const files = await deleteAt($, on, OLD, "");
  expect(files[TASKS]).toBe(OPEN);
});

test("Own Commit Delete: a `tasks.md` deleted and committed by the call is written back, as the new `HEAD` is not from before", async ($: Engine, on: On) => {
  const files = await deleteAt($, on, FETCHED, "");
  expect(files[TASKS]).toBe(OPEN);
});

test("Moved HEAD Delete: a `tasks.md` deleted with `git symbolic-ref`, `git update-ref --no-deref HEAD`, or `git reset --soft` to a commit from before is written back, as the index still differs from the new `HEAD`", async ($: Engine, on: On) => {
  const files = await deleteAt($, on, NEW, "openspec/changes/x/tasks.md\n");
  expect(files[TASKS]).toBe(OPEN);
});

test("Index Unreadable: a `tasks.md` deleted with a new `HEAD` is written back when git cannot compare the index", async ($: Engine, on: On) => {
  const files = await deleteAt($, on, NEW, "", (w) => {
    delete w.git[INDEX_DIFF];
  });
  expect(files[TASKS]).toBe(OPEN);
});

/** The call deletes `tasks.md` and `git pull` moves `origin/main` and `HEAD` to `FETCHED`, which lacks it. `change` sets what the call did to the remote. */
const pulledDelete = ($: Engine, on: On, change: (world: World) => void) =>
  deleteAt($, on, FETCHED, "", (w) => {
    w.git[REFS] = `${OLD} refs/heads/main\n${FETCHED} refs/remotes/origin/main`;
    change(w);
  });

test("Pulled Delete: a `tasks.md` that `git pull` removes, with a `HEAD` that the remote has, is not written back", async ($: Engine, on: On) => {
  const files = await pulledDelete($, on, (w) => serve(w, REAL, FETCHED));
  expect(TASKS in files).toBe(false);
});

test("Pulled Delete, Own Url: a `tasks.md` is written back when the new `HEAD` came from a URL that the call set", async ($: Engine, on: On) => {
  const files = await pulledDelete($, on, (w) => {
    setUrl(w, "origin", "/tmp/x");
    serve(w, "/tmp/x", FETCHED);
  });
  expect(files[TASKS]).toBe(OPEN);
});

/** The `additionalContext` lines of the `PostToolUse` of each call in `ids`, in order. */
const postLines = async ($: Engine, ids: string[]) => {
  const seen: number[] = [];
  for (const id of ids) {
    await before($, id);
    seen.push(((await after($, undefined, id)).additionalContext ?? []).length);
  }
  return seen;
};

test("No Commits Notice: when git gives no commits at the first call, the result of that call gets one line, and a later call gets none", async ($: Engine, on: On) => {
  stub(on, { [TASKS]: OPEN });
  expect(await postLines($, ["t1", "t2", "t3"])).toStrictEqual([1, 0, 0]);
});

test("Commits Known: when git gives the commits at the first call, no call gets a line", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  repo(world, `${OLD} refs/heads/main`, { [OLD]: OPEN });
  expect(await postLines($, ["t1", "t2"])).toStrictEqual([0, 0]);
});

test("Lost Notice: when the undo throws, the line for no commits is not lost for the session", async ($: Engine, on: On) => {
  const world = stub(on, { [TASKS]: OPEN });
  await before($, "t1");
  world.readOnly = true;
  world.files[TASKS] = TICKED;
  await after($, listed(TASKS), "t1");
  expect(await postLines($, ["t2"])).toStrictEqual([1]);
});
