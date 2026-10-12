// Writes the code and the texts of each slice of a plugin, its kernel closure, and one launcher for each CLI (design, "Generated tree").
// `skills/`, `agents/`, and `styles/` of a slice go to `skills/`, `agents/`, and `output-styles/` of the plugin.
// Each other file of a slice goes to `slices/<s>/`, with each `src/kernel/` import path changed to `kernel/`.

import fs from "node:fs";
import path from "node:path";
import { kernelClosure, rewrite } from "../closure.ts";
import type { FoundPlugin, FoundSlice } from "../discover.ts";
import { fill, GENERATED_MARK, type Output, withHeader } from "./texts.ts";

/** The plugin folder of each text folder of a slice. */
const TEXTS: Readonly<Record<string, string>> = {
  skills: "skills",
  agents: "agents",
  styles: "output-styles",
};

/** Each file under `dir`, relative to `dir`, with `/` separators, sorted. */
const walk = (dir: string): string[] =>
  fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) =>
      path
        .relative(dir, path.join(e.parentPath, e.name))
        .split(path.sep)
        .join(path.posix.sep),
    )
    .sort();

/** The launcher `bin/<bin>` of the CLI of the slice `s` of the plugin `p`. */
const launcherOf = (root: string, p: FoundPlugin, s: FoundSlice): Output[] => {
  if (!s.slice.cli) return [];
  const source = path.posix.join(s.dir, "adapters", "cli.ts");
  if (!fs.existsSync(path.join(root, source)))
    throw new Error(
      `${path.posix.join(s.dir, "slice.ts")}: the slice has a cli, and ${source} does not exist`,
    );
  const text = [
    "#!/usr/bin/env -S bun --no-env-file",
    `// ${GENERATED_MARK} \`${source}\`. Edit the source and run \`just generate\`.`,
    "",
    `import { main } from "../slices/${s.name}/adapters/cli.ts";`,
    "",
    "process.exitCode = await main(process.argv.slice(2));",
    "",
  ].join("\n");
  return [{ file: `plugins/${p.name}/bin/${s.slice.cli.bin}`, source, text }];
};

/** The files of the slice `s` of the plugin `p` in the plugin. */
const filesOf = async (
  root: string,
  p: FoundPlugin,
  s: FoundSlice,
): Promise<Output[]> => {
  const abs = path.join(root, s.dir);
  const shared = path.join(root, "src", "shared");
  const out: Output[] = [];
  for (const rel of walk(abs)) {
    const source = path.posix.join(s.dir, rel);
    const from = path.join(abs, rel);
    const [top = "", ...rest] = rel.split("/");
    const text = await Bun.file(from).text();
    const folder = TEXTS[top];
    if (folder && rest.length) {
      const file = path.posix.join("plugins", p.name, folder, ...rest);
      out.push({
        file,
        source,
        text: withHeader(file, source, await fill(text, shared, source)),
      });
      continue;
    }
    const file = `plugins/${p.name}/slices/${s.name}/${rel}`;
    const code = rel.endsWith(".ts")
      ? rewrite(root, p.name, abs, from, path.join(root, file), text)
      : text;
    out.push({ file, source, text: withHeader(file, source, code) });
  }
  return out;
};

/** The slice files, the kernel closure, and the launchers of the plugin `p`. */
export const slicesOf = async (
  root: string,
  p: FoundPlugin,
): Promise<Output[]> => {
  const out: Output[] = [];
  const code: string[] = [];
  for (const s of p.slices) {
    out.push(...(await filesOf(root, p, s)), ...launcherOf(root, p, s));
    code.push(
      ...walk(path.join(root, s.dir))
        .filter((rel) => rel.endsWith(".ts") && !TEXTS[rel.split("/")[0] ?? ""])
        .map((rel) => path.join(root, s.dir, rel)),
    );
  }
  for (const rel of await kernelClosure(root, code)) {
    const file = `plugins/${p.name}/kernel/${rel}`;
    const source = `src/kernel/${rel}`;
    const text = await Bun.file(path.join(root, source)).text();
    out.push({ file, source, text: withHeader(file, source, text) });
  }
  return out;
};
