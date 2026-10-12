// The name of a handoff file, and the choice of the newest one.

const NAME = /^handoff-\d{8}T\d{6}Z\.md$/;

/** The name of the handoff file for `date`. The names sort in the order of their time. */
export const handoffName = (date: Date): string =>
  `handoff-${date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z")}.md`;

/** The newest handoff file name in `names`, or undefined when none is a handoff file. */
export const newestName = (names: readonly string[]): string | undefined =>
  names
    .filter((name) => NAME.test(name))
    .sort()
    .at(-1);
