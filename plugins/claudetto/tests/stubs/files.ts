// The answer of a stubbed `fs.list`, which the lab tests of several slices share.
// The file holds no test, so a copy in each test file would be a clone.

/** The entries of the folder `dir` for the file paths `paths`: the files directly in it, and the first folder part of each deeper path. */
export const listing = (
  paths: readonly string[],
  dir: string,
): {
  name: string;
  kind: "file" | "dir";
  size: number;
  mtimeMs: number;
  isLink: boolean;
}[] => {
  const rest = paths
    .filter((f) => f.startsWith(`${dir}/`))
    .map((f) => f.slice(dir.length + 1).split("/"));
  const dirs = new Set(rest.filter((p) => p.length > 1).map((p) => p[0] ?? ""));
  return [
    ...rest
      .filter((p) => p.length === 1)
      .map((p) => ({
        name: p[0] ?? "",
        kind: "file" as const,
        size: 0,
        mtimeMs: 0,
        isLink: false,
      })),
    ...[...dirs].map((name) => ({
      name,
      kind: "dir" as const,
      size: 0,
      mtimeMs: 0,
      isLink: false,
    })),
  ];
};
