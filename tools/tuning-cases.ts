#!/usr/bin/env -S bun --no-env-file
// Prints the names of the eval cases for prompt work (D17), one for each line.
// A case tagged `split:held-out` is not printed, so tuning never sees it (D25).

import { join } from "node:path";
import { parse } from "yaml";

/** The case names under `root` that match `glob`, without the cases tagged `split:held-out`. */
export const tuningCasesIn = async (
  root: string,
  glob = "src/plugins/claudetto/**/evals/*/case.yaml",
): Promise<string[]> => {
  const names: string[] = [];
  for await (const f of new Bun.Glob(glob).scan(root)) {
    const doc = parse(await Bun.file(join(root, f)).text());
    if (!(doc?.tags ?? []).includes("split:held-out")) names.push(doc.name);
  }
  return names.sort();
};

if (import.meta.main) {
  const root = join(import.meta.dirname, "..");
  for (const name of await tuningCasesIn(root)) console.log(name);
}
