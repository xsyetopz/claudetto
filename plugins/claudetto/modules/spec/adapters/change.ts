// The commands `minispec new change`, `status`, and `instructions`: the change, and two views of its status.

import path from "node:path";
import { taskEntries } from "../../project/domain/change.ts";
import {
	type Ctx,
	exists,
	fail,
	flag,
	has,
	loadStatus,
	META,
	names,
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

const PLAIN_SCALAR = /^[A-Za-z][\w./-]*( [\w./-]+)*$/;
const RESERVED_SCALAR = /^(true|false|null|yes|no|on|off|y|n)$/i;
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A YAML scalar for `value`: plain when it is safe, and else in double quotes. */
const scalar = (value: string): string =>
	PLAIN_SCALAR.test(value) && !RESERVED_SCALAR.test(value)
		? value
		: JSON.stringify(value);

export const newChange = async (ctx: Ctx): Promise<Out> => {
	const given = ctx.words[1] ?? "";
	const name = given.replaceAll(".", "-");
	if (!KEBAB_CASE.test(name)) {
		fail(
			`The change name '${given}' is not kebab-case. Use lowercase letters and digits, with single hyphens between words.`,
		);
	}
	const schema =
		flag(ctx, "--schema") ?? (await yaml(ctx.configFile)).schema ?? "story";
	const sdir = (await schemaDir(ctx.root, schema)) ?? noSchema(schema);
	const target = path.join(ctx.changes, name);
	if (await exists(target)) {
		fail(`Change '${name}' already exists at ${target}. Pick another name.`);
	}
	const { artifacts = [] } = await yaml(path.join(sdir, "schema.yaml"));
	const skip = artifacts.some((a) => a.generates.startsWith("specs/"))
		? ""
		: "skip_specs: true\n";
	const metadataPath = path.join(target, META);
	const goal = flag(ctx, "--goal")?.trim();
	await globalThis.Bun.write(
		metadataPath,
		`schema: ${schema}\ncreated: ${today()}\n${goal ? `goal: ${scalar(goal)}\n` : ""}${skip}`,
	);
	const description = flag(ctx, "--description");
	if (description) {
		await globalThis.Bun.write(
			path.join(target, "README.md"),
			`# ${name}\n\n${description}\n`,
		);
	}
	return [
		{ change: { id: name, path: target, metadataPath, schema } },
		[
			`Created change '${name}' at openspec/changes/${name}/`,
			`Schema: ${schema}`,
			"Next: /claudetto:propose",
		],
	];
};

const MARKS = { done: "[x]", skipped: "[~]", ready: "[ ]", blocked: "[-]" };

type Status = Awaited<ReturnType<typeof loadStatus>>;

/** The JSON object and the text lines of the status of one change. */
const statusView = async (s: Status): Promise<Out> => {
	const skipped = s.list.filter((a) => a.status === "skipped").length;
	const artifacts = await Promise.all(
		s.list.map(async (a) => {
			const def = s.artifacts.find((x) => x.id === a.id);
			return {
				...a,
				template: def?.template
					? await templateFile(s.sdir, def.template)
					: null,
				instruction: def?.instruction ?? null,
			};
		}),
	);
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
	const note = (a: (typeof artifacts)[number]) => {
		if (a.status === "skipped") {
			return " (skipped: change declares skip_specs)";
		}
		return a.missingDeps?.length
			? ` (blocked by: ${a.missingDeps.join(", ")})`
			: "";
	};
	return [
		data,
		[
			`Change: ${s.name}`,
			`Schema: ${s.schemaName}`,
			`Progress: ${s.list.filter((a) => a.status === "done").length}/${s.list.length - skipped} artifacts complete${skipped ? ` (${skipped} skipped)` : ""}`,
			"",
			...artifacts.map((a) => `${MARKS[a.status]} ${a.id}${note(a)}`),
			"",
			...(s.complete ? ["All planning artifacts complete!"] : []),
			`Next: ${s.next}`,
		],
	];
};

/** `status --change <name>`, or `status --all` for each open change, in name order. */
export const changeStatus = async (ctx: Ctx): Promise<Out> => {
	if (!has(ctx, "--all")) {
		return statusView(
			await loadStatus(ctx, await open(ctx, flag(ctx, "--change"))),
		);
	}
	const views = await Promise.all(
		(await names(ctx)).map(async (n) =>
			statusView(await loadStatus(ctx, path.join(ctx.changes, n))),
		),
	);
	return views.length > 0
		? [
				{ changes: views.map(([data]) => data) },
				views.flatMap(([, lines], i) => (i ? ["", ...lines] : lines)),
			]
		: [
				{ changes: [], message: "No active changes." },
				["No active changes. Create one with: minispec new change <name>"],
			];
};

const applyState = (
	blocked: boolean,
	tasks: number,
	complete: number,
): "blocked" | "all_done" | "ready" => {
	if (blocked) {
		return "blocked";
	}
	return tasks > 0 && complete === tasks ? "all_done" : "ready";
};

const applyInstructions = async (s: Status) => {
	const { dir, artifacts, list } = s;
	const apply = s.schema.apply ?? {};
	const tasksPath = path.join(
		dir,
		(apply.tracks ? (await scan(dir, apply.tracks))[0] : undefined) ??
			"tasks.md",
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
	const state = applyState(
		missing.length > 0 || (Boolean(apply.tracks) && tasks.length === 0),
		tasks.length,
		complete,
	);
	const contextFiles = (
		await Promise.all(
			artifacts.map(
				async (a) =>
					[
						a.id,
						(await scan(dir, a.generates)).map((f) => path.join(dir, f)),
					] as const,
			),
		)
	).filter(([, files]) => files.length > 0);
	const instruction = {
		blocked:
			missing.length > 0
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
		contextFiles: Object.fromEntries(contextFiles),
		progress: {
			total: tasks.length,
			complete,
			remaining: tasks.length - complete,
		},
		tasks: tasks.map((t, i) => ({ id: String(i + 1), ...t })),
		taskTrackingConfigured: Boolean(apply.tracks),
		state,
		...(missing.length > 0 && { missingArtifacts: missing }),
		instruction,
	};
};

const artifactInstructions = async (s: Status, id: string) => {
	const a = s.artifacts.find((x) => x.id === id);
	if (!a) {
		return fail(
			`Artifact '${id}' not found in schema '${s.schemaName}'. Valid artifacts: ${s.artifacts.map((x) => x.id).join(", ")}`,
		);
	}
	const found = async (g: string) =>
		(await scan(s.dir, g)).map((f) => path.join(s.dir, f));
	return {
		changeName: s.name,
		artifactId: id,
		schemaName: s.schemaName,
		changeDir: s.dir,
		outputPath: a.generates,
		resolvedOutputPath: path.join(s.dir, a.generates),
		existingOutputPaths: await found(a.generates),
		description: a.description ?? "",
		instruction: a.instruction ?? "",
		template: a.template
			? await text(await templateFile(s.sdir, a.template))
			: "",
		dependencies: await Promise.all(
			a.requires.map(async (r) => {
				const dep = s.artifacts.find((x) => x.id === r);
				return {
					id: r,
					done: (await found(dep?.generates ?? a.generates)).length > 0,
					path: dep?.generates ?? "",
					description: dep?.description ?? "",
				};
			}),
		),
		unlocks: s.artifacts
			.filter((x) => x.requires.includes(id))
			.map((x) => x.id),
	};
};

export const instructions = async (ctx: Ctx): Promise<Out> => {
	const target = ctx.words[0] ?? "";
	const s = await loadStatus(ctx, await open(ctx, flag(ctx, "--change")));
	const data = await (target === "apply"
		? applyInstructions(s)
		: artifactInstructions(s, target));
	return [data, [data.instruction]];
};
