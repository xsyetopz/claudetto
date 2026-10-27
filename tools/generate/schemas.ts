// The schemas of `openspec/schemas/`: each preset of the `spec` module with the templates that its `schema.yaml` names, and a header that names each source (spec `repo-tooling`, "Generated Schemas").
// A template comes from the folder of the preset, or else from the shared `templates/` folder, as `templateFile` of the `spec` module finds it.

import { readdir } from "node:fs/promises";
import path from "node:path";
import { file as bunFile, YAML } from "bun";
import { type Page, stale, withHeader } from "./wiki.ts";

const PRESETS = "plugins/claudetto/modules/spec/presets";
const OUT = "openspec/schemas";

/** True when the file `at` exists. */
const exists = (at: string): Promise<boolean> => bunFile(at).exists();

/** The page of the file `source` of `root` at `file`. */
const page = async (root: string, file: string, source: string) => ({
	file,
	source,
	text: withHeader(source, await bunFile(path.join(root, source)).text()),
});

/** The template names that the parsed `schema.yaml` `parsed` lists in its `artifacts`. */
const templatesOf = (parsed: unknown): string[] => {
	if (
		typeof parsed !== "object" ||
		parsed === null ||
		!("artifacts" in parsed) ||
		!Array.isArray(parsed.artifacts)
	) {
		return [];
	}
	return parsed.artifacts.flatMap((a: unknown) =>
		typeof a === "object" &&
		a !== null &&
		"template" in a &&
		typeof a.template === "string"
			? a.template
			: [],
	);
};

/** Each file of `openspec/schemas/` in `root`, from the presets. */
export const schemaPages = async (root: string): Promise<Page[]> => {
	const dir = path.join(root, PRESETS);
	const all = await readdir(dir);
	const has = await Promise.all(
		all.map((n) => exists(path.join(dir, n, "schema.yaml"))),
	);
	const names = all.filter((_n, i) => has[i]).sort();
	const groups = await Promise.all(
		names.map(async (name): Promise<Page[]> => {
			const source = `${PRESETS}/${name}/schema.yaml`;
			const schema = await page(root, `${OUT}/${name}/schema.yaml`, source);
			const templates = templatesOf(
				YAML.parse(await bunFile(path.join(root, source)).text()),
			);
			const rest = await Promise.all(
				templates.map(async (t) => {
					const own = `${PRESETS}/${name}/templates/${t}`;
					const from = (await exists(path.join(root, own)))
						? own
						: `${PRESETS}/templates/${t}`;
					return page(root, `${OUT}/${name}/templates/${t}`, from);
				}),
			);
			return [schema, ...rest];
		}),
	);
	return groups.flat();
};

/** The messages for each file of `openspec/schemas/` in `root` that differs from its preset, and for each file with no preset. */
export const schemaProblems = async (root: string): Promise<string[]> =>
	stale(root, await schemaPages(root), OUT, `${PRESETS}/`);
