// The store of the specs: the format of `events.jsonl` and the reader of it.
// The `spec` slice, the status line, and the handoff read the store through this file.
// Only the `spec` slice writes it. The reader takes a `FileReader`, so a test needs no file on disk.

import path from "node:path";
import { SPEC_ROOT } from "./paths.ts";
import type { FileReader } from "./ports.ts";

/** The name of the log file in the folder of a change. */
export const EVENTS_FILE = "events.jsonl";

/** The `schema` number of `events.jsonl` that this version reads. Another number stops the reader. */
export const SPEC_SCHEMA = 1;

/** The lanes of a package, from the first to the last. */
export const LANES = ["planned", "doing", "review", "done", "blocked"] as const;

/** One lane of a package, from `LANES`. */
export type Lane = (typeof LANES)[number];

/** One entry of the event log: a package that moved to a lane at a time. */
export type LaneEvent = {
  readonly at: string;
  readonly package: string;
  readonly lane: Lane;
};

/** The first line of `events.jsonl`. */
export type EventsHeader = { readonly schema: typeof SPEC_SCHEMA };

/** The done and total counts of the active change, for a segment such as `◆ 1.0.0 4/13`. */
export type Progress = {
  readonly id: string;
  readonly done: number;
  readonly total: number;
};

/** The path of `events.jsonl` of the change `id`. */
export const eventsPath = (id: string): string =>
  path.posix.join(SPEC_ROOT, id, EVENTS_FILE);

/** The header line of a new `events.jsonl`, with its line end. */
export const eventsHeader = (): string =>
  `${JSON.stringify({ schema: SPEC_SCHEMA } satisfies EventsHeader)}\n`;

/** One line of `events.jsonl` for `event`, with its line end. */
export const eventLine = (event: LaneEvent): string =>
  `${JSON.stringify(event)}\n`;

/**
 * The lane events of the change `id`, in the order of the log, or null when the change has no `events.jsonl`.
 * The reader throws an `Error` that names the file when the header has a `schema` other than `SPEC_SCHEMA`.
 */
export const readEvents = async (
  files: FileReader,
  id: string,
): Promise<readonly LaneEvent[] | null> => {
  const file = eventsPath(id);
  const text = await files.read(file);
  if (text === null) return null;
  const [head = "", ...rest] = text.split("\n").filter((line) => line.trim());
  const header = JSON.parse(head || "{}") as Partial<EventsHeader>;
  if (header.schema !== SPEC_SCHEMA)
    throw new Error(
      `${file} has schema ${String(header.schema)}, which this version does not read.`,
    );
  return rest.map((line) => JSON.parse(line) as LaneEvent);
};

/** The lane of each package in `events`: the last line of the package, in the order of the first line. */
export const lastLanes = (
  events: readonly LaneEvent[],
): Record<string, Lane> => {
  const lanes: Record<string, Lane> = {};
  for (const event of events) lanes[event.package] = event.lane;
  return lanes;
};

/** The id in the front matter of a package file, or null when the file has none. */
const packageId = (text: string): string | null => {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? "";
  const id = /^id:\s*["']?([^\s"']+)["']?\s*$/m.exec(front)?.[1];
  return id ?? null;
};

/**
 * The lanes of the packages of the change `id`.
 * The package files in `packages/` give the set of packages, and a package with a file and no line in the log is `planned`.
 * A lane of a package with no file stays.
 * The packages of `events` come first, in the order of their first line, and then the packages that have only a file.
 */
export const packageLanes = async (
  files: FileReader,
  id: string,
  events: readonly LaneEvent[],
): Promise<Record<string, Lane>> => {
  const lanes = lastLanes(events);
  const dir = path.posix.join(SPEC_ROOT, id, "packages");
  for (const name of (await files.list(dir))
    .filter((n) => n.endsWith(".md"))
    .sort()) {
    const text = await files.read(path.posix.join(dir, name));
    const pkg = text === null ? null : packageId(text);
    if (pkg !== null && !(pkg in lanes)) lanes[pkg] = "planned";
  }
  return lanes;
};

/**
 * The active change and its counts: the last change, in the order of its id, that has a package which is not `done`.
 * It gives null when every change is done, or when no change has an `events.jsonl`.
 */
export const activeProgress = async (
  files: FileReader,
): Promise<Progress | null> => {
  let active: Progress | null = null;
  for (const id of (await files.list(SPEC_ROOT)).sort()) {
    const events = await readEvents(files, id);
    if (!events) continue;
    const lanes = Object.values(await packageLanes(files, id, events));
    const done = lanes.filter((lane) => lane === "done").length;
    if (done < lanes.length) active = { id, done, total: lanes.length };
  }
  return active;
};
