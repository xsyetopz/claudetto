// The token counts and the price of the `advise` calls of one run, from its debug log (`claude --debug-file`).
// `advise` writes one line for each call with `$.ui.log`, and the debug log holds every `$.ui.log` line.

/**
 * The prices in USD for one million tokens of `claude-opus-5-5`, read as evidence from the model catalog in the bundle of Claude Code 2.1.305 and 2.1.306.
 * The catalog entry of the model (`VERTEX_REGION_CLAUDE_5_5_OPUS`) has the pricing `tier_4_20_cache_read_0_20`: input 4, output 20, cache write 5 (5 minutes), cache read 0.2.
 * A run of the built-in advisor confirms it: `modelUsage` gave 22528 tokens in and 4309 tokens out for a `costUSD` of 0.176292, which is 4 and 20.
 * The wiki page `Builtin-Comparisons` cites this.
 */
export const OPUS_PRICE = { input: 4, output: 20, read: 0.2, write: 5 };

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

/**
 * The six faults of `tests/compare/advice-audit-web/src/web.mjs`: the function and the words of its fault.
 * The words are fixed before any advice is graded, and they follow `final.sh` of the case.
 */
export const FAULTS: Record<string, RegExp> = {
  verifyToken: /exp\b|expir|lifetime|replay|revok|revoc/i,
  codeOk:
    /exponent|1e\d|scientific|leading zero|hex|0x|Number\(|coerc|whitespace|trim|equivalent/i,
  extractFile: /mode|setuid|chmod|permission|executable|suid/i,
  getInvoice:
    /precision|2\^53|MAX_SAFE|safe integer|collision|large|round|exact/i,
  inlineData: /script|<\/|xss|breakout|2028|inject|escape/i,
  downloadHeader: /quote|crlf|newline|header injection|inject|escape|split/i,
};

/** The faults that a text of advice names: the name of the function is in the text, and the words of its fault are within 400 characters of it. */
export const advicePoints = (text: string): string[] =>
  Object.entries(FAULTS)
    .filter(([name, words]) => {
      for (const m of text.matchAll(new RegExp(name, "g"))) {
        const at = m.index ?? 0;
        if (words.test(text.slice(Math.max(0, at - 400), at + 400)))
          return true;
      }
      return false;
    })
    .map(([name]) => name);

/** The faults that the `FINDINGS.txt` of a run names: a line that starts with the function and holds the words of its fault. */
export const findingsPoints = (text: string): string[] =>
  Object.entries(FAULTS)
    .filter(([name, words]) =>
      text
        .split("\n")
        .some(
          (line) =>
            new RegExp(`^[-* 0-9.]*\`?${name}\`?[(): -]`, "i").test(line) &&
            words.test(line),
        ),
    )
    .map(([name]) => name);
