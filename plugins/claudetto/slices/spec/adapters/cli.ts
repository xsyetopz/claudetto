// The CLI `minispec` of the `spec` slice (`USAGE` lists the commands). The launcher `bin/minispec` calls `main`.
// A change lives in `openspec/changes/<name>/`, in the layout of OpenSpec 1.14.3.
// A schema in `openspec/schemas/<name>/` wins over the preset of the slice in `presets/<name>/`.
// A template that the schema folder lacks comes from `presets/templates/`.

import fs from "node:fs";
import path from "node:path";
import { countTasks } from "../../../kernel/change.ts";
import { CHANGES_DIR } from "../../../kernel/paths.ts";
import { type Artifact, statuses } from "../domain/graph.ts";
import { mergeSpec } from "../domain/merge.ts";
import { validateChange } from "../domain/validate.ts";

const USAGE = `Usage:
  minispec new change <name> [--schema <preset>]
  minispec list [--json]
  minispec status --change <name> [--json]
  minispec validate <name> [--strict] [--json]
  minispec archive <name> [--yes]`;

const NO_SCHEMA = (name: string): string =>
  `Schema '${name}' not found. Use a preset (task, story, or epic) or a folder in openspec/schemas/.`;

const PRESETS = path.resolve(import.meta.dirname, "..", "presets");
const META = ".openspec.yaml";
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The keys of the YAML files that `minispec` reads: `.openspec.yaml`, `config.yaml`, and `schema.yaml`. */
interface Yaml {
  schema?: string;
  skip_specs?: boolean;
  context?: string;
  rules?: unknown;
  artifacts?: Artifact[];
  apply?: unknown;
}

const text = async (file: string): Promise<string> =>
  (await Bun.file(file).exists()) ? Bun.file(file).text() : "";

const yaml = async (file: string): Promise<Yaml> =>
  (Bun.YAML.parse(await text(file)) as Yaml | null) ?? {};

const scan = (dir: string, pattern: string): string[] =>
  fs.existsSync(dir)
    ? [...new Bun.Glob(pattern).scanSync({ cwd: dir, dot: true })].sort()
    : [];

const deltas = (dir: string): string[] =>
  scan(path.join(dir, "specs"), "*/spec.md");

const flag = (args: readonly string[], name: string): string | undefined =>
  args.includes(name) ? args[args.indexOf(name) + 1] : undefined;

/** The nearest folder at or above `cwd` that has `openspec/`, or `cwd`. */
const projectRoot = (cwd: string): string => {
  for (let dir = cwd; path.dirname(dir) !== dir; dir = path.dirname(dir))
    if (fs.existsSync(path.join(dir, "openspec"))) return dir;
  return cwd;
};

/** The folder of the schema `name`: the project folder first, then the preset. */
const schemaDir = (root: string, name: string): string | undefined =>
  [path.join(root, "openspec/schemas", name), path.join(PRESETS, name)].find(
    (d) => fs.existsSync(path.join(d, "schema.yaml")),
  );

/** The date of today as `YYYY-MM-DD`, in local time. */
const today = (): string => new Date().toLocaleDateString("sv");

const summary = async (dir: string) => {
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
  };
};

/** What each command knows: the project root, the folder of the changes, the config file, the arguments, and where to print. */
interface Ctx {
  readonly root: string;
  readonly changes: string;
  readonly configFile: string;
  readonly args: string[];
  readonly io: Pick<Console, "log" | "error">;
}

const names = ({ changes }: Ctx): string[] =>
  fs.existsSync(changes)
    ? fs
        .readdirSync(changes, { withFileTypes: true })
        .filter(
          (e) =>
            e.isDirectory() && e.name !== "archive" && !e.name.startsWith("."),
        )
        .map((e) => e.name)
        .sort()
    : [];

const fail = ({ io }: Ctx, message: string, status = 1): number => {
  io.error(message);
  return status;
};

const print = ({ io }: Ctx, data: unknown): number => {
  io.log(JSON.stringify(data, null, 2));
  return 0;
};

const open = (ctx: Ctx, name = ""): string | undefined => {
  if (names(ctx).includes(name)) return path.join(ctx.changes, name);
  fail(
    ctx,
    `Change '${name}' not found. Available changes: ${names(ctx).join(", ") || "none"}.`,
  );
  return undefined;
};

