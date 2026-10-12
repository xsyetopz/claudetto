// The plan files of one change: the list `packages.md` with its waves, and the briefs in `packages/`.

import path from "node:path";
import { SPEC_ROOT } from "../../../../../kernel/paths.ts";
import type { FormatError, Package } from "../domain/formats.ts";
import { parsePackage } from "../domain/plan.ts";
import type { SpecStore } from "./store.ts";

/** One package of the list: its id, its wave, and its checkbox. */
export interface Entry {
  id: string;
  wave: number;
  checked: boolean;
}

const WAVE = /^## Wave (\d+)\b/;
const ENTRY = /^- \[( |x)\] (P[0-9A-Za-z]+)\b/;

/** The packages of the text of `packages.md`, in file order. A package before the first wave heading is in wave 0. */
export const parseEntries = (text: string): Entry[] => {
  const entries: Entry[] = [];
  let wave = 0;
  for (const line of text.split(/\r?\n/)) {
    const heading = WAVE.exec(line);
    if (heading) wave = Number(heading[1]);
    const entry = ENTRY.exec(line);
    if (entry) {
      entries.push({ id: entry[2] ?? "", wave, checked: entry[1] === "x" });
    }
  }
  return entries;
};

/** The text of `packages.md` with the checkbox of the line of package `pkg` set to `checked`. */
export const setChecked = (
  text: string,
  pkg: string,
  checked: boolean,
): string =>
  text
    .split("\n")
    .map((line) => {
      const entry = ENTRY.exec(line);
      return entry?.[2] === pkg
        ? line.replace(/^- \[( |x)\]/, `- [${checked ? "x" : " "}]`)
        : line;
    })
    .join("\n");

/** The list of the change `id`, or an empty list when it has no `packages.md`. */
export const readEntries = async (
  store: SpecStore,
  id: string,
): Promise<Entry[]> =>
  parseEntries(
    (await store.files.read(path.posix.join(SPEC_ROOT, id, "packages.md"))) ??
      "",
  );

/** One brief that did not parse: the file and its format errors. */
export interface BriefFailure {
  file: string;
  errors: FormatError[];
}

/** The briefs of the change `id` that parse, with the failures of the others. */
export const readBriefs = async (
  store: SpecStore,
  id: string,
): Promise<{
  packages: Package[];
  /** The text of each brief that parses, by package id. */
  texts: Record<string, string>;
  failures: BriefFailure[];
}> => {
  const dir = path.posix.join(SPEC_ROOT, id, "packages");
  const packages: Package[] = [];
  const texts: Record<string, string> = {};
  const failures: BriefFailure[] = [];
  for (const name of await store.markdown(dir)) {
    const file = path.posix.join(dir, name);
    const text = (await store.files.read(file)) ?? "";
    const parsed = parsePackage(text);
    if (parsed.ok) {
      packages.push(parsed.value);
      texts[parsed.value.front.id] = text;
    } else failures.push({ file, errors: parsed.errors });
  }
  return { packages, texts, failures };
};
