// An in-memory `Store` for the tests of `minispec`, and a context that uses it.

import type {
  Context,
  Store,
} from "../../../plugins/claudetto/slices/minispec/domain/types.ts";

export const ROOT = "/p";

/** A store over `files`, a map from absolute path to text. A test reads `files` after a command to see the writes. */
export const memStore = (files: Map<string, string>): Store => ({
  read: async (file) => files.get(file) ?? null,
  list: async (dir) => [
    ...new Set(
      [...files.keys()]
        .filter((k) => k.startsWith(`${dir}/`))
        .map((k) => k.slice(dir.length + 1).split("/")[0] as string),
    ),
  ],
  write: async (file, text) => void files.set(file, text),
  exists: async (file) =>
    files.has(file) || [...files.keys()].some((k) => k.startsWith(`${file}/`)),
  move: async (from, to) => {
    for (const [k, v] of [...files])
      if (k.startsWith(`${from}/`)) {
        files.delete(k);
        files.set(`${to}${k.slice(from.length)}`, v);
      }
  },
});

/** A context over `files` with paths from `ROOT`. */
export const context = (
  files: Map<string, string>,
  over: Partial<Context> = {},
): Context => ({
  store: memStore(files),
  root: ROOT,
  today: "2026-10-16",
  ...over,
});

/** A map of files with the paths given from the project root. */
export const project = (rel: Record<string, string>): Map<string, string> =>
  new Map(Object.entries(rel).map(([k, v]) => [`${ROOT}/${k}`, v]));

export const PROPOSAL = "# Proposal: x\n\n## Why\n\nBecause.\n";
export const TASKS_OPEN =
  "# Tasks\n\n- [x] 1.1 One\n  Check: `just test a`\n- [ ] 1.2 Two\n  Check: `just test b`\n";
export const TASKS_DONE =
  "# Tasks\n\n- [x] 1.1 One\n  Check: `just test a`\n- [x] 1.2 Two\n  Check: `just test b`\n";
export const DELTA = [
  "# Spec Delta: `export`",
  "",
  "## Purpose",
  "",
  "Export data.",
  "",
  "## ADDED Requirements",
  "",
  "### Requirement: Export a file",
  "",
  "The CLI SHALL write a file.",
  "",
  "#### Scenario: A file",
  "",
  "- **WHEN** the user exports",
  "- **THEN** a file exists",
  "",
].join("\n");
