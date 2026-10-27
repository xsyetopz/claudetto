// The commands `minispec schemas` and `schema validate [name]`.

import path from "node:path";
import {
	byCode,
	type Ctx,
	exists,
	fail,
	type Out,
	PRESETS,
	scan,
	schemaDir,
	templateFile,
	yaml,
} from "./ctx.ts";

const folders = async (dir: string) =>
	(await scan(dir, "*/schema.yaml")).map((f) => path.dirname(f));

/** The schemas of the project and the presets, by name: a folder of the project wins over a preset. */
const available = async (root: string) => {
	const project = await folders(path.join(root, "openspec/schemas"));
	const presets = await folders(PRESETS);
	return [...new Set([...project, ...presets])].sort(byCode).map((name) => ({
		name,
		source: project.includes(name) ? "project" : "package",
	}));
};

export const schemas = async (ctx: Ctx): Promise<Out> => {
	const list = await Promise.all(
		(await available(ctx.root)).map(async ({ name, source }) => {
			const { description = "", artifacts = [] } = await yaml(
				path.join((await schemaDir(ctx.root, name)) ?? "", "schema.yaml"),
			);
			return {
				name,
				description,
				artifacts: artifacts.map((a) => a.id),
				source,
			};
		}),
	);
	return [
		list,
		[
			"Available schemas:",
			...list.flatMap((s) => [
				"",
				`  ${s.name}${s.source === "project" ? " (project)" : ""}`,
				`    ${s.description}`,
				`    Artifacts: ${s.artifacts.join(" → ")}`,
			]),
		],
	];
};

/** The findings for the `schema.yaml` in `dir`: a missing template and an unknown `requires` or `apply.requires`. */
const schemaIssues = async (dir: string) => {
	const { artifacts = [], apply } = await yaml(path.join(dir, "schema.yaml"));
	const ids = artifacts.map((a) => a.id);
	const unknown = (refs: string[] = []) => refs.filter((r) => !ids.includes(r));
	const missingTemplate = async (a: (typeof artifacts)[number]) =>
		Boolean(a.template) &&
		!(await exists(await templateFile(dir, a.template ?? "")));
	const templateIssues = await Promise.all(artifacts.map(missingTemplate));
	return [
		...artifacts.flatMap((a, i) => [
			...(templateIssues[i]
				? [
						[
							`artifacts.${a.id}.template`,
							`Template file '${a.template}' not found for artifact '${a.id}'`,
						],
					]
				: []),
			...unknown(a.requires).map((r) => [
				`artifacts.${a.id}.requires`,
				`Invalid dependency reference in artifact '${a.id}': '${r}' does not exist`,
			]),
		]),
		...unknown(apply?.requires).map((r) => [
			"apply.requires",
			`Invalid apply.requires reference: '${r}' does not exist (artifacts: ${ids.join(", ")})`,
		]),
	].map(([at, message]) => ({ level: "error", path: at, message }));
};

export const schemaValidate = async (ctx: Ctx): Promise<Out> => {
	const given = ctx.words[1];
	const all = await available(ctx.root);
	const wanted = all.filter((s) =>
		given ? s.name === given : s.source === "project",
	);
	if (given && wanted.length === 0) {
		fail(
			`Schema '${given}' not found\nAvailable schemas: ${all.map((s) => s.name).join(", ")}`,
		);
	}
	const results = await Promise.all(
		wanted.map(async ({ name }) => {
			const dir = (await schemaDir(ctx.root, name)) ?? "";
			const issues = await schemaIssues(dir);
			return { name, path: dir, valid: issues.length === 0, issues };
		}),
	);
	const valid = results.every((r) => r.valid);
	return [
		given ? results[0] : { valid, schemas: results },
		results.flatMap((r) => [
			r.valid
				? `✓ Schema '${r.name}' is valid`
				: `✗ Schema '${r.name}' has errors:`,
			...r.issues.map((i) => `  error: ${i.message}`),
		]),
		valid ? 0 : 1,
	];
};
