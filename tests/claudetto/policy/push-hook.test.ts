// Runs the `pre-push` hook script of `kernel/push-hook` in a real git repository.
// The hook reaches git through `GIT_CONFIG_COUNT` and the keys, as the `env` of the settings does, so the real-git tests need git 2.54 or later.
// The remote URL looks like a GitHub remote, but `GIT_SSH_COMMAND` runs `git receive-pack` on a local bare repository, so a push that the hook lets through succeeds and a push that it stops fails with its note.
// Each test uses a temporary home folder and repository, so no real file changes.
// A push of Claude has `AGENT_ENV`, which the `policy` slice sets during a `Bash` call, and a `!` command of the user has not.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { planCommitHook } from "../../../plugins/claudetto/slices/setup/domain/commit-hook.ts";
import {
  AGENT_ENV,
  CONSENT_DIR,
  FLAT_DIR,
  LOGIN_FILE,
  ORGS_FILE,
  pushHookScript,
  safeOf,
  sessionDirOf,
} from "../../../src/kernel/push-hook/index.ts";
import { tmpDir } from "../../support/repo.ts";

const SESSION = "sess-1";
const URL = "ssh://git@localhost/them/repo.git";
const KEY = "localhost/them/repo";

const git = Bun.spawnSync(["git", "--version"]).stdout.toString();
const [major = 0, minor = 0] = (git.match(/(\d+)\.(\d+)/) ?? [])
  .slice(1)
  .map(Number);
const hooked = major > 2 || (major === 2 && minor >= 54);
const when = hooked ? test : test.skip;

const NONE = "No AI policy verdict is stored";
const FORBIDS = "forbids AI contributions";
const NO_CONSENT = "did not approve this push";

/** Writes a file with a sync call, because `Bun.write` is async. */
const put = (file: string, text: string) =>
  Bun.spawnSync(["sh", "-c", 'cat > "$0"', file], { stdin: Buffer.from(text) });

/** A repository with one commit, a home folder with the store, and a function that pushes to `url`. */
const world = async (files: Record<string, string> = {}, url: string = URL) => {
  const root = tmpDir("dc-push-hook");
  const home = path.join(root, "home");
  const repo = path.join(root, "repo");
  const store = path.join(home, ".claudetto", "policy");
  fs.mkdirSync(repo, { recursive: true });
  for (const [file, text] of Object.entries(files)) {
    const at = path.join(store, file);
    fs.mkdirSync(path.dirname(at), { recursive: true });
    put(at, text);
  }
  const env: Record<string, string> = {
    PATH: process.env["PATH"] ?? "",
    HOME: home,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
    // The keys that setup writes to the `env` of the settings.
    ...(planCommitHook({}, []) as { env: Record<string, string> }).env,
  };
  const bare = path.join(root, "bare.git");
  const ssh = path.join(root, "ssh.sh");
  put(ssh, `#!/bin/sh\nexec git receive-pack '${bare}'\n`);
  Bun.spawnSync(["chmod", "755", ssh]);
  Bun.spawnSync(["git", "init", "-q", "--bare", bare]);
  env["GIT_SSH_COMMAND"] = ssh;
  const run = (argv: string[], extra: Record<string, string> = {}) =>
    Bun.spawnSync(argv, { cwd: repo, env: { ...env, ...extra } });
  run(["git", "init", "-q", "-b", "main"]);
  run(["git", "remote", "add", "origin", url]);
  put(path.join(repo, "a.txt"), "a\n");
  run(["git", "add", "a.txt"]);
  run(
    ["git", "-c", "user.name=T", "-c", "user.email=t@e.com"].concat([
      "commit",
      "-q",
      "-m",
      "x",
    ]),
  );
  let count = 0;
  const push = (
    extra: Record<string, string> = {},
    argv = ["git", "push", "origin", "main"],
  ) => {
    // A new commit each time, because git runs the hook only when a ref changes.
    count += 1;
    put(path.join(repo, "a.txt"), `${count}\n`);
    run(["git", "add", "a.txt"]);
    run([
      "git",
      "-c",
      "user.name=T",
      "-c",
      "user.email=t@e.com",
      "commit",
      "-q",
      "-m",
      `c${count}`,
    ]);
    const out = run(argv, {
      CLAUDE_CODE_SESSION_ID: SESSION,
      [AGENT_ENV]: "1",
      ...extra,
    });
    return { code: out.exitCode, err: out.stderr.toString() };
  };
  return { push, store, run };
};

const flat = (verdict: string, key = KEY) => ({
  [`${FLAT_DIR}/${safeOf(key)}`]: verdict,
});
const token = (at: number, key = KEY) => ({
  [`${CONSENT_DIR}/${sessionDirOf(SESSION)}/${safeOf(key)}`]: String(at),
});
const now = () => Math.floor(Date.now() / 1000);

test("the hook script reads the marker of a call of Claude", () => {
  expect(pushHookScript()).toContain(`\${${AGENT_ENV}:-}`);
});

when("a push with no marker of a call of Claude passes the hook", async () => {
  for (const verdict of ["silent", "forbidden"]) {
    const w = await world({ ...flat(verdict), [LOGIN_FILE]: "me" });
    const out = w.run(["git", "push", "origin", "main"], {
      CLAUDE_CODE_SESSION_ID: SESSION,
    });
    expect(out.exitCode).toBe(0);
  }
});

