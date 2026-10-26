// The values that an env file held, kept as hashes so that they stay replaced when the file is gone or the mod loads again in the same session (task 19.20 of change `redesign-0-4-0`).
// A record holds a slow hash of a value (`ENV_SLOW_ROUNDS` rounds of SHA-256 over the salt of the install), its length, its key, and the first `ENV_HEAD_BITS` bits of the rolling hash of its first characters. It holds no value.
// A record exists only for a value of `ENV_PERSIST_MIN` or more characters, because a short value falls to a brute force of its record fast. `$.state` has no file, so no tool call of the agent can read a record.
// The result is scanned with a rolling hash of the first characters at each position. Only a position that the rolling hash finds is confirmed with the slow hash.
// The `crypto.subtle` of the runtime of a mod has `digest` only (no `deriveBits`), and each async round costs about 4 times the round of the SHA-256 below, so the slow hash is rounds of the SHA-256 below.

import {
  ENV_CONFIRMS_MAX,
  ENV_HEAD_BITS,
  ENV_PERSIST_MIN,
  ENV_SLOW_ROUNDS,
  ENV_VALUE_MIN,
} from "../../limits.ts";
import { MASKED } from "../../prompts.ts";

/** The records by slow hash in hex. `len` counts the characters of the value, and `head` is the first `ENV_HEAD_BITS` bits of the rolling hash of its first `ENV_VALUE_MIN` characters. The record under `SALT_ID` holds the salt of the install as its `key`, with `len` 0 and `head` set to `ENV_HEAD_BITS`, so that records of a reload with another head size are told apart and dropped. */
export interface Hashed {
  [hash: string]: { key: string; len: number; head: number };
}

/** The id of the record that holds the salt. It is no hex of 64 digits, so no hash is equal to it. */
export const SALT_ID = "salt";

const HEAD_MASK = 2 ** ENV_HEAD_BITS - 1;

/** The first `ENV_HEAD_BITS` bits of the 32-bit hash `h`, as a number that is not negative. */
const headOf = (h: number): number => ((h >>> 0) & HEAD_MASK) >>> 0;

const ROLL = 16_777_619;

const sqrtBits = (n: number): number =>
  Math.floor((Math.sqrt(n) % 1) * 2 ** 32);
const cbrtBits = (n: number): number =>
  Math.floor((Math.cbrt(n) % 1) * 2 ** 32);

const PRIMES = ((): number[] => {
  const found: number[] = [];
  for (let n = 2; found.length < 64; n++)
    if (found.every((p) => n % p !== 0)) found.push(n);
  return found;
})();
const K = PRIMES.map(cbrtBits);

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

/** The SHA-256 of the UTF-8 bytes of `text`, in hex. */
export const sha256 = (text: string): string => {
  const data = new TextEncoder().encode(text);
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor((data.length * 8) / 2 ** 32));
  view.setUint32(padded.length - 4, (data.length * 8) >>> 0);
  const h = PRIMES.slice(0, 8).map(sqrtBits);
  const w = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15] as number;
      const b = w[i - 2] as number;
      w[i] =
        ((w[i - 16] as number) +
          (rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)) +
          (w[i - 7] as number) +
          (rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10))) >>>
        0;
    }
    let [a, b, c, d, e, f, g, hh] = h as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    for (let i = 0; i < 64; i++) {
      const t1 =
        (hh +
          (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) +
          ((e & f) ^ (~e & g)) +
          (K[i] as number) +
          (w[i] as number)) >>>
        0;
      const t2 =
        ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) +
          ((a & b) ^ (a & c) ^ (b & c))) >>>
        0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((v, i) => {
      h[i] = ((h[i] as number) + v) >>> 0;
    });
  }
  return h.map((v) => v.toString(16).padStart(8, "0")).join("");
};

/** The first `ENV_HEAD_BITS` bits of the rolling hash of `text`. */
const head = (text: string): number => {
  let h = 0;
  for (let i = 0; i < text.length; i++)
    h = (Math.imul(h, ROLL) + text.charCodeAt(i) + 1) | 0;
  return headOf(h);
};

