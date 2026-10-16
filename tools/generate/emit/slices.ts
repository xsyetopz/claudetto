// Writes the code and the texts of each slice of a plugin, its kernel closure, and one launcher for each CLI (design, "Generated tree").
// `skills/`, `agents/`, and `styles/` of a slice go to `skills/`, `agents/`, and `output-styles/` of the plugin.
// The hook lab tests in `lab/` of a slice go to `tests/` of the plugin, where `claude plugin test` finds them, with each import path changed to the copy.
// The eval cases in `evals/<case>/` of a slice go to `evals/<case>/` of the plugin, where the eval runner finds them.
// Each other file of a slice goes to `slices/<s>/`, with each `src/kernel/` import path changed to `kernel/`.
// The `prompts/` folder of a slice gives the module `slices/<s>/prompts.ts` (`emit/prompts.ts`), and a `prompts/` folder of `src/kernel/` gives a module in `kernel/` the same way.

import fs from "node:fs";
import path from "node:path";
import { isPromptModule, kernelClosure, rewrite } from "../closure.ts";
import type { FoundPlugin, FoundSlice } from "../discover.ts";
import { fill } from "./fill.ts";
import { format } from "./format.ts";
import { WIDTH } from "./manifest.ts";
import { PROMPTS, PROMPTS_MODULE, promptModule } from "./prompts.ts";
import { GENERATED_MARK, type Output, withHeader } from "./texts.ts";

/** The repository root of the path `file`, when `file` is the prompt module of a slice or of a kernel folder of `src/`. */
const SOURCE_PROMPTS =
  /^(.*)[\\/]src[\\/](?:plugins[\\/][^\\/]+[\\/]slices[\\/][^\\/]+|kernel(?:[\\/][^\\/]+)*)[\\/]prompts\.ts$/;

// `discover.ts` imports each slice from `src/`, where each `prompts.ts` is still the folder `prompts/`.
// This loader gives Bun the prompt module of the folder in its place, so the import of a slice runs as in the plugin.
Bun.plugin({
  name: "slice prompt modules",
  setup: (build) => {
    build.onResolve({ filter: /^\.{1,2}\/(?:.*\/)?prompts\.ts$/ }, (args) => {
      const file = path.resolve(path.dirname(args.importer), args.path);
      return SOURCE_PROMPTS.test(file) &&
        fs.existsSync(path.join(path.dirname(file), PROMPTS))
        ? { path: file, namespace: "slice-prompt-module" }
        : undefined;
    });
    build.onLoad(
      { filter: /.*/, namespace: "slice-prompt-module" },
      async (args) => {
        const [, root = ""] = args.path.match(SOURCE_PROMPTS) ?? [];
        return {
          // Stub for discovery only: this import runs before the text step makes the snippet, and the slice code never reads the value here.
          // The text step writes the module with the real snippet.
          contents: await promptModule(
            root,
            path.dirname(args.path),
            { "snippet.json": "{}" },
            false,
          ),
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

/** An import or export over several lines, with its names and its path. */
const WRAPPED = /^(import|export)( type)? \{\n([^}]*)\n\} from "([^"]+)";$/gm;

/**
 * Whether `code` has a wrapped import or export that fits on one line.
 * A shorter `kernel/` path can make it fit, and then Biome puts it on one line, so only such a file goes through Biome again.
 */
const folds = (code: string): boolean =>
  [...code.matchAll(WRAPPED)].some(([, kind, type = "", names = "", from]) => {
    const list = names
      .split("\n")
      .map((n) => n.trim().replace(/,$/, ""))
      .join(", ");
    return `${kind}${type} { ${list} } from "${from}";`.length <= WIDTH;
  });

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
  if (fs.existsSync(path.join(abs, PROMPTS))) {
    const file = `plugins/${p.name}/slices/${s.name}/${PROMPTS_MODULE}`;
    const source = path.posix.join(s.dir, PROMPTS, path.posix.sep);
    const text = await promptModule(root, abs, made);
    out.push({ file, source, text: withHeader(file, source, text) });
  }
  for (const rel of walk(abs)) {
    if (rel.startsWith(`${PROMPTS}/`)) continue;
    const source = path.posix.join(s.dir, rel);
    const from = path.join(abs, rel);
    const [top = "", ...rest] = rel.split("/");
    const text = await Bun.file(from).text();
    const folder = TEXTS[top];
    if (top === "lab" && rest.length) {
      const file = path.posix.join("plugins", p.name, "tests", ...rest);
      const moved = rel.endsWith(".ts")
        ? rewrite(root, p.name, abs, from, path.join(root, file), text)
        : text;
      out.push({ file, source, text: withHeader(file, source, moved) });
      continue;
    }
    if (top === "evals" && rest.length) {
      const file = path.posix.join("plugins", p.name, "evals", ...rest);
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
    const moved = rel.endsWith(".ts")
      ? rewrite(root, p.name, abs, from, path.join(root, file), text)
      : text;
    const code =
      moved !== text && folds(moved) ? await format(file, moved) : moved;
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
  // The slices run at the same time, because each Biome run of a slice waits on a process of its own.
  const files = await Promise.all(
    p.slices.map((s) => filesOf(root, p, s, made)),
  );
  for (const [i, s] of p.slices.entries()) {
    out.push(...(files[i] ?? []), ...launcherOf(root, p, s));
    code.push(
      ...walk(path.join(root, s.dir))
        .filter((rel) => rel.endsWith(".ts") && !TEXTS[rel.split("/")[0] ?? ""])
        .map((rel) => path.join(root, s.dir, rel)),
    );
  }
  for (const rel of await kernelClosure(root, code)) {
    const file = `plugins/${p.name}/kernel/${rel}`;
    const source = `src/kernel/${rel}`;
    const from = path.join(root, source);
    if (isPromptModule(from)) {
      const folder = path.posix.join(path.posix.dirname(source), PROMPTS, "/");
      const text = await promptModule(root, path.dirname(from), made);
      out.push({ file, source: folder, text: withHeader(file, folder, text) });
      continue;
    }
    const text = await Bun.file(from).text();
    out.push({ file, source, text: withHeader(file, source, text) });
  }
  return out;
};
