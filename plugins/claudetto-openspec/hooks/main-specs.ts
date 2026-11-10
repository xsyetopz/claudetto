import { type Fs, join } from "./fs.ts";
import { type Report, validateSpec } from "./spec-rules.ts";
import { blocks, section } from "./spec.ts";
import { requirementPath } from "./texts.ts";
import { discoverDeltas } from "./validate.ts";

// The rules number requirements by position; a main spec's report names them instead.
const INDEX = /^requirements(?:\[(\d+)\]|\.(\d+))/;

const requirementNames = (md: string) =>
	blocks(section(md, "Requirements") ?? "").map((b) => b.name);

export const mainSpecs = async (fs: Fs, root: string) => {
	const { found } = await discoverDeltas(fs, join(root, "openspec", "specs"));
	return Promise.all(
		found.map(async (f) => ({ id: f.id, md: await fs.read(f.file) })),
	);
};

export const requirementCount = (md: string) => requirementNames(md).length;

export const checkSpec = (md: string): Report => {
	const names = requirementNames(md);
	const report = validateSpec(md, true);
	return {
		...report,
		issues: report.issues.map((i) => {
			const m = INDEX.exec(i.path);
			const name = m ? names[Number(m[1] ?? m[2])] : undefined;
			return name === undefined ? i : { ...i, path: requirementPath(name) };
		}),
	};
};
