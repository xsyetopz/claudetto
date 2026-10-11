// Pins where `dotclaude-sandbox` gets the login token and where it keeps its files.
// The tool runs as a child process with a fake `claude`, a fake `security`
// first on `PATH`, and a temporary `HOME`, so no test reads the real Keychain or `~/.claude`.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { PLUGINS, tmpDir } from "../../support/repo.mjs";

const TOOL = path.join(PLUGINS, "dotclaude-lab/bin/dotclaude-sandbox");
const JEV = path.join(PLUGINS, "dotclaude-jev");
const REAL_HOME = os.homedir();

const FAKE_CLAUDE = `#!${process.execPath}
const fs = require("node:fs");
fs.writeFileSync(process.env.FAKE_OUT, JSON.stringify({ env: process.env, argv: process.argv.slice(2), cwd: process.cwd() }));
`;
// Prints the token in `FAKE_KEYCHAIN` as the Keychain JSON, or fails when the variable is not set.
const FAKE_SECURITY = `#!${process.execPath}
const t = process.env.FAKE_KEYCHAIN;
if (!t) process.exit(44);
process.stdout.write(JSON.stringify({ claudeAiOauth: { accessToken: t } }));
`;

function setUp() {
  const dir = tmpDir("lab-sandbox");
  const bin = path.join(dir, "bin");
  const home = path.join(dir, "home");
  fs.mkdirSync(bin);
  fs.mkdirSync(path.join(home, ".claude"), { recursive: true });
  for (const [name, text] of [
    ["claude", FAKE_CLAUDE],
    ["security", FAKE_SECURITY],
  ])
    fs.writeFileSync(path.join(bin, name), text, { mode: 0o755 });
  return { dir, bin, home, out: path.join(dir, "out.json") };
}

function writeCredentials(home, token) {
  fs.writeFileSync(
    path.join(home, ".claude", ".credentials.json"),
    JSON.stringify({ claudeAiOauth: { accessToken: token } }),
  );
}

/** Runs the tool. `extra` sets or (with `undefined`) removes environment variables. */
function run(s, extra = {}, args = []) {
  const env = {
    ...process.env,
    HOME: s.home,
    PATH: `${s.bin}${path.delimiter}${process.env.PATH}`,
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
  const r = spawnSync(process.execPath, [TOOL, "--dir", sandbox, ...args], {
    env,
    encoding: "utf8",
  });
  const seen = fs.existsSync(s.out)
    ? JSON.parse(fs.readFileSync(s.out, "utf8"))
    : null;
  return { r, seen, sandbox };
}

function filesUnder(dir) {
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.join(e.parentPath, e.name));
}

test("the env token wins over the Keychain and the credentials file", () => {
  const s = setUp();
  writeCredentials(s.home, "file-token");
  const { r, seen } = run(s, {
    CLAUDE_CODE_OAUTH_TOKEN: "env-token",
    FAKE_KEYCHAIN: "keychain-token",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(seen.env.CLAUDE_CODE_OAUTH_TOKEN, "env-token");
});

test("with no env token, the credentials file gives the token", () => {
  const s = setUp();
  writeCredentials(s.home, "file-token");
  const { r, seen } = run(s);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(seen.env.CLAUDE_CODE_OAUTH_TOKEN, "file-token");
});

test("with no env token, the Keychain gives the token and wins over the file", {
  skip: process.platform !== "darwin",
}, () => {
  const s = setUp();
  writeCredentials(s.home, "file-token");
  const { r, seen } = run(s, { FAKE_KEYCHAIN: "keychain-token" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(seen.env.CLAUDE_CODE_OAUTH_TOKEN, "keychain-token");
});

test("with no token anywhere, the child gets none", () => {
  const s = setUp();
  const { r, seen } = run(s);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(seen.env.CLAUDE_CODE_OAUTH_TOKEN, undefined);
});

test("the token reaches the child only, and no file or output holds it", () => {
  const s = setUp();
  const token = "secret-token-4711";
  const { r, seen, sandbox } = run(s, { CLAUDE_CODE_OAUTH_TOKEN: token });
  assert.equal(seen.env.CLAUDE_CODE_OAUTH_TOKEN, token);
  assert.ok(!r.stdout.includes(token) && !r.stderr.includes(token));
  const files = filesUnder(sandbox);
  assert.ok(files.length > 0);
  for (const file of files)
    assert.ok(!fs.readFileSync(file, "utf8").includes(token), file);
  // The credentials file of the fake HOME is not written either.
  assert.deepEqual(fs.readdirSync(path.join(s.home, ".claude")), []);
});

test("the config is in the sandbox folder, not in the real ~/.claude", () => {
  const s = setUp();
  const { r, seen, sandbox } = run(s, { CLAUDE_CODE_OAUTH_TOKEN: "t" });
  assert.equal(r.status, 0, r.stderr);
  const config = path.join(path.resolve(sandbox), "config");
  assert.equal(seen.env.CLAUDE_CONFIG_DIR, config);
  assert.equal(seen.env.HOME, path.join(path.resolve(sandbox), "home"));
  assert.ok(fs.existsSync(path.join(config, ".claude.json")));
  assert.ok(config.startsWith(process.env.TMPDIR));
  assert.ok(!config.startsWith(path.join(REAL_HOME, ".claude")));
  assert.equal(
    fs.realpathSync(seen.cwd),
    fs.realpathSync(path.join(sandbox, "project")),
  );
});

test("the tool starts the `claude` on `PATH` with the plugin dir and the arguments", () => {
  const s = setUp();
  const { seen } = run(s, { CLAUDE_CODE_OAUTH_TOKEN: "t" }, [
    "--plugin-dir",
    JEV,
    "--model",
    "x",
  ]);
  assert.deepEqual(seen.argv.slice(-2), ["--model", "x"]);
  assert.equal(seen.argv[0], "--plugin-dir");
  assert.equal(path.basename(seen.argv[1]), "dotclaude-jev");
});

test("--clean removes the sandbox folder and starts no claude", () => {
  const s = setUp();
  const { sandbox } = run(s, { CLAUDE_CODE_OAUTH_TOKEN: "t" });
  fs.rmSync(s.out);
  const { r, seen } = run(s, {}, ["--clean"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.existsSync(sandbox), false);
  assert.equal(seen, null);
});

test("the tool stops with exit status 1 when `claude` is not on `PATH`", () => {
  const s = setUp();
  const { r, seen } = run(s, { CLAUDE_CODE_OAUTH_TOKEN: "t", PATH: "" });
  assert.equal(r.status, 1);
  assert.equal(seen, null);
});
