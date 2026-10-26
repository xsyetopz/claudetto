// The commands `minispec archive` and `sync`: both merge the delta specs of a change into `openspec/specs/`.

import fs from "node:fs";
import path from "node:path";
import { fileReader } from "../../../kernel/node/fs.ts";
import { countTasks } from "../../project/index.ts";
import { mergeSpec } from "../domain/merge.ts";
import { check } from "./check.ts";
import {
  type Ctx,
  deltas,
  fail,
  mainSpec,
  type Out,
  open,
  text,
  today,
} from "./ctx.ts";

const KINDS = ["added", "modified", "removed", "renamed"] as const;
const MARKS = { added: "+", modified: "~", removed: "-", renamed: "→" };

/**
 * The dry run of the merge of the change in `dir`: the files to write, the totals, and the lines to print.
 * It writes nothing, and a delta that changes nothing is in sync, so its spec stays as it is.
 */
const planMerges = async (root: string, dir: string, name: string) => {
  const writes: [string, string][] = [];
  const update = ["Specs to update:"];
  const applied: string[] = [];
  const totals = { added: 0, modified: 0, removed: 0, renamed: 0 };
  for (const f of deltas(dir)) {
    const id = path.dirname(f);
    const old = await fileReader.read(mainSpec(root, id));
    const m = mergeSpec(id, old, await text(path.join(dir, "specs", f)), name);
    if ("error" in m) fail(`${m.error}\nAborted. No files were changed.`);
    update.push(`  ${id}: ${old === null ? "create" : "update"}`);
    if (old !== null && KINDS.every((k) => !m.counts[k])) continue;
    writes.push([mainSpec(root, id), m.text]);
    applied.push(
      `Applying changes to openspec/specs/${id}/spec.md:`,
      ...KINDS.filter((k) => m.counts[k]).map(
        (k) => `  ${MARKS[k]} ${m.counts[k]} ${k}`,
      ),
    );
    for (const k of KINDS) totals[k] += m.counts[k];
  }
  const lines =
    update.length > 1
      ? [
          ...update,
          ...applied,
          `Totals: ${KINDS.map((k) => `${MARKS[k]} ${totals[k]}`).join(", ")}`,
          writes.length
            ? "Specs updated successfully."
            : "Specs already in sync; no files changed.",
        ]
      : [];
  for (const [file, merged] of writes) await Bun.write(file, merged);
  return { writes, totals, lines };
};

/** The checks before an archive: the validation and the open tasks. */
const gate = async (ctx: Ctx, dir: string, say: (line: string) => void) => {
  const { args, io } = ctx;
  const name = path.basename(dir);
  if (args.includes("--no-validate"))
    for (const l of [
      "⚠️  WARNING: Skipping validation may archive invalid specs.",
      `[${new Date().toISOString()}] Validation skipped for change: ${name}`,
      `Affected files: ${dir}`,
    ])
      say(l);
  else {
    const { issues, valid } = await check(ctx.root, dir, false);
    if (!valid) {
      for (const i of issues) io.log(`${i.level} ${i.path}: ${i.message}`);
      fail(
        `Change '${name}' is not valid. Fix each ERROR and run validate again.`,
      );
    }
  }
  const { done, total } = countTasks(await text(path.join(dir, "tasks.md")));
  say(
    `Task status: ${total === 0 ? "No tasks" : done === total ? "✓ Complete" : `${done}/${total} tasks`}`,
  );
  if (done === total) return;
  const warning = `Warning: ${total - done} incomplete task(s) found.`;
  if (!args.includes("--yes"))
    fail(
      `${warning} Ask the user, and run the archive again with --yes after their yes.`,
    );
  say(`${warning} Continuing due to --yes flag.`);
};

export const archive = async (ctx: Ctx): Promise<Out> => {
  const { args } = ctx;
  const say = (line: string) => args.includes("--json") || ctx.io.log(line);
  const dir = open(ctx, args[1]);
  const name = path.basename(dir);
  await gate(ctx, dir, say);
  const as = /^\d{4}-\d{2}-\d{2}-/.test(name) ? name : `${today()}-${name}`;
  const target = path.join(ctx.changes, "archive", as);
  if (fs.existsSync(target))
    fail(
      `Archive '${as}' already exists. Rename the change or the archive folder.`,
    );
  const skip = args.includes("--skip-specs");
  if (skip) say("Skipping spec updates (--skip-specs flag provided).");
  const plan = skip
    ? { writes: [], totals: undefined, lines: [] }
    : await planMerges(ctx.root, dir, name);
  for (const line of plan.lines) say(line);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(dir, target);
  const specsUpdated = plan.writes.length > 0;
  return [
    {
      archive: {
        change: name,
        archivedAs: as,
        path: target,
        specsUpdated,
        ...(specsUpdated && { totals: plan.totals }),
      },
    },
    [`Change '${name}' archived as '${as}'.`],
  ];
};

/** Merges the deltas of a change into `openspec/specs/`, and keeps the change folder. */
export const sync = async (ctx: Ctx): Promise<Out> => {
  const dir = open(ctx, ctx.args[1]);
  const name = path.basename(dir);
  const { lines } = await planMerges(ctx.root, dir, name);
  return [
    undefined,
    lines.length
      ? [
          ...lines,
          `Change '${name}' stays in place. Archive it when the work is done.`,
        ]
      : [`Change '${name}' has no delta specs to sync.`],
  ];
};
