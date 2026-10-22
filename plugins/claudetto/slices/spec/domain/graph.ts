// The artifact graph of a schema: the status of each artifact, in build order.

export interface Artifact {
  readonly id: string;
  readonly generates: string;
  readonly template?: string;
  readonly instruction?: string;
  readonly requires: readonly string[];
}

/**
 * The status of each artifact, in build order: an artifact comes after each artifact that it requires, and ties keep the order of the schema.
 * `done` holds the ids whose `generates` pattern matches a file.
 * A `blocked` artifact lists its `missingDeps`.
 * With `skipSpecs`, an artifact that generates under `specs/` is `skipped` and counts as done.
 */
export const statuses = (
  artifacts: readonly Artifact[],
  done: ReadonlySet<string>,
  skipSpecs: boolean,
) => {
  const skipped = (a: Artifact): boolean =>
    skipSpecs && a.generates.startsWith("specs/");
  const finished = new Set(
    artifacts.filter((a) => done.has(a.id) || skipped(a)).map((a) => a.id),
  );
  const order: Artifact[] = [];
  const ready = (): Artifact | undefined =>
    artifacts.find(
      (a) =>
        !order.includes(a) &&
        a.requires.every((r) => order.some((o) => o.id === r)),
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
