// Runs of `claudetto-setup sandbox` in a temporary checkout, with a fake `gh` and a temporary home folder for the policy store.
// No run writes the real `~/.claude` or `~/.claudetto`, and no run connects to GitHub.
// A run in a child process checks the programs of the sandbox on the real platform, so fake `bwrap` and `socat` are on its `PATH`.
// The in-process runs give the platform, and they test the prerequisite check on each platform.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import type { LinuxProbe } from "../../../plugins/claudetto/slices/setup/adapters/linux-ready.ts";
import { sandboxCommand } from "../../../plugins/claudetto/slices/setup/adapters/sandbox-cmd.ts";
import { writeProgram } from "../../support/fake-program.ts";
import { PLUGINS, tmpDir } from "../../support/repo.ts";

const SCRIPT = path.join(PLUGINS, "claudetto/bin/claudetto-setup");
const GIT_DIR = path.dirname(Bun.which("git") ?? "/usr/bin/git");

type Box = {
  home: string;
  config: string;
  project: string;
  bin: string;
  tools: string;
};

/** A checkout with the `origin` remote `url`, and a fake `gh` that gives the login `login`, or fails with no login. */
const box = async (url: string | undefined, login?: string): Promise<Box> => {
  const root = tmpDir("dc-sandbox");
  const d = {
    home: path.join(root, "home"),
    config: path.join(root, "config"),
    project: path.join(root, "project"),
    bin: path.join(root, "bin"),
    tools: path.join(root, "tools"),
  };
  for (const dir of Object.values(d)) fs.mkdirSync(dir);
  const gitArgs = [
    ["init", "-q", d.project],
    ["-C", d.project, "config", "core.excludesFile", "/dev/null"],
    ...(url ? [["-C", d.project, "remote", "add", "origin", url]] : []),
  ];
  for (const args of gitArgs) Bun.spawnSync(["git", ...args]);
  const answer = login
    ? `const a = process.argv.slice(2).join(" ");
if (a.startsWith("config get user")) { console.log(${JSON.stringify(login)}); process.exit(0); }
if (a.startsWith("api")) { console.log("[[]]"); process.exit(0); }
process.exit(1);`
    : "process.exit(1);";
  await writeProgram(d.bin, "gh", answer);
  for (const name of ["bwrap", "socat"]) await writeProgram(d.tools, name, "");
  // A real Linux host needs the seccomp filter helper, so the user settings point to a fake one.
  const helper = path.join(d.tools, "apply-seccomp");
  await Bun.write(helper, "");
  await Bun.write(
    path.join(d.config, "settings.json"),
    JSON.stringify({ sandbox: { seccomp: { applyPath: helper } } }),
  );
  return d;
};

const run = (d: Box, args: string[]) => {
  const r = Bun.spawnSync(
    [process.execPath, "--no-env-file", SCRIPT, "sandbox", ...args],
    {
      cwd: d.project,
      env: {
        HOME: d.home,
        CLAUDE_CONFIG_DIR: d.config,
        CLAUDE_PROJECT_DIR: d.project,
        PATH: [d.bin, d.tools, GIT_DIR].join(path.delimiter),
      },
    },
  );
  return {
    status: r.exitCode,
    out: r.stdout.toString(),
    err: r.stderr.toString(),
  };
};

const localFile = (d: Box) =>
  path.join(d.project, ".claude/settings.local.json");
const recordFile = (d: Box) =>
  path.join(d.project, ".claudetto/sandbox-stop.json");
const readLocal = async (d: Box) =>
  JSON.parse(await Bun.file(localFile(d)).text());

/** Stores the verdict word `verdict` for `key`, as the `policy` slice does. */
const storeVerdict = (d: Box, key: string, verdict: string) =>
  Bun.write(
    path.join(
      d.home,
      ".claudetto/policy/flat",
      key.replace(/[^a-z0-9.-]+/g, "_"),
    ),
    verdict,
  );

const EXTERNAL = "git@github.com:upstream/tool.git";

