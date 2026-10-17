// A stub file system for the adherence tests. `files` maps a path to its text.
// The hook resolves a path with `node:path`.
// The stub resolves its keys in the same way, so a key and a path of the hook match.

import path from "node:path";

/** `{ read, exists }` for `files`, with each key resolved by `path.resolve`. */
export const filesByPath = (files: Record<string, string> = {}) => {
  const resolved = new Map(
    Object.entries(files).map(([file, text]) => [path.resolve(file), text]),
  );
  return {
    read: async (file: string) => resolved.get(path.resolve(file)) ?? null,
    exists: (file: string) => resolved.has(path.resolve(file)),
  };
};
