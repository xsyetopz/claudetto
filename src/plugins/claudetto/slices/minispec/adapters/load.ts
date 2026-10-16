// Reads the changes and the specs of a project through the `Store` port.
// A change is a folder of `minispec/changes/` that holds a `proposal.md` or a `tasks.md`. The folder `archive` is no change.
import path from "node:path";

import { CHANGE_HANDOFF_FILE } from "../../../../../kernel/paths.ts";
import { type Tier, tierOf } from "../domain/tiers.ts";
import type { Context } from "../domain/types.ts";
import {
  ARCHIVE_DIR,
  DESIGN_FILE,
  MINISPEC_DIR,
  PROPOSAL_FILE,
  SPEC_FILE,
  SPECS_DIR,
  TASKS_FILE,
} from "../limits.ts";

/** The path of `rel`, a path from the project root, in the store. */
export const at = (ctx: Context, rel: string): string =>
  path.posix.join(ctx.root, rel);

/** The folder of the changes, from the project root. */
export const CHANGES = path.posix.join(MINISPEC_DIR, "changes");

export interface Loaded {
  readonly name: string;
  /** The folder of the change, from the project root. */
  readonly dir: string;
  readonly proposal: string | null;
  readonly tasks: string | null;
  readonly design: string | null;
  /** The delta specs: the capability and the text of its `spec.md`. */
  readonly specs: readonly {
    readonly capability: string;
    readonly text: string;
  }[];
  readonly hasHandoff: boolean;
  readonly tier: Tier;
}

/** The names of the changes, sorted. */
export const changeNames = async (ctx: Context): Promise<string[]> => {
  const names: string[] = [];
  for (const name of await ctx.store.list(at(ctx, CHANGES)))
    if (name !== ARCHIVE_DIR && (await loadChange(ctx, name)) !== null)
      names.push(name);
  return names.sort();
};

/** The change `name`, or `null` when the folder has no `proposal.md` and no `tasks.md`. */
export const loadChange = async (
  ctx: Context,
  name: string,
): Promise<Loaded | null> => {
  const dir = `${CHANGES}/${name}`;
  const read = (file: string) =>
    ctx.store.read(at(ctx, path.posix.join(dir, file)));
  const [proposal, tasks, design] = await Promise.all([
    read(PROPOSAL_FILE),
    read(TASKS_FILE),
    read(DESIGN_FILE),
  ]);
  if (proposal === null && tasks === null) return null;
  const specs: { capability: string; text: string }[] = [];
  for (const capability of (
    await ctx.store.list(at(ctx, path.posix.join(dir, "specs")))
  ).sort()) {
    const text = await read(`specs/${capability}/${SPEC_FILE}`);
    if (text !== null) specs.push({ capability, text });
  }
  return {
    name,
    dir,
    proposal,
    tasks,
    design,
    specs,
    hasHandoff: (await read(CHANGE_HANDOFF_FILE)) !== null,
    tier: tierOf({ design: design !== null, specs: specs.length > 0 }),
  };
};

/** The capabilities that have a spec in `minispec/specs/`, sorted. */
export const specNames = async (ctx: Context): Promise<string[]> => {
  const names: string[] = [];
  for (const name of await ctx.store.list(at(ctx, SPECS_DIR)))
    if ((await readSpec(ctx, name)) !== null) names.push(name);
  return names.sort();
};

/** The text of the spec of `capability`, or `null`. */
export const readSpec = (ctx: Context, capability: string) =>
  ctx.store.read(at(ctx, path.posix.join(SPECS_DIR, capability, SPEC_FILE)));