test("a preview of an external checkout writes nothing and gives the costs", async () => {
  const d = await box(EXTERNAL, "me");
  const r = run(d, []);
  expect(r.status, r.err).toBe(0);
  expect(r.out).toContain(
    "`github.com/upstream/tool` is an external repository",
  );
  expect(r.out).toContain("The costs of the hard stop");
  expect(r.out).toContain("Dry run.");
  expect(fs.existsSync(localFile(d))).toBe(false);
});

test("an external checkout with the verdict `forbidden` gets the hard stop in the local settings", async () => {
  const d = await box(EXTERNAL, "me");
  await storeVerdict(d, "github.com/upstream/tool", "forbidden");
  await Bun.write(localFile(d), JSON.stringify({ model: "opus" }));
  const r = run(d, ["--apply"]);
  expect(r.status, r.err).toBe(0);
  expect(r.out).toContain("verdict is `forbidden`");
  expect(await readLocal(d)).toStrictEqual({
    model: "opus",
    sandbox: {
      enabled: true,
      failIfUnavailable: true,
      allowUnsandboxedCommands: false,
      network: { deniedDomains: ["github.com", "*.github.com"] },
    },
  });
  const exclude = await Bun.file(
    path.join(d.project, ".git/info/exclude"),
  ).text();
  expect(exclude).toContain("**/.claude/settings.local.json");
  expect(exclude).toContain("**/.claudetto/sandbox-stop.json");
});

test("a checkout of the user writes nothing and says why", async () => {
  const d = await box("https://github.com/Me/tool.git", "me");
  const r = run(d, ["--apply"]);
  expect(r.status, r.err).toBe(0);
  expect(r.out).toContain("`github.com/me/tool` is your repository");
  expect(fs.existsSync(localFile(d))).toBe(false);
});

test("an external checkout with the verdict `allowed` writes nothing and says why", async () => {
  const d = await box(EXTERNAL, "me");
  await storeVerdict(d, "github.com/upstream/tool", "allowed");
  const r = run(d, ["--apply"]);
  expect(r.out).toContain("verdict of `github.com/upstream/tool` is `allowed`");
  expect(fs.existsSync(localFile(d))).toBe(false);
});

test("a checkout with no origin writes nothing and says why", async () => {
  const d = await box(undefined, "me");
  const r = run(d, ["--apply"]);
  expect(r.out).toContain("has no git remote `origin`");
  expect(fs.existsSync(localFile(d))).toBe(false);
});

test("with no `gh` login, a checkout of any owner is external", async () => {
  const d = await box("https://github.com/me/tool.git");
  const r = run(d, ["--apply"]);
  expect(r.status, r.err).toBe(0);
  expect((await readLocal(d)).sandbox.enabled).toBe(true);
});

test("a second run changes nothing", async () => {
  const d = await box(EXTERNAL, "me");
  run(d, ["--apply"]);
  const first = await Bun.file(localFile(d)).text();
  const r = run(d, ["--apply"]);
  expect(r.out).toContain("already have the hard stop");
  expect(await Bun.file(localFile(d)).text()).toBe(first);
});

test("the remove mode takes out only what the run wrote, and deletes the record", async () => {
  const d = await box(EXTERNAL, "me");
  const before = {
    model: "opus",
    sandbox: { enabled: false, network: { deniedDomains: ["evil.example"] } },
  };
  await Bun.write(localFile(d), JSON.stringify(before));
  run(d, ["--apply"]);
  const r = run(d, ["--remove", "--apply"]);
  expect(r.status, r.err).toBe(0);
  expect(await readLocal(d)).toStrictEqual(before);
  expect(fs.existsSync(recordFile(d))).toBe(false);
});

test("the remove mode with no record writes nothing", async () => {
  const d = await box(EXTERNAL, "me");
  const r = run(d, ["--remove", "--apply"]);
  expect(r.out).toContain("There is no record of a hard stop");
  expect(fs.existsSync(localFile(d))).toBe(false);
});

test("an excluded command in the user settings gets a note", async () => {
  const d = await box(EXTERNAL, "me");
  await Bun.write(
    path.join(d.config, "settings.json"),
    JSON.stringify({
      sandbox: {
        excludedCommands: ["git push *"],
        seccomp: { applyPath: path.join(d.tools, "apply-seccomp") },
      },
    }),
  );
  expect(run(d, []).out).toContain("`git push *`");
});