/** A new salt of 128 random bits, in hex. */
export const newSalt = (): string =>
  [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/** The slow hash of `value` under `salt`: `ENV_SLOW_ROUNDS` rounds of SHA-256, each over the last round, the salt, and the value. */
export const slowHash = (salt: string, value: string): string => {
  let h = sha256(salt + value);
  for (let i = 1; i < ENV_SLOW_ROUNDS; i++) h = sha256(h + salt + value);
  return h;
};

/** The record of a value of `ENV_PERSIST_MIN` or more characters, as `[hash, record]`. */
export const hashOf = (
  salt: string,
  key: string,
  value: string,
): [string, Hashed[string]] => [
  slowHash(salt, value),
  { key, len: value.length, head: head(value.slice(0, ENV_VALUE_MIN)) },
];

const HEX64 = /^[0-9a-f]{64}$/;
const HEX32 = /^[0-9a-f]{32}$/;

/** Whether `h` is a head of `ENV_HEAD_BITS` bits. */
const isHead = (h: unknown): boolean =>
  Number.isInteger(h) && (h as number) >= 0 && (h as number) <= HEAD_MASK;

/** Whether the salt record of `raw` is there with a head size other than `ENV_HEAD_BITS`. */
const isOldHead = (raw: object): boolean =>
  SALT_ID in raw && (raw as Hashed)[SALT_ID]?.head !== ENV_HEAD_BITS;

/** The records of `raw` that fit the shape of `Hashed`. A record that does not fit, such as one of an older version, is dropped. When the salt record has another head size than `ENV_HEAD_BITS`, it comes from a reload with an older head, and all records are dropped, because their heads would never match. */
export const validHashes = (raw: unknown): Hashed => {
  const out: Hashed = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  if (isOldHead(raw)) return out;
  for (const [id, r] of Object.entries(raw)) {
    const { key, len, head: h } = (r ?? {}) as Partial<Hashed[string]>;
    if (typeof key !== "string" || !Number.isInteger(len)) continue;
    if (!isHead(h)) continue;
    const isSalt =
      id === SALT_ID && HEX32.test(key) && len === 0 && h === ENV_HEAD_BITS;
    const isRecord =
      HEX64.test(id) && key !== "" && (len as number) >= ENV_PERSIST_MIN;
    if (isSalt || isRecord)
      out[id] = { key, len: len as number, head: h as number };
  }
  return out;
};

/** The positions of `text` where the first `ENV_HEAD_BITS` bits of the rolling hash of `size` characters are a key of `wanted`, and the records of the key. */
const windows = (
  text: string,
  size: number,
  wanted: ReadonlyMap<number, [string, Hashed[string]][]>,
  visit: (at: number, records: [string, Hashed[string]][]) => void,
): void => {
  if (wanted.size === 0 || text.length < size) return;
  let top = 1;
  for (let i = 1; i < size; i++) top = Math.imul(top, ROLL);
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    if (i >= size) h = (h - Math.imul(text.charCodeAt(i - size) + 1, top)) | 0;
    h = (Math.imul(h, ROLL) + text.charCodeAt(i) + 1) | 0;
    if (i >= size - 1) {
      const records = wanted.get(headOf(h));
      if (records !== undefined) visit(i - size + 1, records);
    }
  }
};

/** The slow confirms of one call: how many are left, the hash of each text that a confirm ran on, and whether a find went unconfirmed. */
export interface Budget {
  left: number;
  isCut: boolean;
  seen: Map<string, string>;
  heads: Map<number, [string, Hashed[string]][]>;
}

/** A new budget of `ENV_CONFIRMS_MAX` confirms, with the records of `known` by head, built once for the call. */
export const newBudget = (known: Hashed = {}): Budget => {
  const heads = new Map<number, [string, Hashed[string]][]>();
  for (const [hash, record] of Object.entries(known))
    if (hash !== SALT_ID)
      heads.set(record.head, [
        ...(heads.get(record.head) ?? []),
        [hash, record],
      ]);
  return { left: ENV_CONFIRMS_MAX, isCut: false, seen: new Map(), heads };
};

/** The slow hash of `found`, from the budget when it ran on `found` before, else one confirm of it. It is `undefined` and sets `isCut` when no confirm is left. */
const confirm = (
  budget: Budget,
  salt: string,
  found: string,
): string | undefined => {
  const seen = budget.seen.get(found);
  if (seen !== undefined) return seen;
  if (budget.left <= 0) {
    budget.isCut = true;
    return undefined;
  }
  budget.left--;
  const hash = slowHash(salt, found);
  budget.seen.set(found, hash);
  return hash;
};

/** `text` with each value of `known` replaced by `[value of KEY]`. The slow hash confirms each find, and it runs once for each text that a position gives. When `budget` has no confirm left, a find is masked with no confirm and `isCut` is set, because a mask that is wrong is safe and a value that shows is not. */
export const scrubHashed = (
  text: string,
  known: Hashed,
  budget: Budget = newBudget(known),
): string => {
  const salt = known[SALT_ID]?.key;
  if (salt === undefined) return text;
  const spans: [number, number, string][] = [];
  windows(text, ENV_VALUE_MIN, budget.heads, (at, records) => {
    for (const [id, { key, len }] of records) {
      const to = at + len;
      if (to > text.length) continue;
      const found = text.slice(at, to);
      const hash = confirm(budget, salt, found);
      if (hash === undefined || hash === id) spans.push([at, to, key]);
    }
  });
  if (spans.length === 0) return text;
  spans.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let out = "";
  let end = 0;
  for (const [from, to, key] of spans) {
    if (from < end) {
      end = Math.max(end, to);
      continue;
    }
    out += text.slice(end, from) + MASKED({ key });
    end = to;
  }
  return out + text.slice(end);
};
