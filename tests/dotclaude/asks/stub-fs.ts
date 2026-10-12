// A stub file system for the adherence tests. `files` maps a path to its text.
// The hook resolves a path with `node:path`, and on Windows `/w/a.mjs` becomes `D:\w\a.mjs`.
// The stub resolves its keys in the same way, so a test names a file in the POSIX form on each platform.

import path from "node:path";

/** `{ read, exists }` for `files`, with each key resolved by `path.resolve`. */
export function filesByPath(files: Record<string, string> = {}) {
  const resolved = new Map(
    Object.entries(files).map(([file, text]) => [path.resolve(file), text]),
  );
  return {
    read: async (file: string) => resolved.get(path.resolve(file)) ?? null,
    exists: (file: string) => resolved.has(path.resolve(file)),
  };
}
