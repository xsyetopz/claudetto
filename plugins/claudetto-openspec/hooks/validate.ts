// Validation of one change: delta files against each other and against the main specs.
import { dirname, type Fs, join, statOf, within } from "./fs.ts";
import {
	at,
	blockIssues,
	type Issue,
	type Report,
	report,
	withoutFences,
} from "./spec-rules.ts";
import {
	type Block,
	blocks,
	fold,
	merge,
	missingScenarios,
	norm,
	parsePlan,
	type Plan,
	section,
} from "./spec.ts";
import { type Doc, missingCheckboxes, numberingIssues } from "./tasks.ts";
import { parseYaml } from "./yaml.ts";

export const NO_DELTA = "Change must have at least one delta";

const DELTA_SECTION = /^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements/im;
const NAMELESS = /^requirement:?$/i;
const SKIP_MENTION = /^\s*(['"]?)skip_specs\1\s*:/m;
const EXTENSION_KEY = /^x-\S+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const METADATA_KEYS = new Set([
	"schema",
	"created",
	"goal",
	"affected_areas",
	"initiative",
	"skip_specs",
	"retire_capabilities",
]);
const KINDS = ["added", "modified", "removed", "renamed"] as const;

// A literal backslash in a folder name displays as a slash, as upstream shows it.
const slashed = (parts: string[]) => parts.join("/").replaceAll("\\", "/");

interface Found {
	id: string;
	file: string;
	path: string;
}

const holdsDelta = async (fs: Fs, name: string, full: string) =>
	name !== "spec.md" &&
	name.toLowerCase().endsWith(".md") &&
	(await statOf(fs, full))?.kind === "file" &&
	DELTA_SECTION.test(withoutFences(await fs.read(full)));

// spec.md files below specs/ are deltas keyed by their directory. Any other file is one the merge
// drops: `unread` holds the .md files with a delta section (upstream's list), `stray` the rest
// (#2173). Dot entries and symlinked directories are not followed.
export const discoverDeltas = async (fs: Fs, specsDir: string) => {
	const found: Found[] = [];
	const unread: { path: string; expected: string }[] = [];
	const stray: string[] = [];
	const visit = async (
		e: { name: string; kind: string },
		dir: string,
		segments: string[],
	): Promise<void> => {
		const full = join(dir, e.name);
		if (e.kind === "dir") {
			await walk(full, [...segments, e.name]);
		} else if (e.name === "spec.md" && segments.length > 0) {
			found.push({
				id: slashed(segments),
				file: full,
				path: slashed([...segments, e.name]),
			});
		} else if (await holdsDelta(fs, e.name, full)) {
			const capability =
				segments.length > 0 ? segments.join("/") : e.name.slice(0, -3);
			unread.push({
				path: [...segments, e.name].join("/"),
				expected: `${capability}/spec.md`,
			});
		} else {
			stray.push([...segments, e.name].join("/"));
		}
	};
	const walk = async (dir: string, segments: string[]): Promise<void> => {
		const entries = await fs.list(dir);
		await Promise.all(
			entries
				.filter((e) => !e.name.startsWith("."))
				.map((e) => visit(e, dir, segments)),
		);
	};
	if ((await statOf(fs, specsDir))?.kind === "dir") {
		await walk(specsDir, []);
	}
	const byPath = (x: { path: string }, y: { path: string }) =>
		x.path < y.path ? -1 : 1;
	const byText = (x: string, y: string) => (x < y ? -1 : 1);
	return {
		found: found.sort(byPath),
		unread: unread.sort(byPath),
		stray: stray.sort(byText),
	};
};

export const baseBlocks = async (fs: Fs, mainSpecsDir: string, id: string) => {
	const file = join(mainSpecsDir, id, "spec.md");
	return (await fs.exists(file))
		? blocks(section(await fs.read(file), "Requirements") ?? "")
		: undefined;
};

// A capability directory must be where its id says it is, and a spec.md link must resolve inside
// the specs tree or its own capability directory. Directory links that alias or leave the tree are
// refused here, before any write or delete goes through them.
export const linkEscapes = async (fs: Fs, mainSpecsDir: string, id: string) => {
	const file = join(mainSpecsDir, id, "spec.md");
	const real = async (path: string) =>
		(await fs.stat(path, { resolve: true })).realPath;
	// The nearest existing ancestor of the capability directory must sit at its own path under the real root.
	const anchored = async (path: string, root: string): Promise<boolean> => {
		if (path.length <= mainSpecsDir.length) {
			return true;
		}
		if (await fs.exists(path)) {
			return (await real(path)) === join(root, path.slice(mainSpecsDir.length));
		}
		return anchored(dirname(path), root);
	};
	try {
		const root = await real(mainSpecsDir);
		if (!(root && (await anchored(dirname(file), root)))) {
			return true;
		}
		// `list` sees a dangling link that `stat` cannot follow.
		const entries = await fs.list(dirname(file)).catch(() => []);
		if (!entries.some((e) => e.name === "spec.md" && e.isLink)) {
			return false;
		}
		const [target, own] = await Promise.all([real(file), real(dirname(file))]);
		return !(target && own && (within(root, target) || within(own, target)));
	} catch {
		// No specs tree: nothing to escape. Any other failure to resolve is an escape.
		return fs.exists(mainSpecsDir);
	}
};

type Base = Block[] | "unreadable" | undefined;

const tryBase = async (
	fs: Fs,
	mainSpecsDir: string,
	id: string,
): Promise<Base> => {
	try {
		return await baseBlocks(fs, mainSpecsDir, id);
	} catch {
		return "unreadable";
	}
};

const dupes = (names: string[], where: string, path: string): Issue[] =>
	names
		.filter((n, i) => names.map(norm).indexOf(norm(n)) !== i)
		.map((n) => at(path, "ERROR", `Duplicate requirement in ${where}: "${n}"`));

interface Read {
	raw?: string;
	error?: string;
	missing?: boolean;
}

const readable = async (fs: Fs, file: string): Promise<Read> => {
	if (!(await fs.exists(file))) {
		return { missing: true };
	}
	try {
		return { raw: await fs.read(file) };
	} catch (e) {
		return { error: e instanceof Error ? e.message : String(e) };
	}
};

const isMap = (v: unknown): v is Record<string, unknown> =>
	Boolean(v) && typeof v === "object" && !Array.isArray(v);

const schemaResolves = async (fs: Fs, dir: string, name: string) => {
	if (name === "spec-driven") {
		return true;
	}
	if (name.includes("/")) {
		return false;
	}
	const root = dirname(dirname(dirname(dir)));
	const { raw } = await readable(
		fs,
		join(root, "openspec", "schemas", name, "schema.yaml"),
	);
	const parsed = raw === undefined ? undefined : parseYaml(raw);
	return (
		raw !== undefined &&
		isMap(parsed) &&
		typeof parsed["name"] === "string" &&
		parsed["version"] !== undefined &&
		Array.isArray(parsed["artifacts"])
	);
};

interface Marker {
	on: boolean;
	invalid?: string;
}
interface Meta {
	skip: boolean;
	retire: boolean;
	unknown: string[];
	invalid?: string;
}

// A boolean marker is honored only when the whole metadata file is valid and its schema resolves.
const markerState = async (
	fs: Fs,
	dir: string,
	parsed: Record<string, unknown>,
	key: string,
): Promise<Marker> => {
	const { schema, created } = parsed;
	const value = parsed[key];
	if (value === undefined || value === false) {
		return { on: false };
	}
	const shape =
		value === true &&
		typeof schema === "string" &&
		schema !== "" &&
		(created === undefined ||
			(typeof created === "string" && DATE.test(created)));
	if (!(shape && typeof schema === "string")) {
		return { on: false, invalid: "the metadata does not match the schema" };
	}
	return (await schemaResolves(fs, dir, schema))
		? { on: true }
		: { on: false, invalid: `schema: unknown schema '${schema}'` };
};

const NONE: Meta = { skip: false, retire: false, unknown: [] };

export const metadata = async (fs: Fs, dir: string): Promise<Meta> => {
	const file = await readable(fs, join(dir, ".openspec.yaml"));
	if (file.raw === undefined) {
		return file.missing
			? NONE
			: {
					...NONE,
					invalid: `the metadata file cannot be read (${file.error})`,
				};
	}
	const parsed = parseYaml(file.raw);
	if (parsed === undefined) {
		return {
			...NONE,
			...(SKIP_MENTION.test(file.raw) && {
				invalid: "the file is not valid YAML",
			}),
		};
	}
	if (!isMap(parsed)) {
		return NONE;
	}
	const unknown = Object.keys(parsed)
		.filter((k) => !(METADATA_KEYS.has(k) || EXTENSION_KEY.test(k)))
		.sort((x, y) => (x < y ? -1 : 1));
	const skip = await markerState(fs, dir, parsed, "skip_specs");
	const retire = await markerState(fs, dir, parsed, "retire_capabilities");
	return {
		skip: skip.on,
		retire: retire.on,
		unknown,
		...(skip.invalid && { invalid: skip.invalid }),
	};
};

const hasFileUnder = async (fs: Fs, dir: string): Promise<boolean> => {
	const info = await statOf(fs, dir);
	if (!info) {
		return false;
	}
	if (info.kind !== "dir") {
		return true;
	}
	const entries = await fs.list(dir);
	const hits = await Promise.all(
		entries.map((e) =>
			e.kind === "dir"
				? hasFileUnder(fs, join(dir, e.name))
				: !e.name.startsWith("."),
		),
	);
	return hits.some(Boolean);
};

interface Loaded extends Found {
	plan: Plan;
	base: Base;
}

const load = async (
	fs: Fs,
	mainSpecsDir: string | undefined,
	d: Found,
): Promise<Loaded> => ({
	...d,
	plan: parsePlan(await fs.read(d.file)),
	base: mainSpecsDir ? await tryBase(fs, mainSpecsDir, d.id) : undefined,
});

const noticeIssues = (plan: Plan, path: string): Issue[] => [
	...plan.skipped.map((s) =>
		at(
			path,
			"INFO",
			NAMELESS.test(s.header)
				? `Header "### ${s.header}" is missing a requirement name and is ignored by validation.`
				: `Header "### ${s.header}" is not a "### Requirement:" header and is ignored by validation.`,
		),
	),
	...plan.unpaired.map((u) =>
		at(
			path,
			"ERROR",
			`RENAMED ${u.side}: "${u.name}" has no matching ${u.side === "FROM" ? "TO" : "FROM"}: line.`,
		),
	),
	...plan.orphans.map((o) =>
		at(
			path,
			"WARNING",
			`Requirement "${o}" is outside a delta section, so it is ignored.`,
		),
	),
	...plan.unapplied.map((u) =>
		at(
			path,
			u.section === null ? "WARNING" : "ERROR",
			`${u.section === null ? "Text above the first section" : `Section "${u.section}"`} is not carried into the main spec by archive.`,
		),
	),
];

const conflictIssues = (plan: Plan, path: string): Issue[] => {
	const a = plan.added.map((b) => norm(b.name));
	const m = plan.modified.map((b) => norm(b.name));
	const r = plan.removed.map(norm);
	const both = (x: string[], y: string[], label: string) =>
		x
			.filter((n) => y.includes(n))
			.map((n) =>
				at(path, "ERROR", `Requirement present in both ${label}: "${n}"`),
			);
	return [
		...dupes(
			plan.added.map((b) => b.name),
			"ADDED",
			path,
		),
		...dupes(
			plan.modified.map((b) => b.name),
			"MODIFIED",
			path,
		),
		...dupes(plan.removed, "REMOVED", path),
		...dupes(
			plan.renamed.map((x) => x.from),
			"RENAMED FROM",
			path,
		),
		...dupes(
			plan.renamed.map((x) => x.to),
			"RENAMED TO",
			path,
		),
		...both(m, r, "MODIFIED and REMOVED"),
		...both(m, a, "MODIFIED and ADDED"),
		...both(a, r, "ADDED and REMOVED"),
		...plan.renamed.flatMap(({ from, to }) => [
			...(m.includes(norm(from))
				? [
						at(
							path,
							"ERROR",
							`MODIFIED references old name from RENAMED. Use new header for "${to}"`,
						),
					]
				: []),
			...(a.includes(norm(to))
				? [at(path, "ERROR", `RENAMED TO collides with ADDED for "${to}"`)]
				: []),
			...(r.some((x) => fold(x) === fold(from))
				? [
						at(
							path,
							"ERROR",
							`Requirement present in both RENAMED and REMOVED: "${from}"`,
						),
					]
				: []),
		]),
	];
};

// The base block a MODIFIED one replaces, following RENAMED pairs back to the old name.
const baseFor = (
	base: Block[] | undefined,
	name: string,
	origin: Map<string, string>,
) => {
	const seen = new Set<string>();
	let hit: Block | undefined;
	for (
		let key: string | undefined = name;
		!hit && key !== undefined && !seen.has(key);
		key = origin.get(key)
	) {
		hit = base?.find((x) => norm(x.name) === key);
		seen.add(key);
	}
	return hit;
};

const lossIssues = (
	plan: Plan,
	base: Block[] | undefined,
	path: string,
): Issue[] => {
	const away = new Set(plan.renamed.map((x) => norm(x.from)));
	const origin = new Map(plan.renamed.map((x) => [norm(x.to), norm(x.from)]));
	return plan.modified.flatMap((b) => {
		const current = away.has(norm(b.name))
			? undefined
			: baseFor(base, norm(b.name), origin);
		const lost = current ? missingScenarios(current, b) : [];
		return lost.length > 0
			? [
					at(
						path,
						"ERROR",
						`MODIFIED "${b.name}" omits scenario(s) the current spec still has: ${lost.map((n) => `"${n}"`).join(", ")}`,
					),
				]
			: [];
	});
};

const deltaIssues = ({ id, path, plan, base }: Loaded): Issue[] => [
	...noticeIssues(plan, path),
	...conflictIssues(plan, path),
	...plan.added.flatMap((b) => blockIssues(b, "ADDED", path)),
	...plan.modified.flatMap((b) => blockIssues(b, "MODIFIED", path)),
	...(base === "unreadable"
		? [
				at(
					path,
					"ERROR",
					`Could not read the main spec for ${id} to check the MODIFIED requirements against it.`,
				),
			]
		: lossIssues(plan, base, path)),
];

const countOf = (plan: Plan) =>
	plan.added.length +
	plan.modified.length +
	plan.removed.length +
	plan.renamed.length;
const sectionsOf = (plan: Plan) =>
	KINDS.filter((k) => plan.present[k]).map(
		(k) => `## ${k.toUpperCase()} Requirements`,
	);

// Same merge as archive, so what archive would refuse fails here (upstream reports INFO).
const refusalIssues = async (
	fs: Fs,
	deltas: Loaded[],
	reported: Set<string>,
	mainSpecsDir: string,
): Promise<Issue[]> => {
	const escapes = await Promise.all(
		deltas.map((d) => linkEscapes(fs, mainSpecsDir, d.id)),
	);
	if (escapes.some(Boolean)) {
		return [
			at(
				"specs",
				"INFO",
				"Could not check archive merge conflicts: a main spec link resolves outside the allowed directory",
			),
		];
	}
	return deltas.flatMap((d) =>
		reported.has(d.path) || d.base === "unreadable"
			? []
			: merge(d.base, d.plan).failures.map((f) =>
					at(d.path, "ERROR", `Archive would refuse this delta: ${f.message}`),
				),
	);
};

const zeroDeltaIssues = (meta: Meta, filled: boolean): Issue[] => {
	if (!meta.skip) {
		return [at("file", "ERROR", NO_DELTA)];
	}
	return filled
		? []
		: [at("file", "INFO", "skip_specs is set: zero deltas accepted")];
};

const metaIssues = async (
	fs: Fs,
	dir: string,
	empty: boolean,
): Promise<Issue[]> => {
	const meta = await metadata(fs, dir);
	const filled = meta.skip && (await hasFileUnder(fs, join(dir, "specs")));
	return [
		...(meta.invalid
			? [
					at(
						".openspec.yaml",
						"ERROR",
						`skip_specs is set but .openspec.yaml is not valid change metadata (${meta.invalid})`,
					),
				]
			: []),
		...(meta.unknown.length > 0
			? [
					at(
						".openspec.yaml",
						"WARNING",
						`Unrecognized key name(s) in .openspec.yaml: ${meta.unknown.join(", ")}`,
					),
				]
			: []),
		...(filled
			? [
					at(
						"file",
						"ERROR",
						"skip_specs is set but spec files exist under specs/.",
					),
				]
			: []),
		...(empty ? zeroDeltaIssues(meta, filled) : []),
	];
};

export const validateDir = async (
	fs: Fs,
	dir: string,
	mainSpecsDir: string | undefined,
	strict: boolean,
): Promise<Report> => {
	const specsDir = join(dir, "specs");
	const { found, unread, stray } = await discoverDeltas(fs, specsDir);
	const deltas = await Promise.all(found.map((d) => load(fs, mainSpecsDir, d)));
	const rootSpec =
		(await statOf(fs, join(specsDir, "spec.md")))?.kind === "file";
	const issues = [
		...(rootSpec
			? [
					at(
						"spec.md",
						"ERROR",
						"Delta spec found at specs/spec.md. Delta specs must live under a capability path",
					),
				]
			: []),
		...deltas.flatMap(deltaIssues),
	];
	const hollow = deltas.filter((d) => countOf(d.plan) === 0);
	const reported = new Set([
		...issues.filter((i) => i.level === "ERROR").map((i) => i.path),
		...hollow.map((d) => d.path),
	]);
	const noDeltas = !deltas.some((d) => countOf(d.plan) > 0);
	return report(
		[
			...issues,
			...(mainSpecsDir
				? await refusalIssues(fs, deltas, reported, mainSpecsDir)
				: []),
			...unread.map((u) =>
				at(
					u.path,
					"ERROR",
					`Delta spec found at specs/${u.path}. Move its requirements into specs/${u.expected}.`,
				),
			),
			...stray.map((path) =>
				at(
					path,
					"ERROR",
					`specs/${path} is not merged: only specs/<capability>/spec.md is. Move or remove it.`,
				),
			),
			...hollow.map((d) => {
				const sections = sectionsOf(d.plan);
				return at(
					d.path,
					"ERROR",
					sections.length > 0
						? `Delta sections ${sections.join(", ")} were found, but no requirement entries parsed.`
						: "No delta sections found.",
				);
			}),
			...(await metaIssues(
				fs,
				dir,
				noDeltas && !rootSpec && unread.length === 0,
			)),
		],
		strict,
	);
};

export const changeDir = (root: string, name: string) =>
	join(root, "openspec", "changes", name);

const ROOT_MARKERS = [".openspec.yaml", "proposal.md", "tasks.md", "design.md"];
const visible = async (fs: Fs, dir: string) =>
	(await fs.list(dir).catch(() => [])).filter((e) => !e.name.startsWith("."));

const looksLikeChange = async (fs: Fs, dir: string) => {
	const names = new Set((await fs.list(dir).catch(() => [])).map((e) => e.name));
	const d = await discoverDeltas(fs, join(dir, "specs"));
	return (
		ROOT_MARKERS.some((m) => names.has(m)) ||
		d.found.length + d.unread.length + d.stray.length > 0
	);
};

const changesWithin = async (
	fs: Fs,
	dir: string,
	prefix: string,
	depth: number,
): Promise<string[]> => {
	const dirs = (await visible(fs, dir)).filter((e) => e.kind === "dir");
	const nested = await Promise.all(
		dirs.map(async (e) => {
			const id = `${prefix}/${e.name}`;
			if (await looksLikeChange(fs, join(dir, e.name))) {
				return [id];
			}
			return depth < 3
				? changesWithin(fs, join(dir, e.name), id, depth + 1)
				: [];
		}),
	);
	return nested.flat().sort();
};

// Upstream's namespace-folder rule (#1846): a directory under changes/ that is no change (no root
// artifact, no delta file) and holds only directories, with changes within three levels below,
// wraps changes. Returns those paths relative to changes/.
export const nestedChanges = async (fs: Fs, dir: string, name: string) =>
	name === "archive" ||
	(await looksLikeChange(fs, dir)) ||
	(await visible(fs, dir)).some((e) => e.kind !== "dir")
		? []
		: changesWithin(fs, dir, name, 1);

// The delta check plus the tasks.md rules upstream reports as warnings.
export const validateChange = async (
	fs: Fs,
	root: string,
	name: string,
	strict: boolean,
): Promise<Report> => {
	const dir = changeDir(root, name);
	const deltas = await validateDir(
		fs,
		dir,
		join(root, "openspec", "specs"),
		strict,
	);
	const path = join(dir, "tasks.md");
	const docs: Doc[] = (await fs.exists(path))
		? [{ path: "tasks.md", content: await fs.read(path) }]
		: [];
	const warnings = [...missingCheckboxes(docs), ...numberingIssues(docs)].map(
		(i) => at(`${i.path}:${i.line}`, "WARNING", i.message),
	);
	return report([...deltas.issues, ...warnings], strict);
};

export const issueKey = (i: Issue) => `${i.level}|${i.path}`;
