// Formats the `.ts` and `.json` text of the generated files with Biome, so that a generated file has the style of the repository.
// Biome skips `plugins/` for lint, so this step passes each text on stdin and does not read the file.

import path from "node:path";
import type { Output } from "./emit/texts.ts";

const FORMATTED = /\.(?:ts|json)$/;

/** The text `text` of the file `file` after `biome format`. It throws when Biome fails. */
const format = async (root: string, o: Output): Promise<string> => {
  const biome = Bun.spawn(
    ["bunx", "biome", "format", `--stdin-file-path=${o.file}`],
    {
      cwd: root,
      stdin: new Blob([o.text]),
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [text, err] = await Promise.all([
    new Response(biome.stdout).text(),
    new Response(biome.stderr).text(),
  ]);
  if ((await biome.exited) !== 0)
    throw new Error(`Biome cannot format ${o.file}: ${err}`);
  return text;
};

/** `made` with each `.ts` and `.json` text formatted by Biome. */
export const formatted = async (
  root: string,
  made: Output[],
): Promise<Output[]> =>
  Promise.all(
    made.map(async (o) =>
      FORMATTED.test(path.basename(o.file))
        ? { ...o, text: await format(root, o) }
        : o,
    ),
  );
