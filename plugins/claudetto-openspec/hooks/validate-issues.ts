import { type Block, fold, norm } from "./spec-lines.ts";
import { missingScenarios } from "./spec-merge.ts";
import type { Plan } from "./spec-plan.ts";
// The issues of one delta file: notices, conflicts inside it, and scenarios a MODIFIED block would lose.
import { at, blockIssues, type Issue, MAX_REQUIREMENT } from "./spec-rules.ts";
import { requirementText } from "./spec.ts";
import type { Found } from "./validate-discover.ts";

const NAMELESS = /^requirement:?$/iu;

export type Base = Block[] | "unreadable" | undefined;

export interface Loaded extends Found {
	plan: Plan;
	base: Base;
}

const dupes = (names: string[], where: string, path: string): Issue[] =>
	names
		.filter((n, i) => names.map((item) => norm(item)).indexOf(norm(n)) !== i)
		.map((n) => at(path, "ERROR", `Duplicate requirement in ${where}: "${n}"`));

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

const dupeIssues = (plan: Plan, path: string): Issue[] => [
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
		...dupeIssues(plan, path),
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

// Each MODIFIED block with the main-spec block it replaces, if any.
const pairs = (plan: Plan, base: Block[] | undefined) => {
	const away = new Set(plan.renamed.map((x) => norm(x.from)));
	const origin = new Map(plan.renamed.map((x) => [norm(x.to), norm(x.from)]));
	return plan.modified.map(
		(b) =>
			[
				b,
				away.has(norm(b.name))
					? undefined
					: baseFor(base, norm(b.name), origin),
			] as const,
	);
};

const lossIssues = (
	plan: Plan,
	base: Block[] | undefined,
	path: string,
): Issue[] =>
	pairs(plan, base).flatMap(([b, current]) => {
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

// A MODIFIED text over the limit that the main spec's text is within: archive would merge it into a spec whose check warns.
const growIssues = (
	plan: Plan,
	base: Block[] | undefined,
	path: string,
): Issue[] =>
	pairs(plan, base).flatMap(([b, current]) =>
		current &&
		requirementText(b.raw).length > MAX_REQUIREMENT &&
		requirementText(current.raw).length <= MAX_REQUIREMENT
			? [
					at(
						path,
						"WARNING",
						`MODIFIED "${b.name}": Requirement text grows past ${MAX_REQUIREMENT} characters. Move examples and edge cases into scenarios, or split it into separate requirements that each state one behavior.`,
					),
				]
			: [],
	);

export const deltaIssues = ({ id, path, plan, base }: Loaded): Issue[] => [
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
		: [...lossIssues(plan, base, path), ...growIssues(plan, base, path)]),
];
