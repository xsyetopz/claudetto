// The ask for a download of a check tool that the project does not have: `bunx eslint`, `npx tsc`, `pnpm dlx`, `yarn dlx`, `bun x`, and `npm exec`.
// When `node_modules` has no such tool, the runner gets it from npm, in a version that the project did not choose, and it checks nothing of the project.
// A download of another tool, such as `npx create-vite` or the `ctx7` of `claudetto-docs`, gets no ask, because it is not a check.
// The reason states facts that claudetto reads: the installed `bun --version` and the files of the project.
// Claude then acts on a fact and not on what it remembers of a toolchain.
// The functions read through `Facts`, and the version comes only on a `tsc` hit.

import { parse } from "../../../../../kernel/shell.ts";
import { baseName, stripWrappers } from "../../../../../kernel/wrappers.ts";
import { BUN_CHECK_MIN, DOWNLOAD_RUNNERS } from "../limits.ts";
import {
  DOWNLOAD_CHECK_BUN,
  DOWNLOAD_CHECK_PLAIN,
  DOWNLOAD_TOOL,
} from "../prompts.ts";
import { runsCheck } from "./checkcmd.ts";

/** What the ask reads of the environment. A fact that is absent means that the ask has no ground, so it stays silent. */
export interface Facts {
  /** True when the file exists. */
  exists: (file: string) => Promise<boolean>;
  /** The text of `bun --version`, or `null` when `bun` does not run. */
  bunVersion: () => Promise<string | null>;
}

/** The tool of a runner call: the packages that it gets, and the program that it runs when the name of the program is known. */
export interface Download {
  packages: string[];
  bin: string | null;
  /** True when `-p` or `--package` names the packages, so the runner gets each of them and a local program is not enough. */
  named: boolean;
  /** The program without its version, and its arguments. */
  run: string[];
}

/** The numbers of a version such as `1.4.3`, or `null` when it has no three numbers. */
export const versionParts = (text: string): number[] | null => {
  const parts = text.trim().split(".").slice(0, 3).map(Number);
  return parts.length === 3 && parts.every(Number.isInteger) ? parts : null;
};

/** True when version `text` is at least `min`. */
export const atLeast = (text: string, min: string): boolean => {
  const have = versionParts(text);
  const need = versionParts(min);
  if (!have || !need) return false;
  for (let i = 0; i < 3; i++) {
    if ((have[i] as number) !== (need[i] as number))
      return (have[i] as number) > (need[i] as number);
  }
  return true;
};

/** The name of a package spec without its version: `eslint@9` gives `eslint`, and `@biomejs/biome@2` gives `@biomejs/biome`. */
export const packageName = (spec: string): string => {
  const at = spec.indexOf("@", 1);
  return at === -1 ? spec : spec.slice(0, at);
};

/** True when a spec names a local path, which the runner does not download. */
const localSpec = (spec: string): boolean =>
  spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("file:");

/**
 * The tool of the command `words` when it is a runner call, or `null`.
 * `-p` and `--package` name the packages, and the first word that is not a flag is the program.
 * A call with `-c` or `--call` runs a command text, so it gives `null`, as does a local path.
 */
export const downloadOf = (words: readonly string[]): Download | null => {
  const [head = "", ...rest] = words;
  const runner = DOWNLOAD_RUNNERS[baseName(head)];
  if (runner === undefined) return null;
  const after =
    runner === "" ? rest : rest[0] === runner ? rest.slice(1) : null;
  if (after === null) return null;
  const packages: string[] = [];
  let program: string | undefined;
  let i = 0;
  for (; i < after.length && program === undefined; i++) {
    const word = after[i] as string;
    if (word === "-c" || word.startsWith("--call")) return null;
    if (word === "-p" || word === "--package") {
      const value = after[++i];
      if (value !== undefined) packages.push(value);
    } else if (word.startsWith("--package=")) {
      packages.push(word.slice("--package=".length));
    } else if (!word.startsWith("-")) program = word;
  }
  if (program === undefined) return null;
  const args = after.slice(i);
  if (packages.length > 0) {
    return packages.some(localSpec)
      ? null
      : {
          packages: packages.map(packageName),
          bin: program,
          named: true,
          run: [program, ...args],
        };
  }
  if (localSpec(program)) return null;
  const name = packageName(program);
  return {
    packages: [name],
    bin: name.startsWith("@") ? null : name,
    named: false,
    run: [name, ...args],
  };
};

/** True when the project in `root` has the tool: each of its packages in `node_modules`, or its program in `node_modules/.bin` when no `-p` names a package. */
const hasLocally = async (
  tool: Download,
  root: string,
  facts: Facts,
): Promise<boolean> => {
  if (
    !tool.named &&
    tool.bin !== null &&
    (await facts.exists(`${root}/node_modules/.bin/${tool.bin}`))
  )
    return true;
  for (const name of tool.packages) {
    if (!(await facts.exists(`${root}/node_modules/${name}/package.json`)))
      return false;
  }
  return true;
};

/** The ask text for a `tsc` download: with `bun check` when the installed Bun has it. */
const tscReason = async (
  command: string,
  root: string,
  facts: Facts,
): Promise<string> => {
  const version = await facts.bunVersion();
  if (version === null || !atLeast(version, BUN_CHECK_MIN))
    return DOWNLOAD_CHECK_PLAIN({ command });
  const config = (await facts.exists(`${root}/tsconfig.json`))
    ? "tsconfig.json"
    : "the config of the project";
  return DOWNLOAD_CHECK_BUN({ command, version: version.trim(), config });
};

/** The ask text for the `Bash` command `command` in the project `root`, or `null` when no part of it downloads a check tool that the project does not have. `tsc` counts with no flag. */
export const downloadReason = async (
  command: string,
  root: string,
  facts: Facts,
): Promise<string | null> => {
  for (const argv of parse(command).commands) {
    const words = stripWrappers(argv);
    const tool = downloadOf(words);
    if (tool === null) continue;
    if (tool.bin !== "tsc" && !runsCheck(tool.run)) continue;
    if (await hasLocally(tool, root, facts)) continue;
    const text = words.join(" ");
    if (tool.bin === "tsc") return tscReason(text, root, facts);
    return DOWNLOAD_TOOL({
      command: text,
      name: tool.bin ?? (tool.packages[0] as string),
    });
  }
  return null;
};
