// What each command of `minispec` shares: the context, the readers of files, and the status of a change.

import fs from "node:fs";
import path from "node:path";
import { countTasks } from "../../../kernel/change.ts";
import { fileReader } from "../../../kernel/node/fs.ts";
import { type Artifact, statuses } from "../domain/graph.ts";

export const PRESETS = path.resolve(import.meta.dirname, "..", "presets");
export const META = ".openspec.yaml";

/** The keys of the YAML files that `minispec` reads: `.openspec.yaml`, `config.yaml`, and `schema.yaml`. */
export type Yaml = {
  description?: string;
  schema?: string;
  skip_specs?: boolean;
  context?: string;
  rules?: unknown;
  artifacts?: Artifact[];
  apply?: { requires?: string[]; tracks?: string; instruction?: string };
};
export type Ctx = {
  root: string;
  changes: string;
  configFile: string;
  args: string[];
  io: Pick<Console, "log" | "error">;
};
/** What a command gives: the JSON object, the lines of its text view, and the exit status. */
export type Out = [data: unknown, lines: string[], code?: number];

export class Fail extends Error {
  status: number;
  constructor(message: string, status = 1) {
    super(message);
    this.status = status;
  }
}
export const fail: (message: string, status?: number) => never = (
  message,
  status = 1,
) => {
  throw new Fail(message, status);
};

export const text = async (file: string) => (await fileReader.read(file)) ?? "";
export const yaml = async (file: string): Promise<Yaml> =>
  (Bun.YAML.parse(await text(file)) as Yaml | null) ?? {};
export const scan = (dir: string, pattern: string): string[] =>
  fs.existsSync(dir)
    ? [...new Bun.Glob(pattern).scanSync({ cwd: dir, dot: true })].sort()
    : [];
/** The delta specs of a change, as `<capability>/spec.md`. */
export const deltas = (dir: string) =>
  scan(path.join(dir, "specs"), "*/spec.md");
export const flag = (args: string[], name: string) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
export const mainSpec = (root: string, id: string) =>
  path.join(root, "openspec/specs", id, "spec.md");
export const today = () => new Date().toLocaleDateString("sv");

/** The nearest folder at or above `cwd` that has `openspec/`, or `cwd`. */
export const projectRoot = (cwd: string): string => {
  for (let dir = cwd; path.dirname(dir) !== dir; dir = path.dirname(dir))
    if (fs.existsSync(path.join(dir, "openspec"))) return dir;
  return cwd;
};

/** The folder of the schema `name`: the project folder first, then the preset. */
export const schemaDir = (root: string, name: string) =>
  [path.join(root, "openspec/schemas", name), path.join(PRESETS, name)].find(
    (d) => fs.existsSync(path.join(d, "schema.yaml")),
  );

/** The folders of the active changes, or of the archived ones, by name. */
export const names = ({ changes }: Ctx, archived = false): string[] => {
  const dir = archived ? path.join(changes, "archive") : changes;
  return fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter(
          (e) =>
            e.isDirectory() &&
            (archived || e.name !== "archive") &&
            !e.name.startsWith("."),
        )
        .map((e) => e.name)
        .sort()
    : [];
};

/** The folder of the change `name`, or a failure that lists the changes. */
export const open = (ctx: Ctx, name = "") =>
  names(ctx).includes(name)
    ? path.join(ctx.changes, name)
    : fail(
        `Change '${name}' not found. Available changes: ${names(ctx).join(", ") || "none"}.`,
      );

/** The template of an artifact: the schema folder first, then the presets. */
export const templateFile = (sdir: string, template: string) =>
  [sdir, PRESETS]
    .map((d) => path.join(d, "templates", template))
    .find(fs.existsSync) ?? path.join(sdir, "templates", template);

export const noSchema = (name: string) =>
  fail(
    `Schema '${name}' not found. Use a preset (task, story, or epic) or a folder in openspec/schemas/.`,
  );

/** The status of the change in `dir`: its schema, its artifacts, its tasks, and the next command. */
export const loadStatus = async (ctx: Ctx, dir: string) => {
  const meta = await yaml(path.join(dir, META));
  const config = await yaml(ctx.configFile);
  const schemaName = meta.schema ?? config.schema ?? "story";
  const sdir = schemaDir(ctx.root, schemaName) ?? noSchema(schemaName);
  const schema = await yaml(path.join(sdir, "schema.yaml"));
  const artifacts = schema.artifacts ?? [];
  const built = new Set(
    artifacts.filter((a) => scan(dir, a.generates).length).map((a) => a.id),
  );
  const list = statuses(artifacts, built, meta.skip_specs === true);
  const tasks = countTasks(await text(path.join(dir, "tasks.md")));
  const complete = list.every((a) => ["done", "skipped"].includes(a.status));
  const next = !complete
    ? "/claudetto:propose"
    : tasks.done < tasks.total
      ? "/claudetto:apply"
      : "/claudetto:archive";
  return {
    name: path.basename(dir),
    dir,
    schemaName,
    sdir,
    schema,
    config,
    artifacts,
    list,
    tasks,
    complete,
    next,
  };
};