const newChange = async (ctx: Ctx): Promise<number> => {
  const { args } = ctx;
  if (args[1] !== "change") return fail(ctx, USAGE, 2);
  const name = args[2] ?? "";
  if (!NAME.test(name))
    return fail(
      ctx,
      `The change name '${name}' is not kebab-case. Use lowercase letters and digits, with single hyphens between words.`,
    );
  const schema =
    flag(args, "--schema") ?? (await yaml(ctx.configFile)).schema ?? "story";
  const sdir = schemaDir(ctx.root, schema);
  if (!sdir) return fail(ctx, NO_SCHEMA(schema));
  const target = path.join(ctx.changes, name);
  if (fs.existsSync(target))
    return fail(
      ctx,
      `Change '${name}' already exists at ${target}. Pick another name.`,
    );
  const { artifacts = [] } = await yaml(path.join(sdir, "schema.yaml"));
  const skip = artifacts.some((a) => a.generates.startsWith("specs/"))
    ? ""
    : "skip_specs: true\n";
  await Bun.write(
    path.join(target, META),
    `schema: ${schema}\ncreated: ${today()}\n${skip}`,
  );
  ctx.io.log(`Created change '${name}' at openspec/changes/${name}/`);
  ctx.io.log(`Schema: ${schema}`);
  return 0;
};

const listChanges = async (ctx: Ctx): Promise<number> => {
  const items = await Promise.all(
    names(ctx).map((n) => summary(path.join(ctx.changes, n))),
  );
  items.sort(
    (a, b) =>
      b.lastModified.localeCompare(a.lastModified) ||
      a.name.localeCompare(b.name),
  );
  return print(ctx, { changes: items });
};

const changeStatus = async (ctx: Ctx): Promise<number> => {
  const dir = open(ctx, flag(ctx.args, "--change"));
  if (!dir) return 1;
  const meta = await yaml(path.join(dir, META));
  const config = await yaml(ctx.configFile);
  const schemaName = meta.schema ?? config.schema ?? "story";
  const sdir = schemaDir(ctx.root, schemaName);
  if (!sdir) return fail(ctx, NO_SCHEMA(schemaName));
  const schema = await yaml(path.join(sdir, "schema.yaml"));
  const artifacts = schema.artifacts ?? [];
  const built = new Set(
    artifacts.filter((a) => scan(dir, a.generates).length).map((a) => a.id),
  );
  const list = statuses(artifacts, built, meta.skip_specs === true);
  const tasks = countTasks(await text(path.join(dir, "tasks.md")));
  const detail = (id: string) => {
    const a = artifacts.find((x) => x.id === id);
    return {
      template: a?.template
        ? [sdir, PRESETS]
            .map((d) => path.join(d, "templates", a.template as string))
            .find(fs.existsSync)
        : null,
      instruction: a?.instruction ?? null,
    };
  };
  return print(ctx, {
    changeName: path.basename(dir),
    schemaName,
    isComplete: list.every((a) => ["done", "skipped"].includes(a.status)),
    artifacts: list.map((s) => ({ ...s, ...detail(s.id) })),
    context: config.context ?? null,
    rules: config.rules ?? {},
    apply: schema.apply ?? {},
    tasks: { done: tasks.done, total: tasks.total, next: tasks.next },
  });
};

const check = async (dir: string, strict: boolean) => {
  const meta = await yaml(path.join(dir, META));
  const specs = await Promise.all(
    deltas(dir).map(async (f) => ({
      path: f,
      text: await text(path.join(dir, "specs", f)),
    })),
  );
  const issues = validateChange(
    specs,
    meta.skip_specs === true,
    scan(path.join(dir, "specs"), "**/*").length > 0,
  );
  return {
    issues,
    valid: !issues.some(
      (i) => i.level === "ERROR" || (strict && i.level === "WARNING"),
    ),
  };
};

const validateCommand = async (ctx: Ctx): Promise<number> => {
  const dir = open(ctx, ctx.args[1]);
  if (!dir) return 1;
  const { issues, valid } = await check(dir, ctx.args.includes("--strict"));
  print(ctx, {
    items: [{ id: path.basename(dir), type: "change", valid, issues }],
    summary: { totals: { items: 1, passed: +valid, failed: +!valid } },
  });
  return valid ? 0 : 1;
};

