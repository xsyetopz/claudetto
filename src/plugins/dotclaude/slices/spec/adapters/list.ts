// `dotclaude-spec list [--json]`: the open and the archived changes, with the size, the status, and the state counts of each.

import fs from "node:fs";
import path from "node:path";
import { ARCHIVE_DIR, SPEC_ROOT } from "../../../../../kernel/paths.ts";
import { PACKAGE_STATES } from "../domain/states.ts";
import { parseArgs } from "./args.ts";
import { readChange } from "./files.ts";
import { countStates, ICONS } from "./graph.ts";
import type { Run } from "./run.ts";

/** One change of the list. */
export interface ChangeRow {
  readonly id: string;
  readonly archived: boolean;
  readonly size: string;
  readonly status: string;
  /** The count of packages in each state. A change with no `events.jsonl` has no counts. */
  readonly states: Readonly<Record<string, number>>;
  /** The reason that the log of the change cannot be read, such as a schema that this version does not read. */
  readonly problem?: string;
}

const rowOf = async (
  run: Run,
  id: string,
  archived: boolean,
): Promise<ChangeRow> => {
  const rel = archived
    ? path.posix.join(path.posix.basename(ARCHIVE_DIR), id)
    : id;
  const change = await readChange(run.store, rel);
  try {
    const events = await run.store.events(rel);
    return {
      id,
      archived,
      size: change?.size ?? "",
      status: change?.status ?? "",
      states: events ? countStates(await run.store.states(rel, events)) : {},
    };
  } catch (error) {
    return {
      id,
      archived,
      size: change?.size ?? "",
      status: change?.status ?? "",
      states: {},
      problem: error instanceof Error ? error.message : String(error),
    };
  }
};

/** The text of the counts of one change, such as `✓ 4  ● 1`, or `-` when it has none. */
const countsText = (states: ChangeRow["states"]): string =>
  PACKAGE_STATES.filter((s) => states[s])
    .map((s) => `${ICONS[s]} ${states[s]}`)
    .join("  ") || "-";

export const listCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const parsed = parseArgs(args);
  if (typeof parsed === "string" || parsed.words.length > 0) {
    run.io.error(
      typeof parsed === "string"
        ? parsed
        : "Usage: dotclaude-spec list [--json]",
    );
    return 2;
  }
  const archived = (await run.store.files.list(ARCHIVE_DIR))
    .filter((name) => !name.startsWith("."))
    .filter((name) =>
      fs
        .statSync(run.store.abs(path.posix.join(ARCHIVE_DIR, name)))
        .isDirectory(),
    )
    .sort();
  const rows = [
    ...(await Promise.all(
      (await run.store.changes()).map((id) => rowOf(run, id, false)),
    )),
    ...(await Promise.all(archived.map((id) => rowOf(run, id, true)))),
  ];
  if (parsed.json) {
    run.io.log(JSON.stringify(rows));
    return 0;
  }
  if (rows.length === 0) {
    run.io.log(`No change is in \`${SPEC_ROOT}\`.`);
    return 0;
  }
  for (const row of rows)
    run.io.log(
      `${row.archived ? "archived" : "open"}  ${row.id}  ${row.size}  ${row.status}  ${countsText(row.states)}`,
    );
  return 0;
};
