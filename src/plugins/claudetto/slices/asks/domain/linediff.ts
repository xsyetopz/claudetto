// Two small readers of the lines of a test file, as pure functions.

/** The text of a line without the indent mark of `codeLines`. */
export const textOf = (line: string): string => line.replace(/^\d+\|/, "");

/** The indices of the lines of `now` that `was` does not hold, with one match for each line of `was`. */
export const addedAt = (was: string[], now: string[]): number[] => {
  const left = new Map<string, number>();
  for (const item of was) left.set(item, (left.get(item) ?? 0) + 1);
  return now.flatMap((item, i) => {
    const n = left.get(item) ?? 0;
    if (n) left.set(item, n - 1);
    return n === 0 ? [i] : [];
  });
};
