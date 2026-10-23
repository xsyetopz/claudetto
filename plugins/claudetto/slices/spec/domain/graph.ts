// The artifact graph of a schema: the status of each artifact, in build order.

export type Artifact = {
  id: string;
  generates: string;
  description?: string;
  template?: string;
  instruction?: string;
  requires: string[];
};

/**
 * The status of each artifact in build order: after each artifact that it requires, ties in schema order.
 * `done` holds the ids whose `generates` pattern matches a file, and with `skipSpecs` an artifact under `specs/` is `skipped`.
 */
export const statuses = (
  artifacts: Artifact[],
  done: Set<string>,
  skipSpecs: boolean,
) => {
  const skipped = (a: Artifact) =>
    skipSpecs && a.generates.startsWith("specs/");
  const finished = new Set(
    artifacts.filter((a) => done.has(a.id) || skipped(a)).map((a) => a.id),
  );
  const order: Artifact[] = [];
  const ready = () =>
    artifacts.find(
      (x) =>
        !order.includes(x) &&
        x.requires.every((r) => order.some((o) => o.id === r)),
    );
  for (let a = ready(); a; a = ready()) order.push(a);
  return order.map((a) => {
    const missingDeps = a.requires.filter((r) => !finished.has(r));
    const status = skipped(a)
      ? "skipped"
      : done.has(a.id)
        ? "done"
        : missingDeps.length
          ? "blocked"
          : "ready";
    return {
      id: a.id,
      outputPath: a.generates,
      requires: a.requires,
      status,
      ...(status === "blocked" && { missingDeps }),
    };
  });
};
