// The CLI `jscpd-config` of the `dry` slice. The launcher `bin/jscpd-config` calls `main`.
//
//   jscpd-config [--local FILE] [--out FILE]
//   jscpd-config --run [JSCPD ARGUMENT...]
//
// `--run` spawns `bunx jscpd` with the arguments after it, and exits with the exit code of jscpd.
// It sets `BUN_TMPDIR` to `TMPDIR`, so that Bun writes to the temp folder of the sandbox.
// It sets `BUN_INSTALL` to `TMPDIR/bun` when the cache of Bun takes no write.
// The call needs no env prefix, which Claude Code does not allow without a prompt.
//
// It merges `jscpd.local.json` and its `extends` chain into `.jscpd.json`.
// The `extends` value is a path from the folder of the file, or `claudetto:base` for the shipped base.
// Exit 2 means a bad argument, a file that does not parse, or an `extends` cycle.

import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { writeAtomic } from "../../../kernel/node/fs.ts";
import base from "../assets/jscpd.base.json" with { type: "json" };
import { type Json, resolve } from "../merge.ts";
import { USAGE } from "../prompts.ts";

const BASE = "claudetto:base";
const DEFAULT_LOCAL = "jscpd.local.json";
const DEFAULT_OUT = ".jscpd.json";

/** The output functions of the CLI, so a test can read them. */
export interface Io {
  log: (message: string) => void;
  error: (message: string) => void;
}

const opt = (argv: string[], name: string): string | undefined => {
  const at = argv.indexOf(name);
  return at < 0 ? undefined : argv[at + 1];
};

/** The config in `file`, or the shipped base for the name `claudetto:base`. */
const load = async (file: string): Promise<Json> => {
  if (file === BASE) return base;
  try {
    return (await Bun.file(file).json()) as Json;
  } catch (err) {
    throw new Error(`${file}: ${(err as Error).message}`);
  }
};

const target = (ref: string, from: string): string =>
  ref === BASE ? BASE : path.resolve(path.dirname(from), ref);

/** The config with no `baseline` and no `failOnNewClones` when the baseline file is missing, so the first run scans and reports each clone. */
const withoutMissingBaseline = async (
  config: Json,
  out: string,
): Promise<Json> => {
  const file = (config as { baseline?: unknown }).baseline;
  if (typeof file !== "string") return config;
  if (await Bun.file(path.resolve(path.dirname(out), file)).exists())
    return config;
  const {
    baseline: _b,
    failOnNewClones: _f,
    ...rest
  } = config as Record<string, Json>;
  return rest;
};

/**
 * The env of the jscpd run: `BUN_TMPDIR` is `TMPDIR` when `TMPDIR` is set.
 * When the cache of Bun takes no write, `BUN_INSTALL` is `TMPDIR/bun`.
 * The sandbox allows `$TMPDIR` but not always the cache of Bun (`$BUN_INSTALL/install/cache`), and Bun fails with `EPERM` then.
 */
export const runEnv = (
  env: Record<string, string | undefined>,
  cacheWritable = true,
): Record<string, string | undefined> => {
  const tmp = env["TMPDIR"];
  if (!tmp) return { ...env };
  const out: Record<string, string | undefined> = { ...env, BUN_TMPDIR: tmp };
  if (!cacheWritable) out["BUN_INSTALL"] = path.join(tmp, "bun");
  return out;
};

/** True when the cache folder of Bun takes a write: it makes the folder, and writes and removes a probe file. */
const cacheTakesWrite = async (
  env: Record<string, string | undefined>,
): Promise<boolean> => {
  const root = env["BUN_INSTALL"] || path.join(env["HOME"] ?? "", ".bun");
  const dir = path.join(root, "install", "cache");
  const probe = path.join(dir, `.claudetto-probe-${process.pid}`);
  try {
    await mkdir(dir, { recursive: true });
    await Bun.write(probe, "");
    await rm(probe);
    return true;
  } catch {
    return false;
  }
};

/** Runs `bunx jscpd` with `args` and the env of `runEnv`, and returns its exit code. */
const run = async (args: string[]): Promise<number> => {
  const proc = Bun.spawn(["bunx", "jscpd", ...args], {
    env: runEnv(process.env, await cacheTakesWrite(process.env)),
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return await proc.exited;
};

export const main = async (
  argv: string[],
  io: Io = console,
): Promise<number> => {
  if (argv[0] === "--run") return run(argv.slice(1));
  if (argv.includes("--help") || argv.includes("-h")) {
    io.log(USAGE);
    return 0;
  }
  const local = path.resolve(opt(argv, "--local") ?? DEFAULT_LOCAL);
  const out = path.resolve(opt(argv, "--out") ?? DEFAULT_OUT);
  try {
    const merged = (await Bun.file(local).exists())
      ? await resolve(local, load, target)
      : { ...base };
    const config = await withoutMissingBaseline(merged, out);
    await writeAtomic(out, `${JSON.stringify(config, null, 2)}\n`);
    io.log(`jscpd-config: wrote ${out}`);
    return 0;
  } catch (err) {
    io.error(`jscpd-config: ${(err as Error).message}`);
    return 2;
  }
};
