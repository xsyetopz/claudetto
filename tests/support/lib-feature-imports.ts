// The import rules of the `lib/` and `features/` folders of the core plugin.
// `import-rules.ts` runs them in `RULES`, and the folders and this file go away together.

import { edges, type Files, inside, within } from "./import-graph.ts";

// Rule 1: `lib/` imports only `lib/` by relative path.
export const checkLib = (files: Files): string[] => {
  const bad: string[] = [];
  for (const { file, spec, target } of edges(files))
    if (within(file)[0] === "lib" && target && inside(file, target))
      if (within(target)[0] !== "lib")
        bad.push(`${file}: lib imports ${spec}, and lib imports only lib`);
  return bad;
};

// Rule 2: a feature file imports only `lib/` and its own feature folder.
export const checkFeatures = (files: Files): string[] => {
  const bad: string[] = [];
  for (const { file, spec, target } of edges(files)) {
    const [top, name] = within(file);
    if (top !== "features" || !target || !inside(file, target)) continue;
    const [tTop, tName] = within(target);
    if (tTop !== "lib" && !(tTop === "features" && tName === name))
      bad.push(
        `${file}: feature ${name} imports ${spec}, outside lib and itself`,
      );
  }
  return bad;
};
