// Pins where `claudetto-sandbox` gets the login token and where it keeps its files.
// The tool runs as a child process with a fake `claude`, a fake `security`
// first on `PATH`, and a temporary `HOME`, so no test reads the real Keychain or `~/.claude`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { withPathFirst, writeProgram } from "../../support/fake-program.ts";
import { type Env, PLUGINS, tmpDir } from "../../support/repo.ts";
import { spawnText } from "../fixture-repo.ts";

const TOOL = path.join(PLUGINS, "claudetto-lab/bin/claudetto-sandbox");
const BROWSER = path.join(PLUGINS, "claudetto-browser");
const REAL_HOME = os.homedir();

/** The parsed output of the fake `claude`, which writes it to `out`. */
type Seen = {
  env: Env;
  argv: string[];
  cwd: string;
};

const FAKE_CLAUDE = `(async () => {
await Bun.write(process.env.FAKE_OUT, JSON.stringify({ env: process.env, argv: process.argv.slice(2), cwd: process.cwd() }));
})();
`;
// Prints the token in `FAKE_KEYCHAIN` as the Keychain JSON, or fails when the variable is not set.
const FAKE_SECURITY = `const t = process.env.FAKE_KEYCHAIN;
if (!t) process.exit(44);
process.stdout.write(JSON.stringify({ claudeAiOauth: { accessToken: t } }));
`;

type Setup = { dir: string; bin: string; home: string; out: string };

const setUp = async (): Promise<Setup> => {
  const dir = tmpDir("lab-sandbox");
  const bin = path.join(dir, "bin");
  const home = path.join(dir, "home");
  fs.mkdirSync(bin);
  fs.mkdirSync(path.join(home, ".claude"), { recursive: true });
  for (const [name, text] of [
    ["claude", FAKE_CLAUDE],
    ["security", FAKE_SECURITY],
  ] as const)
    await writeProgram(bin, name, text);
  return { dir, bin, home, out: path.join(dir, "out.json") };
};

// The token values that the tests set.
// A failed check must not print a real token, so `shown` gives a value only when it is one of these.
const FIXTURE_TOKENS = new Set([
  "env-token",
  "file-token",
  "keychain-token",
  "secret-token-4711",
]);

/** The token as a check may print it: a fixture value, `undefined`, or a mark for any other value. */
const shown = (token: string | undefined) =>
  token === undefined || FIXTURE_TOKENS.has(token)
    ? token
    : "<a token that no test set>";

const writeCredentials = async (home: string, token: string) => {
  await Bun.write(
    path.join(home, ".claude", ".credentials.json"),
    JSON.stringify({ claudeAiOauth: { accessToken: token } }),
  );
};

/** Runs the tool. `extra` sets or (with `undefined`) removes environment variables. */
const run = async (s: Setup, extra: Env = {}, args: string[] = []) => {
  const base = withPathFirst(process.env, s.bin);
  // An `extra.PATH` replaces the search path. Windows names it `Path`, so the old key goes first.
  if ("PATH" in extra)
    for (const key of Object.keys(base))
      if (key.toUpperCase() === "PATH") delete base[key];
  const env: Env = {
    ...base,
    HOME: s.home,
    // Windows finds the home folder in `USERPROFILE`.
    USERPROFILE: s.home,
    FAKE_OUT: s.out,
    ...extra,
  };
  for (const name of [
    "CLAUDE_CODE_OAUTH_TOKEN",
    "CLAUDE_CONFIG_DIR",
    ...Object.keys(extra).filter((k) => extra[k] === undefined),
  ])
    if (!(name in extra) || extra[name] === undefined) delete env[name];
  const sandbox = path.join(s.dir, "sandbox");
  // `--no-env-file` is the flag of the shebang of the tool, so Bun does not load a `.env` of the developer.
  const argv = ["--no-env-file", TOOL, "--dir", sandbox, ...args];
  const r = spawnText(process.execPath, argv, { env });
  // The fake `claude` writes `Seen` to `out`, so the file is `null` when no child ran.
  const seen = (
    fs.existsSync(s.out) ? JSON.parse(await Bun.file(s.out).text()) : null
  ) as Seen;
  return { r, seen, sandbox };
};

const filesUnder = (dir: string) =>
  fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.join(e.parentPath, e.name));

test("the env token wins over the Keychain and the credentials file", async () => {
  const s = await setUp();
  await writeCredentials(s.home, "file-token");
  const { r, seen } = await run(s, {
    CLAUDE_CODE_OAUTH_TOKEN: "env-token",
    FAKE_KEYCHAIN: "keychain-token",
  });
  expect(r.status, r.stderr).toBe(0);
  expect(shown(seen.env["CLAUDE_CODE_OAUTH_TOKEN"])).toBe("env-token");
});

test("with no env token, the credentials file gives the token", async () => {
  const s = await setUp();
  await writeCredentials(s.home, "file-token");
  const { r, seen } = await run(s);
  expect(r.status, r.stderr).toBe(0);
  expect(shown(seen.env["CLAUDE_CODE_OAUTH_TOKEN"])).toBe("file-token");
});

