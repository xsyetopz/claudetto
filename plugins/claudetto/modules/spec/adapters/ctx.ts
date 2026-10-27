// What each command of `minispec` shares: the context, the readers of files, and the status of a change.

import fs from "node:fs/promises";
import path from "node:path";
import { fileReader } from "../../../kernel/node/fs.ts";
import { countTasks } from "../../project/domain/change.ts";
import { type Artifact, statuses } from "../domain/graph.ts";
import { fills } from "../domain/markdown.ts";

export const PRESETS = path.resolve(import.meta.dirname, "..", "presets");
export const META = ".openspec.yaml";

const GLOB_CHARS = /[*?{[]/;

/** The keys of the YAML files that `minispec` reads: `.openspec.yaml`, `config.yaml`, and `schema.yaml`. */
export interface Yaml {
	description?: string;
	schema?: string;
	skip_specs?: boolean;
	context?: string;
	rules?: unknown;
	artifacts?: Artifact[];
	apply?: { requires?: string[]; tracks?: string; instruction?: string };
}
export interface Ctx {
	root: string;
	changes: string;
	configFile: string;
	/** The arguments after the command that are no flag and no flag value. */
	words: string[];
	/** The value of each flag that takes one, by the first use of the flag, from the same walk as `words`. */
	values: Map<string, string | undefined>;
	/** Each flag after the command, from the same walk, so the value of a flag is no flag. */
	flags: Set<string>;
	io: Pick<Console, "log" | "error">;
}
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
const isYaml = (value: unknown): value is Yaml =>
	typeof value === "object" && value !== null;
export const yaml = async (file: string): Promise<Yaml> => {
	try {
		const parsed: unknown = globalThis.Bun.YAML.parse(await text(file));
		return isYaml(parsed) ? parsed : {};
	} catch (e) {
		if (e instanceof Fail) {
			throw e;
		}
		return fail(
			`Cannot parse ${file}: ${e instanceof Error ? e.message : String(e)}`,
		);
	}
};
export const exists = async (file: string): Promise<boolean> => {
	try {
		await fs.access(file);
		return true;
	} catch {
		return false;
	}
};
/** The order of the default `sort()`, by UTF-16 code unit, which the output of `minispec` keeps. */
export const byCode = (a: string, b: string): number => {
	if (a < b) {
		return -1;
	}
	return a > b ? 1 : 0;
};
export const scan = async (dir: string, pattern: string): Promise<string[]> =>
	(await exists(dir))
		? (
				await Array.fromAsync(
					new globalThis.Bun.Glob(pattern).scan({ cwd: dir, dot: true }),
				)
			).sort(byCode)
		: [];
/** The delta specs of a change, as `<capability>/spec.md`. */
export const deltas = (dir: string) =>
	scan(path.join(dir, "specs"), "*/spec.md");
/** Whether the flag `name` is in the walk. */
export const has = ({ flags }: Pick<Ctx, "flags">, name: string) =>
	flags.has(name);
export const flag = ({ values }: Pick<Ctx, "values">, name: string) =>
	values.get(name);
export const mainSpec = (root: string, id: string) =>
	path.join(root, "openspec/specs", id, "spec.md");
export const today = () => new Date().toLocaleDateString("sv");

/** The nearest folder at or above `cwd` that has `openspec/`, or `cwd`. */
export const projectRoot = async (cwd: string): Promise<string> => {
	const up = async (dir: string): Promise<string | undefined> => {
		if (path.dirname(dir) === dir) {
			return;
		}
		return (await exists(path.join(dir, "openspec")))
			? dir
			: up(path.dirname(dir));
	};
	return (await up(cwd)) ?? cwd;
};

/** The first of `files` that exists, in order. */
const firstExisting = async (files: string[]): Promise<string | undefined> => {
	const [head, ...rest] = files;
	if (head === undefined) {
		return;
	}
	return (await exists(head)) ? head : firstExisting(rest);
};

/** The names of OpenSpec schemas that read as a preset, so that a project that `openspec init` made works. */
const ALIASES: Record<string, string> = { "spec-driven": "story" };

/** The folder of the schema `name`: the project folder first, then the preset (`spec-driven` reads as `story`). */
export const schemaDir = async (root: string, name: string) => {
	const found = await firstExisting(
		[
			path.join(root, "openspec/schemas", name),
			path.join(PRESETS, ALIASES[name] ?? name),
		].map((d) => path.join(d, "schema.yaml")),
	);
	return found === undefined ? undefined : path.dirname(found);
};

/** The folders of the active changes, or of the archived ones, by name. */
export const names = async (
	{ changes }: Pick<Ctx, "changes">,
	archived = false,
): Promise<string[]> => {
	const dir = archived ? path.join(changes, "archive") : changes;
	if (!(await exists(dir))) {
		return [];
	}
	const entries = await fs.readdir(dir, { withFileTypes: true });
	return entries
		.filter(
			(e) =>
				e.isDirectory() &&
				(archived || e.name !== "archive") &&
				!e.name.startsWith("."),
		)
		.map((e) => e.name)
		.sort(byCode);
};

/** The folder of the change `name`, or a failure that lists the changes. */
export const open = async (ctx: Ctx, name = ""): Promise<string> => {
	const found = await names(ctx);
	return found.includes(name)
		? path.join(ctx.changes, name)
		: fail(
				`Change '${name}' not found. Available changes: ${found.join(", ") || "none"}.`,
			);
};

/** The template of an artifact: the schema folder first, then the presets. */
export const templateFile = async (sdir: string, template: string) =>
	(await firstExisting(
		[sdir, PRESETS].map((d) => path.join(d, "templates", template)),
	)) ?? path.join(sdir, "templates", template);

export const noSchema = (name: string) =>
	fail(
		`Schema '${name}' not found. Use a preset (task, story, or epic) or a folder in openspec/schemas/.`,
	);

const nextCommand = (
	complete: boolean,
	tasks: { done: number; total: number },
) => {
	if (!complete) {
		return "/claudetto:propose";
	}
	return tasks.done < tasks.total ? "/claudetto:apply" : "/claudetto:archive";
};

/** The status of the change in `dir`: its schema, its artifacts, its tasks, and the next command. */
export const loadStatus = async (ctx: Ctx, dir: string) => {
	const meta = await yaml(path.join(dir, META));
	const config = await yaml(ctx.configFile);
	const schemaName = meta.schema ?? config.schema ?? "story";
	const sdir = (await schemaDir(ctx.root, schemaName)) ?? noSchema(schemaName);
	const schema = await yaml(path.join(sdir, "schema.yaml"));
	const artifacts = schema.artifacts ?? [];
	// An artifact is built when its file has text, and for a file with a fixed name, when each section of its template has text.
	const built = new Set(
		(
			await Promise.all(
				artifacts.map(async (a) => {
					const files = await scan(dir, a.generates);
					const texts = await Promise.all(
						files.map((f) => text(path.join(dir, f))),
					);
					const template = a.template
						? await text(await templateFile(sdir, a.template))
						: "";
					const glob = GLOB_CHARS.test(a.generates);
					return files.length > 0 &&
						texts.every((t) => t.trim() && (glob || fills(template, t)))
						? [a.id]
						: [];
				}),
			)
		).flat(),
	);
	const list = statuses(artifacts, built, meta.skip_specs === true);
	const tasks = countTasks(await text(path.join(dir, "tasks.md")));
	const complete = list.every((a) => ["done", "skipped"].includes(a.status));
	const next = nextCommand(complete, tasks);
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
