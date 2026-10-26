// The reader of the edit ledger of spec `session-hygiene`: one file in the temp folder for each project.
// The mod runtime has no `node:` or `Bun` API, so the hash is plain JavaScript on numbers.

/** One edit: the path, the hash of the content after the edit, the session, and the agent. */
export interface LedgerLine {
  readonly path: string;
  readonly hash: string;
  readonly session: string;
  readonly agent: string;
}

/** One changed file of the work tree with the hash of its content now. */
export interface WorkFile {
  readonly path: string;
  readonly hash: string;
}

/** The hash of a file that does not exist. */
export const GONE = "gone";

const hex8 = (n: number): string => n.toString(16).padStart(8, "0");

/**
 * FNV-1a with 64 bits over the UTF-16 code units of `text`, as 16 hex digits.
 * The prime is 2^40 + 0x1b3, and the low half splits into 16-bit parts, so no product leaves the 53 bits of a number.
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

/** The base name and the hash of the root path, so two projects with one base name differ. */
export const projectKey = (root: string): string => {
  const name = root.replace(/\/+$/, "").replace(/^.*\//, "");
  return `${name.replace(/[^A-Za-z0-9._-]/g, "_")}-${hash64(root)}`;
};

export const ledgerPath = (tmp: string, root: string): string =>
  `${tmp}/claudetto/ledger/${projectKey(root)}.jsonl`;

/** The edits in a ledger file. A line that is not an edit adds nothing. */
export const parseLedger = (text: string): LedgerLine[] =>
  text.split("\n").flatMap((line) => {
    try {
      const v = JSON.parse(line) as Partial<LedgerLine> | null;
      return typeof v?.path === "string" &&
        typeof v.hash === "string" &&
        typeof v.session === "string" &&
        typeof v.agent === "string"
        ? [{ path: v.path, hash: v.hash, session: v.session, agent: v.agent }]
        : [];
    } catch {
      return [];
    }
  });

/** The edits that made `path` with the content of `hash`. No line means that the user or a tool made it. */
export const madeBy = (
  lines: readonly LedgerLine[],
  path: string,
  hash: string,
): LedgerLine[] => lines.filter((l) => l.path === path && l.hash === hash);

/** Each entry of `git status --porcelain -z` as its status code and its path from the root. A rename or a copy gives its new path. */
export const statusEntries = (
  stdout: string,
): { code: string; path: string }[] => {
  const found: { code: string; path: string }[] = [];
  const entries = stdout.split("\0");
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] as string;
    if (entry.length < 4) continue;
    const code = entry.slice(0, 2);
    found.push({ code, path: entry.slice(3) });
    // The entry of the old name of a rename or a copy follows, with no status.
    if (/[RC]/.test(code)) i++;
  }
  return found;
};

/** The paths of `git status --porcelain -z` that exist after the call: not deleted, not a folder, and the new name of a rename or a copy. */
export const statusPaths = (stdout: string): string[] =>
  statusEntries(stdout)
    .filter(({ code, path }) => !code.includes("D") && !path.endsWith("/"))
    .map(({ path }) => path);
