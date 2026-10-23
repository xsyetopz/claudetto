// The helpers of the parity test: run a command of `openspec` or `minispec` on a fresh project, and keep the facts that both tools share.
// See `main.test.ts` for the method.

import fs from "node:fs";
import path from "node:path";
import {
  type openspec,
  sampleProject,
  tmpEmpty,
} from "../../../support/openspec.ts";

const PARITY = import.meta.dirname;

/** The project of a case: the samples, `bad-scenario`, and each overlay of `parity/overlays/`, or an empty folder. */
const projectFor = async (
  empty: boolean,
  overlays: string[],
): Promise<string> => {
  if (empty) return tmpEmpty("parity-empty");
  const root = await sampleProject(["story", "task", "epic"]);
  fs.cpSync(
    path.join(PARITY, "bad-scenario"),
    path.join(root, "openspec/changes/bad-scenario"),
    { recursive: true },
  );
  for (const overlay of overlays)
    fs.cpSync(path.join(PARITY, "overlays", overlay), root, {
      recursive: true,
    });
  dateChanges(root);
  return root;
};

/**
 * Gives each change a time of its own, one minute apart, in name order.
 * The copies keep the times of the files in the repository, and `list` of OpenSpec prints and sorts by those times ("just now" or "16h ago", by the day of the checkout).
 */
const dateChanges = (root: string): void => {
  const changes = path.join(root, "openspec/changes");
  if (!fs.existsSync(changes)) return;
  const dirs = ["", "archive"].flatMap((parent) =>
    fs.existsSync(path.join(changes, parent))
      ? fs
          .readdirSync(path.join(changes, parent), { withFileTypes: true })
          .filter((e) => e.isDirectory() && e.name !== "archive")
          .map((e) => path.join(parent, e.name))
      : [],
  );
  dirs.sort();
  const now = Date.now();
  for (const [i, dir] of dirs.entries()) {
    const when = new Date(now - (i + 1) * 60_000);
    const top = path.join(changes, dir);
    fs.utimesSync(top, when, when);
    for (const f of fs.readdirSync(top, { recursive: true }) as string[])
      fs.utimesSync(path.join(top, f), when, when);
  }
};

/** The text of each file under `root`, by its path from `root`. */
const files = async (root: string): Promise<{ [file: string]: string }> =>
  Object.fromEntries(
    await Promise.all(
      (fs.readdirSync(root, { recursive: true }) as string[])
        .filter((f) => fs.statSync(path.join(root, f)).isFile())
        .sort()
        .map(async (f) => [f, await Bun.file(path.join(root, f)).text()]),
    ),
  );

/** `text` with the project folder as `<root>` and each date as `<date>`. */
const stable = (text: string, root: string): string =>
  text
    .replaceAll(fs.realpathSync(root), "<root>")
    .replaceAll(root, "<root>")
    .replace(/\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?/g, "<date>");

/**
 * The printed facts: the JSON with no run time, or the lines of text.
 * The changes of `list` are in name order, because OpenSpec sorts them by the time of the copies of the test.
 * The changes that a `message` lists are in name order, because OpenSpec gives them in the order of the file system.
 * The `schemas` of `schema validate` are in name order, because OpenSpec gives them in the order of the file system (`readdirSync` in `dist/commands/schema.js`).
 * The age in a line of `list` is `<ago>`, because it is the time since the run.
 */
const facts = (printed: string): unknown => {
  // OpenSpec ends each `schema` command with a note on stderr.
  const out = printed.replace(
    /^Note: Schema commands are experimental.*\n?/gm,
    "",
  );
  try {
    return JSON.parse(out, (key, value) => {
      if (key === "durationMs") return undefined;
      if (key === "message") {
        const [head, list] = (value as string).split(/(?<=changes:)\n/);
        return list === undefined
          ? value
          : `${head}\n${list.split("\n").toSorted().join("\n")}`;
      }
      if (key === "schemas" && Array.isArray(value))
        return value.toSorted((a, b) => a.name.localeCompare(b.name));
      if (key !== "changes") return value;
      return (value as { name: string }[]).toSorted((a, b) =>
        a.name.localeCompare(b.name),
      );
    });
  } catch {
    return out
      .split("\n")
      .map((l) => l.trim().replace(/\s+(just now|\d+[mhd] ago)$/, " <ago>"))
      .filter(Boolean);
  }
};

