// The output of a CLI `main` in this process, for a test to read.

/** An `io` that keeps each printed line, and `text` that gives them as one string. */
export const captureIo = () => {
  const lines: string[] = [];
  const keep = (l: string) => void lines.push(l);
  return { io: { log: keep, error: keep }, text: () => lines.join("\n") };
};
