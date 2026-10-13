// A fixture store for the read commands: one change with a log, a `change.md`, and package files.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../../../../src/plugins/dotclaude/slices/spec/adapters/cli.ts";

export const TODAY = "2026-10-12";

/** A new temporary folder with the `files`, which map a relative path to a text. */
export const makeStore = async (
  files: Record<string, string> = {},
): Promise<string> => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spec-cli-"));
  for (const [rel, text] of Object.entries(files))
    await Bun.write(path.join(root, rel), text);
  return root;
};

export interface Outcome {
  code: number;
  out: string[];
  err: string[];
}

/** Runs `dotclaude-spec args` from the source of the CLI in `cwd`. */
export const run = async (cwd: string, ...args: string[]): Promise<Outcome> => {
  const out: string[] = [];
  const err: string[] = [];
  const code = await main(
    args,
    cwd,
    { log: (l) => out.push(l), error: (l) => err.push(l) },
    { now: () => new Date(`${TODAY}T10:00:00.000Z`) },
  );
  return { code, out, err };
};

/** One package of a fixture change. `state` is the last event, and `status` is the copy in the file. */
export interface Pkg {
  id: string;
  wave?: number;
  deps?: string[];
  owns?: string[];
  state?: string;
  status?: string;
  sections?: string[];
}

const SECTIONS = ["Goal", "Context", "Steps", "Acceptance", "Boundaries"];

/** The text of a package file with a valid front matter and the five sections. */
export const packageText = (p: Pkg): string => {
  const list = (items: string[] = []): string => JSON.stringify(items);
  const sections = (p.sections ?? SECTIONS)
    .map((s) => `## ${s}\n\n${s} of ${p.id}.\n`)
    .join("\n");
  return `---
schema: dotclaude-spec/2
kind: package
id: ${p.id}
title: Title of ${p.id}
wave: ${p.wave ?? 1}
deps: ${list(p.deps)}
owns: ${list(p.owns ?? [`src/${p.id}/`])}
satisfies: []
verify: just test
agent: implementer
status: ${p.status ?? p.state ?? "planned"}
---

${sections}`;
};

/** The text of `change.md` with a valid front matter. */
export const changeText = (
  id: string,
  status: string,
  size = "large",
): string =>
  `---
schema: dotclaude-spec/2
kind: change
id: ${id}
size: ${size}
status: ${status}
verify: just check
---

# ${id}

## Why

Because.
`;

const AT = "2026-10-12T10:00:00.000Z";

/** The text of an `events.jsonl`: the header, the event of the change, and one event for each package with a `state`. */
export const logText = (change: string, packages: Pkg[]): string =>
  [
    { schema: 2 },
    { at: AT, state: change },
    ...packages
      .filter((p) => p.state !== undefined)
      .map((p) => ({ at: AT, package: p.id, state: p.state })),
  ]
    .map((line) => JSON.stringify(line))
    .join("\n")
    .concat("\n");

export const CHANGES = ".dotclaude/spec/changes";

/** A store with the change `id`, in the state `change`, and the `packages`. Extra `files` map a path to a text. */
export const makeChange = (
  packages: Pkg[],
  options: {
    id?: string;
    change?: string;
    files?: Record<string, string>;
  } = {},
): Promise<string> => {
  const id = options.id ?? "c1";
  const change = options.change ?? "implementing";
  return makeStore({
    [`${CHANGES}/${id}/change.md`]: changeText(id, change),
    [`${CHANGES}/${id}/events.jsonl`]: logText(change, packages),
    ...Object.fromEntries(
      packages.map((p) => [
        `${CHANGES}/${id}/packages/${p.id}.md`,
        packageText(p),
      ]),
    ),
    ...options.files,
  });
};
