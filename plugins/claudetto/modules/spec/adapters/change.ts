// The commands `minispec new change`, `status`, and `instructions`: the change, and two views of its status.

import fs from "node:fs";
import path from "node:path";
import { taskEntries } from "../../project/index.ts";
import {
  type Ctx,
  fail,
  flag,
  loadStatus,
  META,
  noSchema,
  type Out,
  open,
  scan,
  schemaDir,
  templateFile,
  text,
  today,
  yaml,
} from "./ctx.ts";

export const newChange = async (ctx: Ctx): Promise<Out> => {
  const { args } = ctx;
  const given = args[2] ?? "";
  const name = given.replaceAll(".", "-");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))
    fail(
      `The change name '${given}' is not kebab-case. Use lowercase letters and digits, with single hyphens between words.`,
    );
  const schema =
    flag(args, "--schema") ?? (await yaml(ctx.configFile)).schema ?? "story";
  const sdir = schemaDir(ctx.root, schema) ?? noSchema(schema);
  const target = path.join(ctx.changes, name);
  if (fs.existsSync(target))
    fail(`Change '${name}' already exists at ${target}. Pick another name.`);
  const { artifacts = [] } = await yaml(path.join(sdir, "schema.yaml"));
  const skip = artifacts.some((a) => a.generates.startsWith("specs/"))
    ? ""
    : "skip_specs: true\n";
  const metadataPath = path.join(target, META);
  await Bun.write(
    metadataPath,
    `schema: ${schema}\ncreated: ${today()}\n${skip}`,
  );
  const description = flag(args, "--description");
  if (description)
    await Bun.write(
      path.join(target, "README.md"),
      `# ${name}\n\n${description}\n`,
    );
  return [
    { change: { id: name, path: target, metadataPath, schema } },
    [
      `Created change '${name}' at openspec/changes/${name}/`,
      `Schema: ${schema}`,
    ],
  ];
};

const MARKS = { done: "[x]", skipped: "[~]", ready: "[ ]", blocked: "[-]" };

export const changeStatus = async (ctx: Ctx): Promise<Out> => {
  const s = await loadStatus(ctx, open(ctx, flag(ctx.args, "--change")));
  const skipped = s.list.filter((a) => a.status === "skipped").length;
  const artifacts = s.list.map((a) => {
    const def = s.artifacts.find((x) => x.id === a.id);
    return {
      ...a,
      template: def?.template ? templateFile(s.sdir, def.template) : null,
      instruction: def?.instruction ?? null,
    };
  });
  const data = {
    changeName: s.name,
    schemaName: s.schemaName,
    isComplete: s.complete,
    next: s.next,
    artifacts,
    context: s.config.context ?? null,
    rules: s.config.rules ?? {},
    apply: s.schema.apply ?? {},
    tasks: { done: s.tasks.done, total: s.tasks.total, next: s.tasks.next },
  };
  const note = (a: (typeof artifacts)[number]) =>
    a.status === "skipped"
      ? " (skipped: change declares skip_specs)"
      : a.missingDeps?.length
        ? ` (blocked by: ${a.missingDeps.join(", ")})`
        : "";
  return [
    data,
    [
      `Change: ${s.name}`,
      `Schema: ${s.schemaName}`,
      `Progress: ${s.list.filter((a) => a.status === "done").length}/${s.list.length - skipped} artifacts complete${skipped ? ` (${skipped} skipped)` : ""}`,
      "",
      ...artifacts.map(
        (a) => `${MARKS[a.status as keyof typeof MARKS]} ${a.id}${note(a)}`,
      ),
      "",
      ...(s.complete ? ["All planning artifacts complete!"] : []),
      `Next: ${s.next}`,
    ],
  ];
};

type Status = Awaited<ReturnType<typeof loadStatus>>;

const applyInstructions = async (s: Status) => {
  const { dir, artifacts, list } = s;
  const apply = s.schema.apply ?? {};
  const tasksPath = path.join(
    dir,
    (apply.tracks ? scan(dir, apply.tracks)[0] : undefined) ?? "tasks.md",
  );
  const tasks = taskEntries(await text(tasksPath)).map((t) => ({
    description: t.text,
    done: t.done,
    sourcePath: tasksPath,
    line: t.index + 1,
  }));
  const complete = tasks.filter((t) => t.done).length;
  const present = (id: string) =>
    ["done", "skipped"].includes(list.find((a) => a.id === id)?.status ?? "");
  const missing = (apply.requires ?? artifacts.map((a) => a.id)).filter(
    (id) => !present(id),
  );
  const state =
    missing.length || (apply.tracks && !tasks.length)
      ? "blocked"
      : tasks.length && complete === tasks.length
        ? "all_done"
        : "ready";
  const instruction = {
    blocked: missing.length
      ? `Cannot apply this change yet. Missing artifacts: ${missing.join(", ")}.`
      : "The tasks file is missing or has no tasks.",
    all_done:
      "All tracked tasks are complete.\nReview or verify the change as appropriate before archiving.",
    ready:
      apply.instruction?.trim() ??
      "Read context files, work through pending tasks, mark complete as you go.",
  }[state];
  return {
    changeName: s.name,
    changeDir: dir,
    schemaName: s.schemaName,
    contextFiles: Object.fromEntries(
      artifacts
        .map(
          (a) =>
            [
              a.id,
              scan(dir, a.generates).map((f) => path.join(dir, f)),
            ] as const,
        )
        .filter(([, files]) => files.length),
    ),
    progress: {
      total: tasks.length,
      complete,
      remaining: tasks.length - complete,
    },
    tasks: tasks.map((t, i) => ({ id: String(i + 1), ...t })),
    taskTrackingConfigured: Boolean(apply.tracks),
    state,
    ...(missing.length && { missingArtifacts: missing }),
    instruction,
  };
};

const artifactInstructions = async (s: Status, id: string) => {
  const a = s.artifacts.find((x) => x.id === id);
  if (!a)
    return fail(
      `Artifact '${id}' not found in schema '${s.schemaName}'. Valid artifacts: ${s.artifacts.map((x) => x.id).join(", ")}`,
    );
  const found = (g: string) => scan(s.dir, g).map((f) => path.join(s.dir, f));
  return {
    changeName: s.name,
    artifactId: id,
    schemaName: s.schemaName,
    changeDir: s.dir,
    outputPath: a.generates,
    resolvedOutputPath: path.join(s.dir, a.generates),
    existingOutputPaths: found(a.generates),
    description: a.description ?? "",
    instruction: a.instruction ?? "",
    template: a.template ? await text(templateFile(s.sdir, a.template)) : "",
    dependencies: a.requires.map((r) => {
      const dep = s.artifacts.find((x) => x.id === r);
      return {
        id: r,
        done: found(dep?.generates ?? a.generates).length > 0,
        path: dep?.generates ?? "",
        description: dep?.description ?? "",
      };
    }),
    unlocks: s.artifacts
      .filter((x) => x.requires.includes(id))
      .map((x) => x.id),
  };
};

export const instructions = async (ctx: Ctx): Promise<Out> => {
  const target = ctx.args[1] ?? "";
  const s = await loadStatus(ctx, open(ctx, flag(ctx.args, "--change")));
  const data = await (target === "apply"
    ? applyInstructions(s)
    : artifactInstructions(s, target));
  return [data, [data.instruction]];
};
