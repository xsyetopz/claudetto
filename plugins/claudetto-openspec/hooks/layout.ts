import { type Fs, join } from "./fs.ts";
import { archivedChanges } from "./status.ts";
import { laidOut, notKebab, opened, SET_UP, taken } from "./texts.ts";
import { changeDir } from "./validate.ts";

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ARCHIVED = /^\d{4}-\d{2}-\d{2}-(.+)$/;
const LAYOUT = [
	["config.yaml", "schema: spec-driven\n"],
	["specs/.gitkeep", ""],
	["changes/archive/.gitkeep", ""],
] as const;

export const init = async (fs: Fs, root: string) => {
	const dir = join(root, "openspec");
	if (await fs.exists(join(dir, "config.yaml"))) {
		return SET_UP;
	}
	const present = await Promise.all(
		LAYOUT.map(([file]) => fs.exists(join(dir, file))),
	);
	const missing = LAYOUT.filter((_, i) => !present[i]);
	await Promise.all(
		missing.map(([file, text]) => fs.write(join(dir, file), text)),
	);
	return laidOut(missing.map(([file]) => `openspec/${file}`));
};

export const create = async (
	fs: Fs,
	root: string,
	name: string,
	date: string,
) => {
	if (!KEBAB.test(name)) {
		return notKebab(name);
	}
	if (await fs.exists(changeDir(root, name))) {
		return taken(name, name);
	}
	const old = (await archivedChanges(fs, root)).find(
		(f) => ARCHIVED.exec(f)?.[1] === name,
	);
	if (old !== undefined) {
		return taken(name, `archive/${old}`);
	}
	const file = join(changeDir(root, name), ".openspec.yaml");
	await fs.write(file, `schema: spec-driven\ncreated: ${date}\n`);
	return opened(`openspec/changes/${name}/.openspec.yaml`);
};
