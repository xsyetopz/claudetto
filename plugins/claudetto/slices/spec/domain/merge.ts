// The merge of a delta spec into a main spec, as `minispec archive` does it.
// The result follows OpenSpec 1.14.3: the blocks keep their order, and the file ends with one newline.

import {
  type Block,
  type Delta,
  type MainSpec,
  parseDelta,
  parseMain,
} from "./markdown.ts";

/** The merged spec text with the counts of each kind of change, or the reason that the merge fails. */
export type Merged =
  | {
      readonly ok: true;
      readonly text: string;
      readonly counts: Record<
        "added" | "modified" | "removed" | "renamed",
        number
      >;
    }
  | { readonly ok: false; readonly error: string };

const same = (a: string, b: string): boolean => a.trim() === b.trim();

const failure = (kind: string, name: string, why: string): string =>
  `${kind} failed for header "### Requirement: ${name}" - ${why}`;

const find = (blocks: Block[], name: string): number =>
  blocks.findIndex((b) => b.name === name);

/** Each `apply*` helper changes `blocks` in place, and gives the count or the text of the failure. */
const applyRenamed = (
  blocks: Block[],
  renames: Delta["renamed"],
): number | string => {
  for (const { from, to } of renames) {
    const i = find(blocks, from);
    if (i < 0) return failure("RENAMED", from, "source not found");
    if (find(blocks, to) >= 0)
      return failure("RENAMED", to, "target already exists");
    const raw = (blocks[i] as Block).raw.replace(
      /^[^\n]*/,
      `### Requirement: ${to}`,
    );
    blocks[i] = { name: to, raw };
  }
  return renames.length;
};

const applyRemoved = (blocks: Block[], names: Delta["removed"]): number => {
  const gone = new Set(names.filter((n) => find(blocks, n) >= 0));
  blocks.splice(0, blocks.length, ...blocks.filter((b) => !gone.has(b.name)));
  return gone.size;
};

const applyModified = (
  blocks: Block[],
  mods: Delta["modified"],
): number | string => {
  let modified = 0;
  for (const mod of mods) {
    const i = find(blocks, mod.name);
    if (i < 0) return failure("MODIFIED", mod.name, "not found");
    if (!same((blocks[i] as Block).raw, mod.raw)) modified++;
    blocks[i] = mod;
  }
  return modified;
};

const applyAdded = (blocks: Block[], adds: Delta["added"]): number | string => {
  let added = 0;
  for (const add of adds) {
    const i = find(blocks, add.name);
    if (i >= 0 && same((blocks[i] as Block).raw, add.raw)) continue;
    if (i >= 0) return failure("ADDED", add.name, "already exists");
    blocks.push(add);
    added++;
  }
  return added;
};

/** The text of the spec: the parts around the blocks, then the blocks, with one newline at the end. */
const render = (parts: MainSpec, blocks: Block[]) => {
  const body = [parts.preamble, ...blocks.map((b) => b.raw)]
    .filter((s) => s.trim())
    .join("\n\n");
  return `${[parts.before.trimEnd(), parts.header, body, parts.after.trim()]
    .filter((s) => s !== "")
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()}\n`;
};

/**
 * Merges `delta` into `main`, the text of `openspec/specs/<id>/spec.md` or `null` for a new capability.
 * `change` is the name of the change, for the purpose of a new spec.
 */
export const mergeSpec = (
  id: string,
  main: string | null,
  delta: string,
  change: string,
): Merged => {
  const d = parseDelta(delta);
  if (main === null && (d.modified.length || d.renamed.length))
    return {
      ok: false,
      error: `${id}: the target spec does not exist. Use only ADDED requirements for a new capability, because MODIFIED and RENAMED need an existing spec.`,
    };
  const parts = parseMain(
    main ??
      `# ${id} Specification\n\n## Purpose\n${d.purpose || `TBD - created by archiving change ${change}. Update Purpose after archive.`}\n\n## Requirements\n`,
  );
  const blocks: Block[] = [...parts.blocks];
  const counts = {
    renamed: applyRenamed(blocks, d.renamed),
    removed: applyRemoved(blocks, d.removed),
    modified: applyModified(blocks, d.modified),
    added: applyAdded(blocks, d.added),
  };
  const error = Object.values(counts).find((n) => typeof n === "string");
  if (error) return { ok: false, error: `${id} ${error}` };
  return {
    ok: true,
    text: render(parts, blocks),
    counts: counts as Record<keyof typeof counts, number>,
  };
};
