// The commands `minispec list` and `show`.

import fs from "node:fs";
import path from "node:path";
import { countTasks } from "../../../kernel/change.ts";
import { fileReader } from "../../../kernel/node/fs.ts";
import { parseDelta, parseMain } from "../domain/markdown.ts";
import { diffLines, showChange, showSpec } from "../domain/show.ts";
import {
  type Ctx,
  deltas,
  fail,
  flag,
  mainSpec,
  names,
  type Out,
  scan,
  text,
} from "./ctx.ts";

/** How long ago `date` was: `just now`, `5m ago`, `3h ago`, `2d ago`, or the date after 30 days. */
const ago = (date: Date) => {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  const days = Math.floor(mins / 1440);
  return days > 30
    ? date.toLocaleDateString()
    : days > 0
      ? `${days}d ago`
      : mins >= 60
        ? `${Math.floor(mins / 60)}h ago`
        : mins > 0
          ? `${mins}m ago`
          : "just now";
};

const summary = async (dir: string, archived: boolean) => {
  const { done, total } = countTasks(await text(path.join(dir, "tasks.md")));
  const times = scan(dir, "**/*").map(
    (f) => Bun.file(path.join(dir, f)).lastModified,
  );
  return {
    name: path.basename(dir),
    completedTasks: done,
    totalTasks: total,
    lastModified: new Date(
      times.length ? Math.max(...times) : fs.statSync(dir).mtimeMs,
    ).toISOString(),
    status:
      total === 0 ? "no-tasks" : done === total ? "complete" : "in-progress",
    archived,
  };
};

const pad = (rows: string[]) => Math.max(...rows.map((r) => r.length));

const listSpecs = async (ctx: Ctx): Promise<Out> => {
  const dir = path.join(ctx.root, "openspec/specs");
  const specs = await Promise.all(
    scan(dir, "*/spec.md").map(async (f) => ({
      id: path.dirname(f),
      requirementCount: parseMain(await text(path.join(dir, f))).blocks.length,
    })),
  );
  const width = pad(specs.map((s) => s.id));
  return [
    { specs },
    specs.length
      ? [
          "Specs:",
          ...specs.map(
            (s) =>
              `  ${s.id.padEnd(width)}     requirements ${s.requirementCount}`,
          ),
        ]
      : ["No specs found."],
  ];
};

export const list = async (ctx: Ctx): Promise<Out> => {
  const { args } = ctx;
  const [archived, all] = [args.includes("--archived"), args.includes("--all")];
  if (args.includes("--specs")) {
    if (archived || all)
      fail("--archived and --all can only be used when listing changes.");
    return listSpecs(ctx);
  }
  const sorted = (
    await Promise.all([
      ...(!archived || all ? names(ctx) : []).map((n) =>
        summary(path.join(ctx.changes, n), false),
      ),
      ...(archived || all ? names(ctx, true) : []).map((n) =>
        summary(path.join(ctx.changes, "archive", n), true),
      ),
    ])
  ).sort(
    flag(args, "--sort") === "name"
      ? (a, b) => a.name.localeCompare(b.name)
      : (a, b) =>
          b.lastModified.localeCompare(a.lastModified) ||
          a.name.localeCompare(b.name),
  );
  const rows = (group: typeof sorted) => {
    const width = pad(group.map((c) => c.name));
    return group.map((c) => {
      const state =
        c.totalTasks === 0
          ? "No tasks"
          : c.status === "complete"
            ? "✓ Complete"
            : `${c.completedTasks}/${c.totalTasks} tasks`;
      return `  ${c.name.padEnd(width)}     ${state.padEnd(12)}  ${ago(new Date(c.lastModified))}`;
    });
  };
  const shown = [
    ["Changes:", sorted.filter((c) => !c.archived)],
    ["Archived Changes:", sorted.filter((c) => c.archived)],
  ] as const;
  const groups = shown.filter(([, g]) => g.length);
  const empty = all
    ? "No changes found."
    : archived
      ? "No archived changes found."
      : "No active changes found.";
  return [
    {
      changes: sorted.map(({ archived: a, ...rest }) =>
        archived || all ? { ...rest, archived: a } : rest,
      ),
    },
    groups.length
      ? groups.flatMap(([title, g], k) => [
          ...(k ? [""] : []),
          title,
          ...rows(g),
        ])
      : [empty],
  ];
};

export const show = async (ctx: Ctx): Promise<Out> => {
  const { args, root } = ctx;
  const given = args.slice(1).find((a) => !a.startsWith("-")) ?? "";
  if (!names(ctx).includes(given)) {
    const old =
      (await fileReader.read(mainSpec(root, given))) ??
      fail(
        `Unknown item '${given}'. Available changes: ${names(ctx).join(", ") || "none"}.`,
      );
    const n = Number(flag(args, "-r") ?? flag(args, "--requirement"));
    return [
      showSpec(given, old, n || undefined, args.includes("--requirements")),
      old.split("\n"),
    ];
  }
  const dir = path.join(ctx.changes, given);
  const specs = await Promise.all(
    deltas(dir).map(async (f) => ({
      id: path.dirname(f),
      text: await text(path.join(dir, "specs", f)),
    })),
  );
  const proposal = (await text(path.join(dir, "proposal.md"))).split("\n");
  if (!args.includes("--diff")) return [showChange(given, specs), proposal];
  const parts = await Promise.all(
    specs.map(async (s) =>
      diffLines(
        s.id,
        parseDelta(s.text),
        parseMain((await fileReader.read(mainSpec(root, s.id))) ?? "").blocks,
      ),
    ),
  );
  return [
    showChange(given, specs),
    [...proposal, "", "Specifications Changed (diffs)", ...parts.flat()],
  ];
};
