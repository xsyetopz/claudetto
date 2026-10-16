// `minispec archive <name>`: merges the spec deltas of a done change into `minispec/specs/`, and moves the change under `minispec/changes/archive/` (spec `minispec`, "Archive").
// The command asks no question, because a reader of any language must be able to answer it. The flag `--yes` is the confirmation. Without it, the command fails and names the flag.

import path from "node:path";
import { countTasks } from "../../../../../kernel/change.ts";
import { mergeDelta, parseDelta, parseRequirements } from "../domain/spec.ts";
import { parseTasks } from "../domain/tasks.ts";
import {
  type Context,
  EXIT,
  type Options,
  type Reply,
} from "../domain/types.ts";
import { ARCHIVE_DIR, SPECS_DIR } from "../limits.ts";
import {
  ARCHIVE_CONFIRM,
  ARCHIVE_EXISTS,
  ARCHIVE_INVALID,
  ARCHIVE_MERGED,
  ARCHIVE_MOVED,
  ARCHIVE_NEEDS_NAME,
  ARCHIVE_NEXT,
  ARCHIVE_OPEN_MANY,
  ARCHIVE_OPEN_ONE,
  ARCHIVE_UNKNOWN,
} from "../prompts.ts";
import { fail } from "./commands.ts";
import { at, CHANGES, loadChange, readSpec } from "./load.ts";
import { changeIssues } from "./validate.ts";

export const archiveCommand = async (
  ctx: Context,
  words: readonly string[],
  opts: Options,
): Promise<Reply> => {
  const name = words[0];
  if (name === undefined) return fail(ARCHIVE_NEEDS_NAME, EXIT.usage);
  const change = await loadChange(ctx, name);
  if (change === null) return fail(ARCHIVE_UNKNOWN({ name }));
  const issues = await changeIssues(ctx, change);
  if (issues.length > 0)
    return fail(
      [
        ...issues.map((i) => `${i.file}: ${i.message}`),
        ARCHIVE_INVALID({ name }),
      ].join("\n"),
    );
  const open = parseTasks(change.tasks ?? "")
    .filter((t) => !t.done)
    .map((t) => t.id);
  if (open.length > 0 || countTasks(change.tasks ?? "").total === 0)
    return fail(
      open.length === 1
        ? ARCHIVE_OPEN_ONE({ ids: open.join(", ") })
        : ARCHIVE_OPEN_MANY({
            count: String(open.length),
            ids: open.join(", "),
          }),
    );
  if (!opts.yes) return fail(ARCHIVE_CONFIRM({ name }), EXIT.usage);
  const target = path.posix.join(CHANGES, ARCHIVE_DIR, `${ctx.today}-${name}`);
  if (await ctx.store.exists(at(ctx, target)))
    return fail(ARCHIVE_EXISTS({ target }));
  const merges: { capability: string; text: string; requirements: number }[] =
    [];
  for (const { capability, text } of change.specs) {
    const merged = mergeDelta(
      capability,
      await readSpec(ctx, capability),
      parseDelta(text),
    );
    if (!merged.ok) return fail(merged.errors.join("\n"));
    merges.push({
      capability,
      text: merged.text,
      requirements: parseRequirements(merged.text).length,
    });
  }
  for (const m of merges)
    await ctx.store.write(
      at(ctx, path.posix.join(SPECS_DIR, m.capability, "spec.md")),
      m.text,
    );
  await ctx.store.move(at(ctx, change.dir), at(ctx, target));
  if (opts.json)
    return {
      code: EXIT.ok,
      out: JSON.stringify(
        {
          name,
          archived: target,
          specs: merges.map((m) => ({
            capability: m.capability,
            requirements: m.requirements,
          })),
        },
        null,
        2,
      ),
      err: "",
    };
  return {
    code: EXIT.ok,
    out: [
      ...merges.map((m) =>
        ARCHIVE_MERGED({
          capability: m.capability,
          requirements: String(m.requirements),
        }),
      ),
      ARCHIVE_MOVED({ from: change.dir, to: target }),
      ARCHIVE_NEXT,
    ].join("\n"),
    err: "",
  };
};
