// The CLI `jscpd-config` of the `dry` slice. The launcher `bin/jscpd-config` calls `main`.
//
//   jscpd-config [--local FILE] [--out FILE]
//
// It merges `jscpd.local.json` and its `extends` chain into `.jscpd.json`.
// The `extends` value is a path from the folder of the file, or `claudetto:base` for the shipped base.
// Exit 2 means a bad argument, a file that does not parse, or an `extends` cycle.

import path from "node:path";
import { writeAtomic } from "../../../../../kernel/node/fs.ts";
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

export const main = async (
  argv: string[],
  io: Io = console,
): Promise<number> => {
  if (argv.includes("--help") || argv.includes("-h")) {
    io.log(USAGE);
    return 0;
  }
  const local = path.resolve(opt(argv, "--local") ?? DEFAULT_LOCAL);
  const out = path.resolve(opt(argv, "--out") ?? DEFAULT_OUT);
  try {
    const config = (await Bun.file(local).exists())
      ? await resolve(local, load, target)
      : { ...base };
    await writeAtomic(out, `${JSON.stringify(config, null, 2)}\n`);
    io.log(`jscpd-config: wrote ${out}`);
    return 0;
  } catch (err) {
    io.error(`jscpd-config: ${(err as Error).message}`);
    return 2;
  }
};
