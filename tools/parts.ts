// The `just validate` rules of D40 and D41 for the parts of the repository.
// A part is a slice of the core plugin, an add-on plugin, `src/kernel/`, or `tools/`.
// The pins and the allow lists are in `tools/limits.ts`.

import {
  PART_LINE_PINS,
  RECIPE_FILES,
  SHORT_FILE_ALLOWED,
  SHORT_FILE_MIN_LINES,
  THIN_FOLDER_ALLOWED,
} from "./limits.ts";

const PART = [
  /^src\/plugins\/claudetto\/slices\/[^/]+/,
  /^src\/plugins\/claudetto-[^/]+/,
  /^src\/kernel/,
  /^tools/,
];
// The files that the generator or Claude Code needs, whatever their size.
const ENTRY = /(?:^|\/)(?:slice|plugin|limits)\.ts$|\/adapters\/mod\.ts$/;
const THIN_DIR = /^(.*\/(?:domain|adapters))\//;

/** The code files of the rules: the `.ts` files that are not tests. */
const isCode = (file: string): boolean =>
  /\.ts$/.test(file) &&
  !/\.(test|d)\.ts$/.test(file) &&
  PART.some((p) => p.test(file));

/** The part that holds `file`, as its folder path, or `undefined`. */
export const partOf = (file: string): string | undefined => {
  for (const p of PART) {
    const m = p.exec(file);
    if (m) return m[0];
  }
  return undefined;
};

/** The line count of each part: the sum of the lines of its code files. */
export const partLines = (
  files: string[],
  linesOf: (file: string) => number,
): Record<string, number> => {
  const sum: Record<string, number> = {};
  for (const f of files.filter(isCode)) {
    const part = partOf(f) as string;
    sum[part] = (sum[part] ?? 0) + linesOf(f);
  }
  return sum;
};

/** The parts that are over their pin, or that have none, as a message each. */
export const overPins = (
  sum: Record<string, number>,
  pins: Record<string, number> = PART_LINE_PINS,
): string[] =>
  Object.entries(sum).flatMap(([part, n]) => {
    const pin = pins[part];
    if (pin === undefined)
      return [`${part}: ${n} lines and no pin in \`tools/limits.ts\``];
    return n > pin ? [`${part}: ${n} lines, over its pin of ${pin}`] : [];
  });

/** The code files under the minimum that are not an entry point and not in `allowed`, and the entries of `allowed` that are no longer a violation. */
export const shortFiles = (
  files: string[],
  linesOf: (file: string) => number,
  allowed: readonly string[] = SHORT_FILE_ALLOWED,
): string[] => {
  const short = files
    .filter(isCode)
    .filter(
      (f) =>
        !ENTRY.test(f) &&
        !RECIPE_FILES.includes(f) &&
        linesOf(f) < SHORT_FILE_MIN_LINES,
    );
  return [
    ...short
      .filter((f) => !allowed.includes(f))
      .map((f) => `${f}: ${linesOf(f)} lines, under ${SHORT_FILE_MIN_LINES}`),
    ...allowed
      .filter((f) => !short.includes(f))
      .map(
        (f) =>
          `${f}: allowed in \`tools/limits.ts\` but no longer a short file`,
      ),
  ];
};

/** The `domain/` and `adapters/` folders with one file that are not in `allowed`, and the stale entries of `allowed`. */
export const thinFolders = (
  files: string[],
  allowed: readonly string[] = THIN_FOLDER_ALLOWED,
): string[] => {
  const count = new Map<string, number>();
  for (const f of files.filter((x) => PART.some((p) => p.test(x)))) {
    const dir = THIN_DIR.exec(f)?.[1];
    if (dir) count.set(dir, (count.get(dir) ?? 0) + 1);
  }
  // The generator builds the launcher from `adapters/cli.ts` and the hooks from `adapters/mod.ts`, so a folder with only one of them stays.
  // A `prompts/` folder stays too, because the generator builds `prompts.ts` from it.
  const thin = [...count]
    .filter(
      ([d, n]) =>
        n < 2 &&
        !files.includes(`${d}/mod.ts`) &&
        !files.includes(`${d}/cli.ts`),
    )
    .map(([d]) => d);
  return [
    ...thin
      .filter((d) => !allowed.includes(d))
      .map((d) => `${d}: a folder with one file`),
    ...allowed
      .filter((d) => !thin.includes(d))
      .map(
        (d) =>
          `${d}: allowed in \`tools/limits.ts\` but no longer a thin folder`,
      ),
  ];
};
