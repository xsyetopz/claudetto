// The token counts and the price of the `advise` calls of one run, from its debug log (`claude --debug-file`).
// `advise` writes one line for each call with `$.ui.log`, and the debug log holds every `$.ui.log` line.

/** The prices in USD for one million tokens of `claude-opus-5-5`, read as evidence from the bundle of Claude Code 2.1.305 and 2.1.306 (`kb` there). The page `Builtin-Comparisons` of the wiki cites them. */
export const OPUS_PRICE = { input: 8, output: 40, read: 0.4, write: 10 };

/** The token counts of the `advise` calls in a debug log, from the lines that `usageLine` of the slice writes, and their price. */
export const adviseUsage = (log: string) => {
  const u = { calls: 0, input: 0, read: 0, write: 0, output: 0, cost: 0 };
  const line =
    /`advise`: \S+ used (\d+) tokens in \((\d+) read from the cache, (\d+) written to the cache\), (\d+) tokens out\./g;
  for (const m of log.matchAll(line)) {
    const [input, read, write, output] = m.slice(1).map(Number) as [
      number,
      number,
      number,
      number,
    ];
    u.calls += 1;
    u.input += input;
    u.read += read;
    u.write += write;
    u.output += output;
  }
  const fresh = u.input - u.read - u.write;
  u.cost =
    (fresh * OPUS_PRICE.input +
      u.read * OPUS_PRICE.read +
      u.write * OPUS_PRICE.write +
      u.output * OPUS_PRICE.output) /
    1e6;
  return u;
};
