// Loaded by the `preload` of `bunfig.toml` once per `bun test` process.
// A test can import code of `src/`, where each `prompts.ts` is still the folder `prompts/`.
// This loader gives Bun the generated module of `plugins/` in its place, as the `rootDirs` of `tsconfig.json` do for the type check.
// `just test` runs `just generate` first, so the module of `plugins/` is the one of the current source.

import fs from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dir, "..", "..");
const SRC = path.join(REPO, "src");
const PLUGINS = path.join(REPO, "plugins");

/** The generated copy of the prompt module `file` of `src/`, or `undefined` when `file` is not one. */
const copyOf = (file: string): string | undefined => {
  if (fs.existsSync(file) || !file.startsWith(SRC + path.sep)) return undefined;
  const rel = path.relative(SRC, file);
  const [top, ...rest] = rel.split(path.sep);
  // A slice module: `src/plugins/<p>/…` is `plugins/<p>/…`.
  if (top === "plugins") return path.join(PLUGINS, ...rest);
  // A kernel module: each plugin that uses the folder has a copy, and the copies are the same.
  if (top === "kernel")
    return fs
      .readdirSync(PLUGINS)
      .map((p) => path.join(PLUGINS, p, rel))
      .find((copy) => fs.existsSync(copy));
  return undefined;
};

Bun.plugin({
  name: "prompt modules of src",
  setup: (build) => {
    build.onResolve({ filter: /^\.{1,2}\/(?:.*\/)?prompts\.ts$/ }, (args) => {
      const file = path.resolve(path.dirname(args.importer), args.path);
      const copy = copyOf(file);
      return copy ? { path: copy } : undefined;
    });
  },
});