test("a local settings file that is not JSON is refused", async () => {
  const d = await box(EXTERNAL, "me");
  await Bun.write(localFile(d), "{ not json");
  const r = run(d, ["--apply"]);
  expect(r.status).toBe(1);
  expect(await Bun.file(localFile(d)).text()).toBe("{ not json");
});

const LINUX = { platform: "linux", release: "6.8.0-45-generic" };
const GIT = Bun.which("git") ?? "/usr/bin/git";

/** A probe of a Linux x64 computer where the filter helper exists, and AppArmor does not restrict user namespaces. */
const FILTER_ON: LinuxProbe = {
  arch: "x64",
  exists: (file) => file.endsWith("/apply-seccomp"),
  appArmorRestricted: async () => false,
  isElf: async () => false,
};

/**
 * An in-process run of the command on the platform `host`, with only the programs `programs`, `git`, and `gh` on `PATH`.
 * Each fake program exits with status 0, and the fake `git` runs the real one.
 */
const runOn = async (
  d: Box,
  host: { platform: string; release: string },
  programs: string[],
  bwrap = "",
  probe: LinuxProbe = FILTER_ON,
) => {
  const only = path.join(d.bin, "only");
  fs.mkdirSync(only, { recursive: true });
  await writeProgram(
    only,
    "git",
    `const r = require("node:child_process").spawnSync(${JSON.stringify(GIT)}, process.argv.slice(2), { stdio: "inherit" });
process.exit(r.status ?? 1);`,
  );
  for (const name of programs)
    await writeProgram(only, name, name === "bwrap" ? bwrap : "");
  const lines: string[] = [];
  const io = {
    log: (l: string) => lines.push(l),
    error: (l: string) => lines.push(l),
  };
  const env = {
    HOME: d.home,
    CLAUDE_CONFIG_DIR: d.config,
    CLAUDE_PROJECT_DIR: d.project,
    PATH: [only, d.bin].join(path.delimiter),
  };
  const places = { configDir: d.config, projectDir: d.project, root: "" };
  const status = await sandboxCommand(
    { apply: true, remove: false },
    places,
    env,
    io,
    host,
    probe,
  );
  return { status, out: lines.join("\n") };
};

test("on Linux with no `bwrap`, the apply writes nothing and gives the `apt-get` line", async () => {
  const d = await box(EXTERNAL, "me");
  const r = await runOn(d, LINUX, ["socat", "apt-get"]);
  expect(r.status).toBe(1);
  expect(r.out).toContain("they are not on `PATH`: `bwrap`.");
  expect(r.out).toContain("Install command: `sudo apt-get install bubblewrap`");
  expect(r.out).not.toContain("The costs of the hard stop");
  expect(fs.existsSync(localFile(d))).toBe(false);
  expect(fs.existsSync(recordFile(d))).toBe(false);
});

test("on Linux with no known package manager, the apply writes nothing and gives the package names", async () => {
  const d = await box(EXTERNAL, "me");
  const r = await runOn(d, LINUX, []);
  expect(r.status).toBe(1);
  expect(r.out).toContain("`bwrap`, `socat`");
  expect(r.out).toContain("No known package manager is on `PATH`.");
  expect(fs.existsSync(localFile(d))).toBe(false);
});

test("on Linux with `bwrap` and `socat` on `PATH`, the apply writes the hard stop", async () => {
  const d = await box(EXTERNAL, "me");
  const r = await runOn(d, LINUX, ["bwrap", "socat"]);
  expect(r.status, r.out).toBe(0);
  expect(r.out).toContain("The costs of the hard stop");
  expect((await readLocal(d)).sandbox.failIfUnavailable).toBe(true);
});

