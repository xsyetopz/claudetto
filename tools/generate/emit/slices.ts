// Writes the code and the texts of each slice of a plugin, its kernel closure, and one launcher for each CLI (design, "Generated tree").
// `skills/`, `agents/`, and `styles/` of a slice go to `skills/`, `agents/`, and `output-styles/` of the plugin.
// The hook lab tests in `lab/` of a slice go to `tests/` of the plugin, where `claude plugin test` finds them.
// Each other file of a slice goes to `slices/<s>/`, with each `src/kernel/` import path changed to `kernel/`.
// A folder `NAME.ts/` of `.md` and `.json` texts gives the module `NAME.ts`, as `emit/texts.ts` does for 0.28.0.

import fs from "node:fs";
import path from "node:path";
import { kernelClosure, rewrite } from "../closure.ts";
import type { FoundPlugin, FoundSlice } from "../discover.ts";
import { fill } from "./fill.ts";
import {
  GENERATED_MARK,
  type Output,
  textModule,
  withHeader,
} from "./texts.ts";

/** The module folder of a slice file `rel`, such as `texts.ts` of `texts.ts/doing-tasks.md`. */
const MODULE_DIR = /^((?:[^/]+\/)*[^/]+\.ts)\/[^/]+$/;

/** The `src/` folder and the module folder of the path `dir`, when `dir` is a module folder in a slice of `src/`. */
const SLICE_MODULE =
  /^(.*)[\\/]src[\\/](plugins[\\/][^\\/]+[\\/]slices[\\/].+\.ts)$/;

// `discover.ts` imports each slice from `src/`, where a module folder is still a folder that Bun cannot import.
// This loader gives Bun the text module of the folder in its place, so the import of a slice runs as in the plugin.
Bun.plugin({
  name: "slice text modules",
  setup: (build) => {
    build.onResolve({ filter: /^\.{1,2}\/.*\.ts$/ }, (args) => {
      const dir = path.resolve(path.dirname(args.importer), args.path);
      return SLICE_MODULE.test(dir) &&
        fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory()
        ? { path: dir, namespace: "slice-text-module" }
        : undefined;
    });
    build.onLoad(
      { filter: /.*/, namespace: "slice-text-module" },
      async (args) => {
        const [, root = "", dir = ""] = args.path.match(SLICE_MODULE) ?? [];
        const src = path.join(root, "src");
        return {
          contents: await textModule(src, path.join(src, "fragments"), dir),
          loader: "ts",
        };
      },
    );
  },
});

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

/** The files of the slice `s` of the plugin `p` in the plugin. A text module can include each part of `made`, such as `snippet.json`. */
const filesOf = async (
  root: string,
  p: FoundPlugin,
  s: FoundSlice,
  made: Record<string, string>,
): Promise<Output[]> => {
  const abs = path.join(root, s.dir);
  const fragments = path.join(root, "src", "fragments");
  const out: Output[] = [];
  const modules = new Set<string>();
  for (const rel of walk(abs)) {
    const module = TEXTS[rel.split("/")[0] ?? ""]
      ? undefined
      : rel.match(MODULE_DIR)?.[1];
    if (module) {
      if (modules.has(module)) continue;
      modules.add(module);
      const file = `plugins/${p.name}/slices/${s.name}/${module}`;
      const source = path.posix.join(s.dir, module, path.posix.sep);
      const dir = path.posix.relative("src", path.posix.join(s.dir, module));
      const text = await textModule(
        path.join(root, "src"),
        fragments,
        dir,
        made,
      );
      out.push({ file, source, text: withHeader(file, source, text) });
      continue;
    }
    const source = path.posix.join(s.dir, rel);
    const from = path.join(abs, rel);
    const [top = "", ...rest] = rel.split("/");
    const text = await Bun.file(from).text();
    const folder = TEXTS[top];
    if (top === "lab" && rest.length) {
      const file = path.posix.join("plugins", p.name, "tests", ...rest);
      out.push({ file, source, text: withHeader(file, source, text) });
      continue;
    }
    if (folder && rest.length) {
      const file = path.posix.join("plugins", p.name, folder, ...rest);
      out.push({
        file,
        source,
        text: withHeader(file, source, await fill(text, fragments, source)),
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

/** The slice files, the kernel closure, and the launchers of the plugin `p`, with the include parts `made`. */
export const slicesOf = async (
  root: string,
  p: FoundPlugin,
  made: Record<string, string> = {},
): Promise<Output[]> => {
  const out: Output[] = [];
  const code: string[] = [];
  for (const s of p.slices) {
    out.push(...(await filesOf(root, p, s, made)), ...launcherOf(root, p, s));
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
