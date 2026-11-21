import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// Loads and applies the claudetto-spec eval graders for the sample tests (ADR-0193 rule 3).

export const evalsDir = join(
	import.meta.dir,
	"..",
	"..",
	"plugins",
	"claudetto-spec",
	"evals"
);

export interface Grader {
	flags: string;
	match: string;
	path: string;
	pattern: string;
	type: string;
}

export interface Sample {
	bad: string;
	good: string;
}

function text(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function toGrader(front: unknown): Grader {
	const fields = new Map(Object.entries(front ?? {}));
	const target: unknown = fields.get("target");
	const path =
		typeof target === "object" && target !== null
			? text(new Map<string, unknown>(Object.entries(target)).get("path"))
			: "";
	return {
		flags: text(fields.get("flags")),
		match: text(fields.get("match")),
		path,
		pattern: text(fields.get("pattern")),
		type: text(fields.get("type"))
	};
}

async function readGrader(
	dir: string,
	file: string
): Promise<[string, Grader]> {
	const body = await readFile(join(dir, file), "utf8");
	const front = /^---\n(?<yaml>[\s\S]*?)\n---/u.exec(body)?.groups?.["yaml"];
	return [file.replace(/\.md$/u, ""), toGrader(Bun.YAML.parse(front ?? ""))];
}

/** Loads the graders of every case under `root`, or only of the cases named in `only`. */
export async function loadGraders(
	root: string = evalsDir,
	only?: readonly string[]
): Promise<Map<string, Grader>> {
	const all = await readdir(root, { withFileTypes: true });
	const entries = all.filter(
		(entry) => only === undefined || only.includes(entry.name)
	);
	// A case is a folder with a case.yaml; `results/` holds run output, not a case.
	const flags = await Promise.all(
		entries.map(
			async (entry) =>
				entry.isDirectory() &&
				(await Bun.file(join(root, entry.name, "case.yaml")).exists())
		)
	);
	const cases = entries.filter((_, i) => flags[i] === true);
	const perCase = await Promise.all(
		cases.map(async (entry) => {
			const dir = join(root, entry.name, "graders");
			const names = await readdir(dir);
			const files = names.filter((f) => f.endsWith(".md"));
			const pairs = await Promise.all(files.map((f) => readGrader(dir, f)));
			return pairs.map(([name, grader]): [string, Grader] => [
				`${entry.name}/${name}`,
				grader
			]);
		})
	);
	return new Map(perCase.flat());
}

/** Applies a regex grader the way the docs define `match`: JavaScript regex, only the grader's own flags. */
export function passes(grader: Grader, sample: string): boolean {
	const exact = /^count:(?<n>\d+)$/u.exec(grader.match)?.groups?.["n"];
	if (exact !== undefined) {
		const all = new RegExp(grader.pattern, `${grader.flags}g`);
		return [...sample.matchAll(all)].length === Number(exact);
	}
	const found = new RegExp(grader.pattern, grader.flags).test(sample);
	return grader.match === "not_contains" ? !found : found;
}
