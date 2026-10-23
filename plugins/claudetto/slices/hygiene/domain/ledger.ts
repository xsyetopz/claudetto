// The writer side of the edit ledger (spec `session-hygiene`). The reader is in `kernel/ledger.ts`, because `guard` reads it too.

import type { LedgerLine } from "../../../kernel/ledger.ts";
import { LEDGER_MAX_FILES } from "../limits.ts";

/** The hash for which a session got a line already, by path. It is a state of that session only. */
export type Told = { [path: string]: string };

export const ledgerText = (lines: readonly LedgerLine[]): string =>
  lines.map((l) => `${JSON.stringify(l)}\n`).join("");

/** The lines with `line` at the end. It replaces the earlier line of the same path and session, and the oldest lines go past `LEDGER_MAX_FILES`. */
export const withEdit = (
  lines: readonly LedgerLine[],
  line: LedgerLine,
): LedgerLine[] =>
  [
    ...lines.filter((l) => l.path !== line.path || l.session !== line.session),
    line,
  ].slice(-LEDGER_MAX_FILES);

export interface Changed {
  readonly path: string;
  readonly agent: string;
}

/**
 * The files of `session` whose hash now is not the hash of its last edit, of any other edit, or of the last line that the session got.
 * A hash of another edit names a known maker, so it is no change of the user or a tool.
 * `now` holds the hash of each file, and `GONE` for a file that does not exist.
 */
export const changedFiles = (
  lines: readonly LedgerLine[],
  session: string,
  told: Readonly<Told>,
  now: Readonly<Record<string, string>>,
): Changed[] =>
  lines
    .filter((l) => l.session === session)
    .filter((l) => {
      const h = now[l.path];
      return (
        h !== undefined &&
        h !== l.hash &&
        h !== told[l.path] &&
        !lines.some((o) => o.path === l.path && o.hash === h)
      );
    })
    .map(({ path, agent }) => ({ path, agent }));

export const withTold = (
  told: Readonly<Told>,
  changed: readonly Changed[],
  now: Readonly<Record<string, string>>,
): Told => ({
  ...told,
  ...Object.fromEntries(
    changed.flatMap(({ path }) => {
      const h = now[path];
      return h === undefined ? [] : [[path, h]];
    }),
  ),
});
