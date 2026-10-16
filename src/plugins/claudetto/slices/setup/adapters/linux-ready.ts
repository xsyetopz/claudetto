// The Linux and WSL2 checks of the hard stop that read the system: the `bwrap` that Claude Code runs, the seccomp filter helper,
// and the settings that turn the filter off. `domain/linux-sandbox.ts` holds the lookup rules and their sources.
// Each check agrees with the engine, which is the sandbox runtime inside Claude Code 2.1.301.
// The native Claude Code binary embeds the helper: it opens `/proc/self/exe` as fd 3 and sets `applyPath` and `argv0` itself.
// So the check passes for a `claude` that resolves to an ELF file, and else only for a helper file that the engine finds on disk.
// The `claude` is the running copy in `CLAUDE_CODE_EXECPATH`, which Claude Code sets in the env of its `Bash` calls,
// and the `claude` on `PATH` only when the env has no such copy, such as in a terminal.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  apparmorProfile,
  blockedKindOf,
  globalBases,
  helperIn,
  type LinuxSettings,
  seccompArchOf,
} from "../domain/linux-sandbox.ts";
import {
  SANDBOX_BWRAP_APPARMOR,
  SANDBOX_BWRAP_BLOCKED,
  SANDBOX_BWRAP_CONTAINER,
  SANDBOX_BWRAP_PATH,
  SANDBOX_INSTALL,
  SANDBOX_SECCOMP_ARCH,
  SANDBOX_SECCOMP_MISSING,
  SANDBOX_SECCOMP_NO_NPM,
  SANDBOX_UNIX_SOCKETS,
} from "../prompts.ts";
import type { Io } from "./io.ts";

/** What the checks ask the system. A test gives its own. */
export type LinuxProbe = {
  /** The Node.js arch, such as `x64`. */
  arch: string;
  /** True when `file` exists. */
  exists: (file: string) => boolean;
  /** True when the sysctl `kernel.apparmor_restrict_unprivileged_userns` is 1. */
  appArmorRestricted: () => Promise<boolean>;
  /** True when `file` starts with the ELF magic number. */
  isElf: (file: string) => Promise<boolean>;
};

/** The first 4 bytes of an ELF file. */
const ELF_MAGIC = [0x7f, 0x45, 0x4c, 0x46];

const APPARMOR_SYSCTL =
  "/proc/sys/kernel/apparmor_restrict_unprivileged_userns";

/** The probe of this computer. */
export const thisProbe = (): LinuxProbe => ({
  arch: process.arch,
  exists: fs.existsSync,
  appArmorRestricted: () =>
    Bun.file(APPARMOR_SYSCTL)
      .text()
      .then(
        (text) => text.trim() === "1",
        () => false,
      ),
  isElf: (file) =>
    Bun.file(file)
      .slice(0, 4)
      .bytes()
      .then(
        (head) => ELF_MAGIC.every((b, i) => head[i] === b),
        () => false,
      ),
});

/** The env var in which Claude Code puts the path of its running copy. */
const EXECPATH = "CLAUDE_CODE_EXECPATH";

/**
 * True when the `claude` that runs the session is the native build, which embeds the helper.
 * The npm build runs `cli.js`, a text file, and needs the helper on disk.
 */
const nativeClaude = async (
  env: NodeJS.ProcessEnv,
  probe: LinuxProbe,
): Promise<boolean> => {
  const found =
    env[EXECPATH] || Bun.which("claude", { PATH: env["PATH"] ?? "" });
  if (!found) return false;
  try {
    return await probe.isElf(fs.realpathSync(found));
  } catch {
    return false;
  }
};

/** The command that installs the filter helper. */
const SECCOMP_INSTALL = "npm install -g @anthropic-ai/sandbox-runtime";

/** True when `file` is a file that the user can run. */
const isExecutable = (file: string): boolean => {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
};

/**
 * A test for a program on `PATH`, as the engine does it.
 * A path in `sandbox.bwrapPath` replaces the `PATH` search for `bwrap`, and `linuxReady` checks that file.
 */
export const programOn =
  (env: NodeJS.ProcessEnv, cfg: LinuxSettings) =>
  (program: string): boolean =>
    (program === "bwrap" && cfg.bwrapPath !== undefined) ||
    Bun.which(program, { PATH: env["PATH"] ?? "" }) !== null;

