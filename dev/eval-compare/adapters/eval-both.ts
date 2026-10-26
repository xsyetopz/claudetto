import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type Arm,
  armHeading,
  type Expected,
  evalArgs,
  modelOf,
  verdict,
} from "../compare.ts";

export type Spawn = (
  file: string,
  args: string[],
) => { exitCode?: number | null | undefined } | null;

const spawn: Spawn = (file, args) => {
  try {
    return Bun.spawnSync([file, ...args], {
      stdio: ["inherit", "inherit", "inherit"],
    });
  } catch {
    return null;
  }
};

const evalOf = async (
  plugin: string,
  opts: string[],
  json: string,
  run: Spawn,
): Promise<Arm> => {
  const code = run("claude", evalArgs(plugin, opts, json))?.exitCode ?? 1;
  const file = Bun.file(json);
  return { code, result: (await file.exists()) ? await file.text() : null };
};

/** The arm of the plugin folder `dir`: the folder as given and with links resolved, because the result may hold either. */
const expectedOf = (dir: string, opts: string[]): Expected => {
  const real = fs.existsSync(dir) ? fs.realpathSync(dir) : dir;
  const model = modelOf(opts);
  return {
    plugins: [...new Set([dir, real])],
    ...(model === undefined ? {} : { model }),
  };
};

export const runBoth = async (
  a: string,
  b: string,
  rest: string[],
  run: Spawn = spawn,
  log: (line: string) => void = console.log,
): Promise<number> => {
  const first = path.resolve(a);
  const second = path.resolve(b);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "claudetto-eval-"));
  try {
    log(armHeading("A", first));
    const x = await evalOf(first, rest, path.join(dir, "a.json"), run);
    log(armHeading("B", second));
    const y = await evalOf(second, rest, path.join(dir, "b.json"), run);
    const result = verdict(x, y, [
      expectedOf(first, rest),
      expectedOf(second, rest),
    ]);
    for (const line of result.lines) log(line);
    return result.code;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};