test("on Linux with a `bwrap` that fails its test run, the apply writes nothing and says that the cause is not AppArmor when the sysctl is off", async () => {
  const d = await box(EXTERNAL, "me");
  const blocked = `process.stderr.write("bwrap: setting up uid map: Permission denied\\n"); process.exit(1);`;
  const r = await runOn(d, LINUX, ["bwrap", "socat"], blocked);
  expect(r.status).toBe(1);
  expect(r.out).toContain("setting up uid map: Permission denied");
  expect(r.out).toContain("is the `bwrap` that Claude Code runs");
  expect(r.out).not.toContain("profile bwrap");
  expect(r.out).not.toContain("The costs of the hard stop");
  expect(fs.existsSync(localFile(d))).toBe(false);
  expect(fs.existsSync(recordFile(d))).toBe(false);
});

test("on WSL1, the apply writes nothing and says why", async () => {
  const d = await box(EXTERNAL, "me");
  const wsl1 = { platform: "linux", release: "4.4.0-19041-Microsoft" };
  const old = await runOn(d, wsl1, ["bwrap", "socat"]);
  expect(old.status).toBe(1);
  expect(old.out).toContain("this distribution runs on WSL1");
  expect(fs.existsSync(localFile(d))).toBe(false);
});

test("the remove mode does not check the programs of the sandbox", async () => {
  const d = await box(EXTERNAL, "me");
  expect((await runOn(d, LINUX, ["bwrap", "socat"])).status).toBe(0);
  const lines: string[] = [];
  const io = {
    log: (l: string) => lines.push(l),
    error: (l: string) => lines.push(l),
  };
  const places = { configDir: d.config, projectDir: d.project, root: "" };
  const env = { HOME: d.home, PATH: "" };
  const status = await sandboxCommand(
    { apply: true, remove: true },
    places,
    env,
    io,
    LINUX,
  );
  expect(status).toBe(0);
  expect(fs.existsSync(recordFile(d))).toBe(false);
});

const OK_BWRAP = "";
const RESTRICTED: LinuxProbe = {
  ...FILTER_ON,
  appArmorRestricted: async () => true,
};

test("on Linux with no seccomp filter helper, the apply writes nothing and gives the `npm` install command", async () => {
  const d = await box(EXTERNAL, "me");
  const probe = { ...FILTER_ON, exists: () => false };
  const r = await runOn(d, LINUX, ["bwrap", "socat", "npm"], OK_BWRAP, probe);
  expect(r.status).toBe(1);
  expect(r.out).toContain(
    "The seccomp filter of the sandbox is not installed.",
  );
  expect(r.out).toContain(
    "Install command: `npm install -g @anthropic-ai/sandbox-runtime`",
  );
  expect(r.out).not.toContain("The costs of the hard stop");
  expect(fs.existsSync(localFile(d))).toBe(false);
  expect(fs.existsSync(recordFile(d))).toBe(false);
});

test("on Linux with no seccomp filter helper and no `npm`, the apply names Node.js and writes nothing", async () => {
  const d = await box(EXTERNAL, "me");
  const probe = { ...FILTER_ON, exists: () => false };
  const r = await runOn(d, LINUX, ["bwrap", "socat"], OK_BWRAP, probe);
  expect(r.status).toBe(1);
  expect(r.out).toContain("`npm` is not on `PATH`.");
  expect(r.out).not.toContain("Install command:");
  expect(fs.existsSync(localFile(d))).toBe(false);
});

test("on a Linux arch that the filter does not support, the apply writes nothing", async () => {
  const d = await box(EXTERNAL, "me");
  await Bun.write(path.join(d.config, "settings.json"), "{}");
  const probe = { ...FILTER_ON, arch: "ia32" };
  const r = await runOn(d, LINUX, ["bwrap", "socat"], OK_BWRAP, probe);
  expect(r.status).toBe(1);
  expect(r.out).toContain("no build for the architecture `ia32`");
  expect(fs.existsSync(localFile(d))).toBe(false);
});

test("`sandbox.network.allowAllUnixSockets` turns the filter off, so the apply writes nothing and names the file", async () => {
  const d = await box(EXTERNAL, "me");
  await Bun.write(
    path.join(d.project, ".claude/settings.json"),
    JSON.stringify({ sandbox: { network: { allowAllUnixSockets: true } } }),
  );
  const r = await runOn(d, LINUX, ["bwrap", "socat"]);
  expect(r.status).toBe(1);
  expect(r.out).toContain("`sandbox.network.allowAllUnixSockets` is `true`");
  expect(r.out).toContain(path.join(d.project, ".claude/settings.json"));
  expect(fs.existsSync(localFile(d))).toBe(false);
});

