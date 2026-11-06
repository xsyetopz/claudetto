import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const KINDS_DIR = join(import.meta.dir, "kinds");
const PLUGIN_BASE = "plugin";
const TPL = ".tpl";
// `{{name}}` inserts the value as it is; `{{json name}}` inserts it as a JSON string, quotes included, which is also a valid YAML and TypeScript string.
const PLACEHOLDER = /\{\{\s*(json\s+)?([A-Za-z]\w*)\s*\}\}/g;

export const PLUGIN_KINDS = [
	"classic-hook",
	"mod-hook",
	"output-style",
	"agent",
	"skill",
	"command",
	"mcp-tool",
] as const;
export const KINDS = [...PLUGIN_KINDS, "settings", "probe"] as const;
export type Kind = (typeof KINDS)[number];

export const isKind = (name: string): name is Kind => (KINDS as readonly string[]).includes(name);

export const placeholders = (template: string): string[] => [
	...new Set([...template.matchAll(PLACEHOLDER)].map((m) => m[2] as string)),
];

export const render = (template: string, vars: Record<string, string>): string => {
	const unset = placeholders(template).filter((name) => vars[name] === undefined);
	if (unset.length > 0) {
		throw new Error(`unset variables: ${unset.join(", ")}`);
	}
	return template.replace(PLACEHOLDER, (_m, json: string | undefined, name: string) => {
		const value = vars[name] as string;
		return json ? JSON.stringify(value) : value;
	});
};

export const variables = async (kind: Kind): Promise<string[]> => {
	const found = new Set<string>();
	for (const t of await templatesOf(kind)) {
		for (const name of [...placeholders(t.path), ...placeholders(await Bun.file(t.file).text())]) {
			found.add(name);
		}
	}
	return [...found].sort();
};

// Writes nothing when a variable is unset or a target file exists, so a render never half-overwrites a folder.
export const renderKind = async (kind: Kind, vars: Record<string, string>, outDir: string): Promise<string[]> => {
	const unset = (await variables(kind)).filter((name) => vars[name] === undefined);
	if (unset.length > 0) {
		throw new Error(`${kind}: unset variables: ${unset.join(", ")}`);
	}
	const files = await Promise.all(
		(await templatesOf(kind)).map(async (t) => ({
			path: join(outDir, render(t.path, vars)),
			text: render(await Bun.file(t.file).text(), vars),
		})),
	);
	const existing = (await Promise.all(files.map(async (f) => ((await exists(f.path)) ? f.path : undefined)))).filter(
		(p) => p !== undefined,
	);
	if (existing.length > 0) {
		throw new Error(`${kind}: files exist: ${existing.join(", ")}`);
	}
	for (const f of files) {
		await mkdir(dirname(f.path), { recursive: true });
		await writeFile(f.path, f.text, { flag: "wx" });
	}
	return files.map((f) => f.path);
};

const templatesOf = async (kind: Kind): Promise<{ path: string; file: string }[]> => {
	const roots = (PLUGIN_KINDS as readonly string[]).includes(kind) ? [PLUGIN_BASE, kind] : [kind];
	const all = await Promise.all(
		roots.map(async (root) => {
			const dir = join(KINDS_DIR, root);
			return (await readdir(dir, { recursive: true, withFileTypes: true }))
				.filter((e) => e.isFile() && e.name.endsWith(TPL))
				.map((e) => {
					const file = join(e.parentPath, e.name);
					return { path: relative(dir, file).slice(0, -TPL.length), file };
				});
		}),
	);
	return all.flat().sort((a, b) => a.path.localeCompare(b.path));
};

const exists = (path: string): Promise<boolean> =>
	access(path).then(
		() => true,
		() => false,
	);
