// Formats a generated module with Biome, so the lint of `plugins/` passes on it.

import path from "node:path";

const REPO = path.resolve(import.meta.dir, "../../..");

/** `text` as Biome formats the module `file`. */
export const format = async (file: string, text: string): Promise<string> => {
  const run = Bun.spawn(
    ["bunx", "biome", "format", `--stdin-file-path=${file}`],
    { cwd: REPO, stdin: new Blob([text]), stdout: "pipe", stderr: "pipe" },
  );
  const [out, err, code] = await Promise.all([
    new Response(run.stdout).text(),
    new Response(run.stderr).text(),
    run.exited,
  ]);
  if (code !== 0) throw new Error(`biome format ${file}: ${err}`);
  return out;
};
