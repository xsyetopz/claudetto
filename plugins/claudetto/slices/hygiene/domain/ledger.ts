// The edit ledger of spec `session-hygiene`: the path, the hash of the content, and the agent of each file that an agent edited.
// It lives in `$.state`, so it has no file and ends with the session.
// The mod runtime has no `node:` or `Bun` API, so the hash is plain JavaScript on numbers.

import { LEDGER_MAX_FILES } from "../limits.ts";

/** One file of the ledger. `told` is the hash for which the agent got a line already. */
export interface LedgerEntry {
  readonly hash: string;
  readonly agent: string;
  readonly told?: string;
}

/** The ledger by path, with the newest edit last. Its shape equals the `ledger` value of `types/index.d.ts`. */
export type Ledger = { [path: string]: LedgerEntry };

/** The hash of a file that does not exist. */
export const GONE = "gone";

const hex8 = (n: number): string => n.toString(16).padStart(8, "0");

/**
 * FNV-1a with 64 bits over the UTF-16 code units of `text`, as 16 hex digits.
 * The prime is 2^40 + 0x1b3, so a step splits into a product by 0x1b3 and a shift of the low half by 8 bits.
 * The low half splits into two 16-bit parts, so no product leaves the 53 bits of a number.
 */
export const hash64 = (text: string): string => {
  let hi = 0xcbf29ce4;
  let lo = 0x84222325;
  for (let i = 0; i < text.length; i++) {
    lo = (lo ^ text.charCodeAt(i)) >>> 0;
    const a = (lo & 0xffff) * 0x1b3;
    const b = (lo >>> 16) * 0x1b3;
    const sum = a + (b % 0x10000) * 0x10000;
    const carry = Math.floor(sum / 0x100000000) + Math.floor(b / 0x10000);
    hi = (Math.imul(hi, 0x1b3) + carry + (lo << 8)) >>> 0;
    lo = sum % 0x100000000;
  }
  return hex8(hi) + hex8(lo);
};

/** The ledger with the edit of `agent` to `path`. The file moves to the end, and the oldest entries go past `LEDGER_MAX_FILES`. */
export const withEdit = (
  ledger: Ledger,
  path: string,
  hash: string,
  agent: string,
): Ledger => {
  const { [path]: _old, ...rest } = ledger;
  const paths = Object.keys(rest).slice(-(LEDGER_MAX_FILES - 1));
  return {
    ...Object.fromEntries(paths.map((p) => [p, rest[p] as LedgerEntry])),
    [path]: { hash, agent },
  };
};

export interface Changed {
  readonly path: string;
  readonly agent: string;
}

/**
 * The files whose hash now is not the hash of the last edit, and not the hash that the agent got a line for already.
 * `now` holds the hash of each file, and `GONE` for a file that does not exist.
 */
export const changedFiles = (
  ledger: Ledger,
  now: Readonly<Record<string, string>>,
): Changed[] =>
  Object.entries(ledger)
    .filter(([path, e]) => {
      const h = now[path];
      return h !== undefined && h !== e.hash && h !== e.told;
    })
    .map(([path, e]) => ({ path, agent: e.agent }));

export const withTold = (
  ledger: Ledger,
  changed: readonly Changed[],
  now: Readonly<Record<string, string>>,
): Ledger => ({
  ...ledger,
  ...Object.fromEntries(
    changed.flatMap(({ path }) => {
      const e = ledger[path];
      const h = now[path];
      return e && h !== undefined ? [[path, { ...e, told: h }]] : [];
    }),
  ),
});