test("a higher scope that sets `allowAllUnixSockets` to `false` clears a lower one", async () => {
  const d = await box(EXTERNAL, "me");
  await Bun.write(
    path.join(d.config, "settings.json"),
    JSON.stringify({ sandbox: { network: { allowAllUnixSockets: true } } }),
  );
  await Bun.write(
    localFile(d),
    JSON.stringify({ sandbox: { network: { allowAllUnixSockets: false } } }),
  );
  const r = await runOn(d, LINUX, ["bwrap", "socat"]);
  expect(r.status, r.out).toBe(0);
});

test("the test run uses `sandbox.bwrapPath`, not the `bwrap` on `PATH`", async () => {
  const d = await box(EXTERNAL, "me");
  const mine = await writeProgram(
    d.tools,
    "my-bwrap",
    `process.stderr.write("my-bwrap ran\\n"); process.exit(1);`,
  );
  await Bun.write(
    localFile(d),
    JSON.stringify({ sandbox: { bwrapPath: mine } }),
  );
  const r = await runOn(d, LINUX, ["bwrap", "socat"]);
  expect(r.status).toBe(1);
  expect(r.out).toContain("my-bwrap ran");
  expect(r.out).toContain(fs.realpathSync(mine));
});

test("a `sandbox.bwrapPath` that is not a program is refused, and `bwrap` on `PATH` does not stand in", async () => {
  const d = await box(EXTERNAL, "me");
  await Bun.write(
    localFile(d),
    JSON.stringify({ sandbox: { bwrapPath: path.join(d.tools, "none") } }),
  );
  const r = await runOn(d, LINUX, ["bwrap", "socat"]);
  expect(r.status).toBe(1);
  expect(r.out).toContain("is not a program that you can run");
  expect(fs.existsSync(recordFile(d))).toBe(false);
});

const DENIED = `process.stderr.write("bwrap: setting up uid map: Permission denied\\n"); process.exit(1);`;

test("with AppArmor restricting user namespaces, the message gives the profile for the resolved path of `bwrap`", async () => {
  const d = await box(EXTERNAL, "me");
  const real = await writeProgram(d.tools, "brew-bwrap", DENIED);
  const link = path.join(d.tools, "linked-bwrap");
  fs.symlinkSync(real, link);
  await Bun.write(
    localFile(d),
    JSON.stringify({ sandbox: { bwrapPath: link } }),
  );
  const r = await runOn(d, LINUX, ["bwrap", "socat"], OK_BWRAP, RESTRICTED);
  expect(r.status).toBe(1);
  const resolved = fs.realpathSync(real);
  expect(r.out).toContain(
    `profile bwrap ${resolved} flags=(unconfined) {\n  userns,\n  include if exists <local/bwrap>\n}`,
  );
  expect(r.out).toContain("/etc/apparmor.d/bwrap");
  expect(r.out).not.toContain("profile bwrap /usr/bin/bwrap");
  expect(fs.existsSync(localFile(d))).toBe(true);
  expect((await readLocal(d)).sandbox.enabled).toBeUndefined();
});

test("a `bwrap` that cannot mount `/proc` is named as a container, and no weaker setting is written", async () => {
  const d = await box(EXTERNAL, "me");
  const container = `process.stderr.write("bwrap: Can't mount proc on /newroot/proc: Operation not permitted\\n"); process.exit(1);`;
  const r = await runOn(d, LINUX, ["bwrap", "socat"], container, RESTRICTED);
  expect(r.status).toBe(1);
  expect(r.out).toContain("unprivileged container");
  expect(r.out).toContain("`sandbox.enableWeakerNestedSandbox`");
  expect(r.out).not.toContain("profile bwrap");
  expect(fs.existsSync(localFile(d))).toBe(false);
});