test.skipIf(process.platform !== "darwin")(
  "with no env token, the Keychain gives the token and wins over the file",
  async () => {
    const s = await setUp();
    await writeCredentials(s.home, "file-token");
    const { r, seen } = await run(s, { FAKE_KEYCHAIN: "keychain-token" });
    expect(r.status, r.stderr).toBe(0);
    expect(shown(seen.env["CLAUDE_CODE_OAUTH_TOKEN"])).toBe("keychain-token");
  },
);

test("with no token anywhere, the child gets none", async () => {
  const s = await setUp();
  const { r, seen } = await run(s);
  expect(r.status, r.stderr).toBe(0);
  expect(shown(seen.env["CLAUDE_CODE_OAUTH_TOKEN"])).toBe(undefined);
});

test("the token reaches the child only, and no file or output holds it", async () => {
  const s = await setUp();
  const token = "secret-token-4711";
  const { r, seen, sandbox } = await run(s, { CLAUDE_CODE_OAUTH_TOKEN: token });
  expect(shown(seen.env["CLAUDE_CODE_OAUTH_TOKEN"])).toBe(token);
  expect(!r.stdout.includes(token) && !r.stderr.includes(token)).toBeTruthy();
  const files = filesUnder(sandbox);
  expect(files.length > 0).toBeTruthy();
  for (const file of files)
    expect(!(await Bun.file(file).text()).includes(token), file).toBeTruthy();
  // The credentials file of the fake HOME is not written either.
  expect(fs.readdirSync(path.join(s.home, ".claude"))).toStrictEqual([]);
});

test("the config is in the sandbox folder, not in the real ~/.claude", async () => {
  const s = await setUp();
  const { r, seen, sandbox } = await run(s, { CLAUDE_CODE_OAUTH_TOKEN: "t" });
  expect(r.status, r.stderr).toBe(0);
  const config = path.join(path.resolve(sandbox), "config");
  expect(seen.env["CLAUDE_CONFIG_DIR"]).toBe(config);
  expect(seen.env["HOME"]).toBe(path.join(path.resolve(sandbox), "home"));
  if (process.platform === "win32")
    expect(seen.env["USERPROFILE"]).toBe(seen.env["HOME"]);
  expect(fs.existsSync(path.join(config, ".claude.json"))).toBeTruthy();
  expect(config.startsWith(process.env["TMPDIR"] as string)).toBeTruthy();
  expect(!config.startsWith(path.join(REAL_HOME, ".claude"))).toBeTruthy();
  expect(fs.realpathSync(seen.cwd)).toBe(
    fs.realpathSync(path.join(sandbox, "project")),
  );
});

test("the child gets the sandbox config and home, whatever config folder and shell folders the parent names", async () => {
  const s = await setUp();
  const user = path.join(s.dir, "user-config");
  fs.mkdirSync(user);
  const { r, seen, sandbox } = await run(s, {
    CLAUDE_CODE_OAUTH_TOKEN: "t",
    CLAUDE_CONFIG_DIR: user,
    ZDOTDIR: path.join(s.dir, "zdot"),
    XDG_CONFIG_HOME: path.join(s.dir, "xdg"),
  });
  expect(r.status, r.stderr).toBe(0);
  const root = path.resolve(sandbox);
  expect(seen.env["CLAUDE_CONFIG_DIR"]).toBe(path.join(root, "config"));
  expect(seen.env["HOME"]).toBe(path.join(root, "home"));
  expect(seen.env["ZDOTDIR"]).toBe(undefined);
  expect(seen.env["XDG_CONFIG_HOME"]).toBe(undefined);
  // The folder that the parent named is not written.
  expect(fs.readdirSync(user)).toStrictEqual([]);
});

test("the tool starts the `claude` on `PATH` with the plugin dir and the arguments", async () => {
  const s = await setUp();
  const { seen } = await run(s, { CLAUDE_CODE_OAUTH_TOKEN: "t" }, [
    "--plugin-dir",
    BROWSER,
    "--model",
    "x",
  ]);
  expect(seen.argv.slice(-2)).toStrictEqual(["--model", "x"]);
  expect(seen.argv[0]).toBe("--plugin-dir");
  expect(path.basename(seen.argv[1] as string)).toBe("claudetto-browser");
});

test("--clean removes the sandbox folder and starts no claude", async () => {
  const s = await setUp();
  const { sandbox } = await run(s, { CLAUDE_CODE_OAUTH_TOKEN: "t" });
  await Bun.file(s.out).delete();
  const { r, seen } = await run(s, {}, ["--clean"]);
  expect(r.status, r.stderr).toBe(0);
  expect(fs.existsSync(sandbox)).toBe(false);
  expect<Seen | null>(seen).toBe(null);
});

test("the tool stops with exit status 1 when `claude` is not on `PATH`", async () => {
  const s = await setUp();
  const { r, seen } = await run(s, { CLAUDE_CODE_OAUTH_TOKEN: "t", PATH: "" });
  expect(r.status).toBe(1);
  expect<Seen | null>(seen).toBe(null);
});