/** What a command did on a fresh project. */
export type Run = {
  code: number;
  // biome-ignore lint/suspicious/noExplicitAny: the JSON of two tools has no shared type
  facts: any;
  written: { [file: string]: string };
  removed: string[];
};

/** Runs `args` with `tool` on a fresh project, and gives its record. */
export const record = async (
  tool: typeof openspec,
  args: string[],
  empty = false,
  overlays: string[] = [],
): Promise<Run> => {
  const root = await projectFor(empty, overlays);
  const before = await files(root);
  const { code, out } = await tool(root, args);
  const after = await files(root);
  const written = Object.fromEntries(
    Object.entries(after).filter(([f, text]) => before[f] !== text),
  );
  const removed = Object.keys(before).filter((f) => !(f in after));
  return JSON.parse(
    stable(JSON.stringify({ code, facts: facts(out), written, removed }), root),
  );
};

type Obj = { [k: string]: unknown };

const pick = (o: Obj, keys: string[]): Obj =>
  Object.fromEntries(keys.map((k) => [k, o[k]]));

/** The lines of text, with the lines that only OpenSpec prints left out. */
const lines = (f: string[]): string[] =>
  f.filter(
    (l) =>
      !/^(Proposal warnings|⚠|Next:|- (Creating|Generating|Validating))/.test(
        l,
      ),
  );

/** The shared facts of the JSON of each command, by the first argument. The text of a command is `lines`. */
// biome-ignore lint/suspicious/noExplicitAny: the JSON of two tools has no shared type
type Shared = (f: any, tool: string) => unknown;

const SHARED: { [command: string]: Shared } = {
  new: (f) => pick(f.change, ["id", "path", "metadataPath", "schema"]),
  list: (f) =>
    f.specs ??
    f.changes.map((c: Obj) =>
      pick(c, ["name", "completedTasks", "totalTasks", "status", "archived"]),
    ),
  status: (f, tool) => ({
    ...pick(f, ["changeName", "schemaName", "isComplete"]),
    applyRequires: tool === "minispec" ? f.apply.requires : f.applyRequires,
    artifacts: f.artifacts.map((a: Obj) =>
      pick(a, ["id", "status", "requires", "outputPath", "missingDeps"]),
    ),
  }),
  validate: (f) => ({
    items: f.items.map((i: Obj) => pick(i, ["id", "valid", "issues"])),
    totals: f.summary.totals,
  }),
  show: (f) =>
    pick(f, [
      "id",
      "deltaCount",
      "deltas",
      "overview",
      "requirementCount",
      "requirements",
    ]),
  // OpenSpec words the instruction of a blocked apply with the remedy, and lists the artifacts that follow.
  instructions: (f) => ({
    ...f,
    ...(f.contextFiles && {
      instruction: undefined,
      missingPrerequisites: undefined,
    }),
    planningHome: undefined,
    root: undefined,
  }),
  schemas: (f) =>
    f
      .filter((s: { source: string }) => s.source === "project")
      .map((s: Obj) => pick(s, ["name", "description", "artifacts"])),
  schema: (f) =>
    (f.schemas ?? [f])
      .map((r: Obj & { name: string }) =>
        pick(r, ["name", "path", "valid", "issues"]),
      )
      .sort((a: { name: string }, b: { name: string }) =>
        a.name.localeCompare(b.name),
      ),
  archive: (f) =>
    pick(f.archive, ["change", "archivedAs", "path", "specsUpdated", "totals"]),
};

/** `show --diff` text: the headers of the deltas, because OpenSpec prints a unified diff of a modified requirement. */
const diffHeaders = (f: string[]): string[] =>
  f.filter((l) =>
    /^(ADDED|REMOVED|RENAMED|MODIFIED):|^Specifications Changed/.test(l),
  );

/** The facts that the two tools share, for the command `command`. The other keys of the output stay out. */
export const project = (
  tool: "openspec" | "minispec",
  command: string,
  rec: Run,
  text: boolean,
): Run => {
  const f = rec.facts;
  const shared = (): unknown => {
    if (!(Array.isArray(f) && typeof f[0] === "string"))
      return (SHARED[command] ?? ((x) => x))(f, tool);
    if (command === "list")
      return lines(f)
        .map((l) => l.replace(/\s+(just now|\d+[mhd] ago|<ago>|[\d/.-]+)$/, ""))
        .toSorted();
    return command === "show" && f.includes("Specifications Changed (diffs)")
      ? diffHeaders(f.map((l: string) => l.trim()))
      : lines(f);
  };
  return { ...rec, facts: text ? shared() : null };
};
