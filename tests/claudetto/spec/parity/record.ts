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
  return root;
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
 */
const facts = (out: string): unknown => {
  try {
    return JSON.parse(out, (key, value) => {
      if (key === "durationMs") return undefined;
      if (key === "message") {
        const [head, list] = (value as string).split(/(?<=changes:)\n/);
        return list === undefined
          ? value
          : `${head}\n${list.split("\n").toSorted().join("\n")}`;
      }
      if (key !== "changes") return value;
      return (value as { name: string }[]).toSorted((a, b) =>
        a.name.localeCompare(b.name),
      );
    });
  } catch {
    return out
      .split("\n")
      .map((l) => l.trim())
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

/** The facts that the two tools share, for the command `command`. The other keys of the output stay out. */
export const project = (
  tool: "openspec" | "minispec",
  command: string,
  rec: Run,
  text: boolean,
): Run => {
  const f = rec.facts;
  const pick = (o: { [k: string]: unknown }, keys: string[]) =>
    Object.fromEntries(keys.map((k) => [k, o[k]]));
  const shared = (): unknown => {
    switch (command) {
      case "new":
        return f.filter((l: string) => /^(Created change|Schema:)/.test(l));
      case "list":
        return f.changes.map((c: { [k: string]: unknown }) =>
          pick(c, ["name", "completedTasks", "totalTasks", "status"]),
        );
      case "status":
        return {
          ...pick(f, ["changeName", "schemaName", "isComplete"]),
          applyRequires:
            tool === "minispec" ? f.apply.requires : f.applyRequires,
          artifacts: f.artifacts.map((a: { [k: string]: unknown }) =>
            pick(a, ["id", "status", "requires", "outputPath", "missingDeps"]),
          ),
        };
      case "validate":
        return {
          items: f.items.map((i: { [k: string]: unknown }) =>
            pick(i, ["id", "valid", "issues"]),
          ),
          totals: f.summary.totals,
        };
      default:
        return f.filter((l: string) => !/^(Proposal warnings|⚠)/.test(l));
    }
  };
  return { ...rec, facts: text ? shared() : null };
};