when("a push to a repository of the login passes the hook", async () => {
  const w = await world({ [LOGIN_FILE]: "Them\n" });
  expect(w.push().code).toBe(0);
});

when(
  "a push to an organization that the user owns passes the hook",
  async () => {
    const w = await world({ [LOGIN_FILE]: "me", [ORGS_FILE]: "acme\nThem\n" });
    expect(w.push().code).toBe(0);
  },
);

when(
  "a push to an organization that is not in the file is checked",
  async () => {
    const w = await world({ [LOGIN_FILE]: "me", [ORGS_FILE]: "acme\nthemx\n" });
    expect(w.push().err).toContain(NONE);
  },
);

when("a push with no verdict is rejected and names a plain push", async () => {
  const w = await world({ [LOGIN_FILE]: "me" });
  const out = w.push();
  expect(out.code).not.toBe(0);
  expect(out.err).toContain(NONE);
  expect(out.err).toContain(KEY);
});

when("a push to a forbidden repository is rejected", async () => {
  const w = await world({ ...flat("forbidden"), [LOGIN_FILE]: "me" });
  expect(w.push().err).toContain(FORBIDS);
});

when("an allowed verdict and a conditions verdict pass the hook", async () => {
  for (const verdict of ["allowed", "conditions"]) {
    const w = await world({ ...flat(verdict), [LOGIN_FILE]: "me" });
    const out = w.push();
    expect(out.code).toBe(0);
  }
});

when("a silent verdict with no token is rejected", async () => {
  const w = await world(flat("silent"));
  const out = w.push();
  expect(out.code).not.toBe(0);
  expect(out.err).toContain(NO_CONSENT);
});

when("a fresh token passes once and the next push is rejected", async () => {
  const w = await world({ ...flat("silent"), ...token(now()) });
  expect(w.push().code).toBe(0);
  expect(w.push().err).toContain(NO_CONSENT);
});

when("a stale token and a token of another session are rejected", async () => {
  const stale = await world({ ...flat("silent"), ...token(now() - 100000) });
  expect(stale.push().err).toContain(NO_CONSENT);
  const other = await world({ ...flat("silent"), ...token(now()) });
  expect(other.push({ CLAUDE_CODE_SESSION_ID: "sess-2" }).err).toContain(
    NO_CONSENT,
  );
});

when("a token of another repository is rejected", async () => {
  const w = await world({
    ...flat("silent"),
    ...token(now(), "localhost/x/y"),
  });
  expect(w.push().err).toContain(NO_CONSENT);
});

when("a push from a script, an alias, and a subshell is rejected", async () => {
  const w = await world({ [LOGIN_FILE]: "me" });
  const script = path.join(path.dirname(w.store), "..", "push.sh");
  put(script, "#!/bin/sh\ngit push origin main\n");
  for (const argv of [
    ["sh", script],
    ["git", "-c", "alias.p=push", "p", "origin", "main"],
    ["sh", "-c", "(cd . && git push origin main)"],
  ])
    expect(w.push({}, argv).err).toContain(NONE);
});

when("a push of another branch name is also checked", async () => {
  const w = await world({ [LOGIN_FILE]: "me" });
  expect(w.push({}, ["git", "push", "origin", "main:other"]).err).toContain(
    NONE,
  );
});

// The URL forms are tested with the script itself, which a shell runs as git does.
const urlRun = async (url: string, files: Record<string, string>) => {
  const w = await world(files);
  const script = `${pushHookScript()} "$@"`;
  const out = Bun.spawnSync(["sh", "-c", script, "hook", "origin", url], {
    env: {
      PATH: process.env["PATH"] ?? "",
      HOME: path.dirname(path.dirname(w.store)),
      CLAUDE_CODE_SESSION_ID: SESSION,
      [AGENT_ENV]: "1",
    },
  });
  return { code: out.exitCode, err: out.stderr.toString() };
};

test("each URL form of a remote gives the same key", async () => {
  const forms = [
    "https://github.com/Them/Repo.git",
    "https://user@github.com/them/repo/",
    "ssh://git@github.com:22/them/repo.git",
    "git@github.com:them/repo.git",
    "https://github.com/them/repo?x=1",
  ];
  for (const url of forms) {
    const out = await urlRun(url, { [LOGIN_FILE]: "me" });
    expect(out.code).toBe(1);
    expect(out.err).toContain("github.com/them/repo");
  }
});

test("a remote with no owner, a path, or a login match passes", async () => {
  for (const url of [
    "/srv/git/repo.git",
    "file:///srv/repo",
    "https://h/x",
    "../repo",
  ])
    expect((await urlRun(url, {})).code).toBe(0);
  expect(
    (await urlRun("git@github.com:Me/repo.git", { [LOGIN_FILE]: "me" })).code,
  ).toBe(0);
});

test("a key with dots and slashes cannot reach another file", async () => {
  const out = await urlRun(
    "https://h/../../etc/x",
    flat("allowed", "h/../../etc/x"),
  );
  expect(out.code).not.toBe(0);
});
