// The writer side of the edit ledger (spec `session-hygiene`). The reader is in `modules/project/domain/ledger.ts`, because `guard` reads it too.

import type { LedgerLine } from "../../../project/domain/ledger.ts";
import { LEDGER_MAX_FILES } from "../limits.ts";

/** The lines with `line` at the end. It replaces the earlier line of the same path, session, and origin, and the oldest lines go past `LEDGER_MAX_FILES`. */
export const withEdit = (
	lines: readonly LedgerLine[],
	line: LedgerLine,
): LedgerLine[] =>
	[
		...lines.filter(
			(l) =>
				l.path !== line.path ||
				l.session !== line.session ||
				l.via !== line.via,
		),
		line,
	].slice(-LEDGER_MAX_FILES);