/** The `bwrap` that the engine runs, with its links resolved, or `undefined` when there is none. */
export const bwrapOf = (
  env: NodeJS.ProcessEnv,
  cfg: LinuxSettings,
): string | undefined => {
  const found =
    cfg.bwrapPath ?? Bun.which("bwrap", { PATH: env["PATH"] ?? "" });
  if (!found) return undefined;
  try {
    return fs.realpathSync(found);
  } catch {
    return found;
  }
};

/** The `bwrap` arguments of the test run: a new network namespace and a new `/proc`, as the sandbox makes, with a read-only root. */
const BWRAP_PROBE = [
  "--ro-bind",
  "/",
  "/",
  "--dev",
  "/dev",
  "--proc",
  "/proc",
  "--unshare-net",
  "true",
];

/** The error of a test run of the program `bwrap`, or `undefined` when it exits with status 0. */
const bwrapError = (bwrap: string, env: NodeJS.ProcessEnv) => {
  const r = Bun.spawnSync([bwrap, ...BWRAP_PROBE], {
    env: { PATH: env["PATH"] ?? "" },
    stdout: "ignore",
    stderr: "pipe",
  });
  if (r.exitCode === 0) return undefined;
  return r.stderr.toString().trim() || `exit status ${r.exitCode}`;
};

/** The output of `npm root -g`, or `undefined` when `npm` is not on `PATH` or fails. The engine waits 5 seconds for it. */
const npmRootOf = (env: NodeJS.ProcessEnv): string | undefined => {
  const npm = Bun.which("npm", { PATH: env["PATH"] ?? "" });
  if (npm === null) return undefined;
  const r = Bun.spawnSync([npm, "root", "-g"], {
    env: { ...env, PATH: env["PATH"] ?? "" },
    stdout: "pipe",
    stderr: "ignore",
    timeout: 5000,
  });
  return r.exitCode === 0 ? r.stdout.toString().trim() || undefined : undefined;
};

/** Prints why the seccomp filter helper is missing. Gives `false` for a missing helper, and `true` when the engine finds one. */
const seccompReady = async (
  cfg: LinuxSettings,
  env: NodeJS.ProcessEnv,
  probe: LinuxProbe,
  io: Io,
): Promise<boolean> => {
  // With `argv0`, the engine takes `applyPath` as it is, with no check that it exists.
  if (cfg.argv0 !== undefined && cfg.applyPath !== undefined) return true;
  if (await nativeClaude(env, probe)) return true;
  if (cfg.applyPath !== undefined && probe.exists(cfg.applyPath)) return true;
  const arch = seccompArchOf(probe.arch);
  if (arch === undefined) {
    io.log(SANDBOX_SECCOMP_ARCH({ arch: probe.arch }));
    return false;
  }
  const home = env["HOME"] || os.homedir();
  const bases = globalBases(npmRootOf(env), home, path.join);
  if (bases.some((base) => probe.exists(helperIn(base, arch, path.join))))
    return true;
  io.log(SANDBOX_SECCOMP_MISSING);
  if (Bun.which("npm", { PATH: env["PATH"] ?? "" }) === null)
    io.log(SANDBOX_SECCOMP_NO_NPM);
  else io.log(SANDBOX_INSTALL({ command: SECCOMP_INSTALL }));
  return false;
};

/**
 * Runs the checks of the hard stop that only Linux and WSL2 have, after `bwrap` and `socat` are on `PATH`.
 * Prints why one fails and gives `false` then.
 */
export const linuxReady = async (
  cfg: LinuxSettings,
  env: NodeJS.ProcessEnv,
  io: Io,
  probe: LinuxProbe = thisProbe(),
): Promise<boolean> => {
  if (cfg.bwrapPath !== undefined && !isExecutable(cfg.bwrapPath)) {
    io.log(SANDBOX_BWRAP_PATH({ path: cfg.bwrapPath }));
    return false;
  }
  if (cfg.allUnixSockets !== undefined) {
    io.log(SANDBOX_UNIX_SOCKETS({ file: cfg.allUnixSockets }));
    return false;
  }
  if (!(await seccompReady(cfg, env, probe, io))) return false;
  const bwrap = bwrapOf(env, cfg);
  if (bwrap === undefined) return true;
  const error = bwrapError(bwrap, env);
  if (error === undefined) return true;
  if (blockedKindOf(error) === "container")
    io.log(SANDBOX_BWRAP_CONTAINER({ error }));
  else if (await probe.appArmorRestricted())
    io.log(
      SANDBOX_BWRAP_APPARMOR({
        error,
        path: bwrap,
        profile: apparmorProfile(bwrap),
      }),
    );
  else io.log(SANDBOX_BWRAP_BLOCKED({ error, path: bwrap }));
  return false;
};
