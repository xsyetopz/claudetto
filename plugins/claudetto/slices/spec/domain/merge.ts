// The merge of a delta spec into a main spec, as OpenSpec 1.14.3 does it: the blocks keep their order, and the file ends with one newline.

import { type Block, parseDelta, parseMain, scenarioLoss } from "./markdown.ts";

type Counts = Record<"added" | "modified" | "removed" | "renamed", number>;
type Merged = { error: string } | { text: string; counts: Counts };

const same = (a: string, b: string) => a.trim() === b.trim();
const quoted = (names: string[]) => names.map((n) => `"${n}"`).join(", ");

/** Merges `delta` into `main`, the text of `openspec/specs/<id>/spec.md` or `null` for a new capability. */
export const mergeSpec = (
  id: string,
  main: string | null,
  delta: string,
  change: string,
): Merged => {
  const d = parseDelta(delta);
  if (main === null && (d.modified.length || d.renamed.length))
    return {
      error: `${id}: the target spec does not exist. Use only ADDED requirements for a new capability, because MODIFIED and RENAMED need an existing spec.`,
    };
  const parts = parseMain(
    main ??
      `# ${id} Specification\n\n## Purpose\n${d.purpose || `TBD - created by archiving change ${change}. Update Purpose after archive.`}\n\n## Requirements\n`,
  );
  let blocks = [...parts.blocks];
  const at = (n: string) => blocks.findIndex((b) => b.name === n);
  const no = (kind: string, name: string, why: string) =>
    `${kind} failed for header "### Requirement: ${name}" - ${why}`;
  // Each op changes `blocks`, and gives its count or the text of its failure.
  const ops: Record<keyof Counts, () => number | string> = {
    renamed: () => {
      for (const { from, to } of d.renamed) {
        const i = at(from);
        if (i < 0) return no("RENAMED", from, "source not found");
        if (at(to) >= 0) return no("RENAMED", to, "target already exists");
        blocks[i] = {
          name: to,
          raw: (blocks[i]?.raw ?? "").replace(
            /^[^\n]*/,
            `### Requirement: ${to}`,
          ),
        };
      }
      return d.renamed.length;
    },
    removed: () => {
      const gone = new Set(d.removed.filter((n) => at(n) >= 0));
      blocks = blocks.filter((b) => !gone.has(b.name));
      return gone.size;
    },
    modified: () => {
      let n = 0;
      for (const mod of d.modified) {
        const old = blocks[at(mod.name)];
        if (!old) return no("MODIFIED", mod.name, "not found");
        const { missing, balance } = scenarioLoss(old.raw, mod.raw);
        if (missing.length)
          return no(
            "MODIFIED",
            mod.name,
            `current spec contains scenario(s) not present in the modified block: ${quoted(missing)}. ${balance} Refresh the change spec before archiving to avoid dropping scenarios.`,
          );
        n += same(old.raw, mod.raw) ? 0 : 1;
        blocks[at(mod.name)] = mod;
      }
      return n;
    },
    added: () => {
      let n = 0;
      for (const add of d.added) {
        const old = blocks[at(add.name)];
        if (old && same(old.raw, add.raw)) continue;
        if (old) return no("ADDED", add.name, "already exists");
        blocks.push(add);
        n++;
      }
      return n;
    },
  };
  const counts = {} as Counts;
  for (const [kind, op] of Object.entries(ops) as [
    keyof Counts,
    () => number | string,
  ][]) {
    const r = op();
    if (typeof r === "string") return { error: `${id} ${r}` };
    counts[kind] = r;
  }
  const body = [parts.preamble, ...blocks.map((b: Block) => b.raw)]
    .filter((s) => s.trim())
    .join("\n\n");
  const text = [parts.before.trimEnd(), parts.header, body, parts.after.trim()]
    .filter((s) => s !== "")
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
  return { text: `${text}\n`, counts };
};