const KINDS = ["added", "modified", "removed", "renamed"] as const;
const MARKS = { added: "+", modified: "~", removed: "-", renamed: "→" };

/** Merges the deltas of the change in `dir`: the files to write and the lines to print, or the error. */
const planMerges = async (root: string, dir: string, name: string) => {
  const writes: [string, string][] = [];
  const update = ["Specs to update:"];
  const applied: string[] = [];
  const sum = { added: 0, modified: 0, removed: 0, renamed: 0 };
  for (const f of deltas(dir)) {
    const id = path.dirname(f);
    const file = path.join(root, "openspec/specs", id, "spec.md");
    const old = fs.existsSync(file) ? await Bun.file(file).text() : null;
    const merged = mergeSpec(
      id,
      old,
      await text(path.join(dir, "specs", f)),
      name,
    );
    if (!merged.ok) return `${merged.error}\nAborted. No files were changed.`;
    writes.push([file, merged.text]);
    update.push(`  ${id}: ${old === null ? "create" : "update"}`);
    applied.push(`Applying changes to openspec/specs/${id}/spec.md:`);
    for (const k of KINDS) {
      sum[k] += merged.counts[k];
      if (merged.counts[k])
        applied.push(`  ${MARKS[k]} ${merged.counts[k]} ${k}`);
    }
  }
  const totals = KINDS.map((k) => `${MARKS[k]} ${sum[k]}`).join(", ");
  return {
    writes,
    lines: [
      ...update,
      ...applied,
      `Totals: ${totals}`,
      "Specs updated successfully.",
    ],
  };
};

const taskLine = (done: number, total: number): string =>
  `Task status: ${total === 0 ? "No tasks" : done === total ? "✓ Complete" : `${done}/${total} tasks`}`;

const archiveCommand = async (ctx: Ctx): Promise<number> => {
  const { io } = ctx;
  const dir = open(ctx, ctx.args[1]);
  if (!dir) return 1;
  const name = path.basename(dir);
  const { issues, valid } = await check(dir, false);
  if (!valid) {
    for (const i of issues) io.log(`${i.level} ${i.path}: ${i.message}`);
    return fail(
      ctx,
      `Change '${name}' is not valid. Fix each ERROR and run validate again.`,
    );
  }
  const { done, total } = countTasks(await text(path.join(dir, "tasks.md")));
  io.log(taskLine(done, total));
  if (done < total) {
    const warning = `Warning: ${total - done} incomplete task(s) found.`;
    if (!ctx.args.includes("--yes"))
      return fail(
        ctx,
        `${warning} Ask the user, and run the archive again with --yes after their yes.`,
      );
    io.log(`${warning} Continuing due to --yes flag.`);
  }
  const archiveName = /^\d{4}-\d{2}-\d{2}-/.test(name)
    ? name
    : `${today()}-${name}`;
  const target = path.join(ctx.changes, "archive", archiveName);
  if (fs.existsSync(target))
    return fail(
      ctx,
      `Archive '${archiveName}' already exists. Rename the change or the archive folder.`,
    );
  const plan = await planMerges(ctx.root, dir, name);
  if (typeof plan === "string") return fail(ctx, plan);
  for (const [file, merged] of plan.writes) await Bun.write(file, merged);
  if (plan.writes.length) for (const line of plan.lines) io.log(line);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(dir, target);
  io.log(`Change '${name}' archived as '${archiveName}'.`);
  return 0;
};

const COMMANDS = new Map([
  ["new", newChange],
  ["list", listChanges],
  ["status", changeStatus],
  ["validate", validateCommand],
  ["archive", archiveCommand],
]);

/** Runs `minispec` with `args` in the project of `cwd`, and gives the exit status. */
export const main = async (
  args: string[],
  cwd: string = process.cwd(),
  io: Ctx["io"] = console,
): Promise<number> => {
  const root = projectRoot(cwd);
  const ctx: Ctx = {
    root,
    changes: path.join(root, CHANGES_DIR),
    configFile: path.join(root, "openspec/config.yaml"),
    args,
    io,
  };
  const run = COMMANDS.get(args[0] ?? "");
  return run ? run(ctx) : fail(ctx, USAGE, 2);
};
