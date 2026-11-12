// Rules for one spec: its heading structure, purpose, and each requirement block. No file access.
import {
	type Block,
	fenceMask,
	lineBreaks,
	masked,
	norm,
} from "./spec-lines.ts";
import { find, type Node, tree } from "./spec-tree.ts";
import {
	blocks,
	requirementText,
	scenarioBodies,
	scenarios,
	section,
} from "./spec.ts";

export interface Issue {
	level: "ERROR" | "WARNING" | "INFO";
	path: string;
	message: string;
}
export interface Report {
	valid: boolean;
	issues: Issue[];
}

const MIN_PURPOSE = 50;
export const MAX_REQUIREMENT = 500;
const PLACEHOLDER =
	/TBD - created by archiving change [\s\S]*\. Update Purpose after archive\./u;
const MARKER = /^(?:TBD|TODO)(?![\p{L}\p{N}\p{M}_])/u;
const MARKER_SOFT =
	/^(?:TBD|TODO)(?![\p{L}\p{N}\p{M}_])(?=[ \t]*(?:$|\n|[:\-–—.,;()[\]{}]))/iu;
const TRIGGER = /(?:\*\*|__)(?:WHEN|GIVEN):?(?:\*\*|__)|\b(?:WHEN|GIVEN)\b/iu;
const OUTCOME = /(?:\*\*|__)THEN:?(?:\*\*|__)|\bTHEN\b/iu;
const BARE_TRIGGER = /\b(?:WHEN|GIVEN)\b/u;
const BARE_OUTCOME = /\bTHEN\b/u;
const KEYWORD = /\b(SHALL|MUST)\b/u;
const REQUIREMENTS_H2 = /^##\s+Requirements\s*$/iu;
const ANY_H2 = /^##\s+/u;
const DELTA_HEADER =
	/^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/iu;
const REQUIREMENT_H3 = /^###\s*Requirement:\s*(.+)\s*$/iu;

export const report = (issues: Issue[], strict: boolean): Report => ({
	valid: !issues.some(
		(i) => i.level === "ERROR" || (strict && i.level === "WARNING"),
	),
	issues,
});
export const at = (
	path: string,
	level: Issue["level"],
	message: string,
): Issue => ({ level, path, message });

export const hasKeyword = (text: string) => KEYWORD.test(text);

export const withoutFences = (md: string) => {
	const lines = lineBreaks(md).split("\n");
	const mask = fenceMask(lines);
	return lines.filter((_, i) => !masked(mask, i)).join("\n");
};

const missingKeyword = (prefix: string, name: string, soft: boolean) => {
	const base = `${prefix} ${soft ? "should" : "must"} contain SHALL or MUST`;
	return hasKeyword(name)
		? `${base} in the requirement body, not only in the header. Move the SHALL/MUST statement to the line immediately after the "### Requirement: ..." header.`
		: base;
};

// Steps count outside fences; a scenario needs a trigger and an outcome.
const stepIssues = (raw: string, label: string, path: string): Issue[] =>
	scenarios(raw).flatMap((s) => {
		const body = s.raw.split("\n").slice(1);
		const mask = fenceMask(s.raw.split("\n")).slice(1);
		const live = body.filter((_, i) => !masked(mask, i));
		if (!(body.join("").trim() && s.labeled)) {
			return [];
		}
		const trigger = live.some((l) => TRIGGER.test(l) || BARE_TRIGGER.test(l));
		const outcome = live.some((l) => OUTCOME.test(l) || BARE_OUTCOME.test(l));
		if (trigger && outcome) {
			return [];
		}
		const missing = [!trigger && "a WHEN/GIVEN step", !outcome && "a THEN step"]
			.filter(Boolean)
			.join(" and ");
		return [
			at(
				path,
				"WARNING",
				`${label}: scenario "${s.name}" is missing ${missing}.`,
			),
		];
	});

const bodiesOf = (raw: string) => scenarioBodies(raw.split("\n").slice(1));

const textIssues = (text: string, name: string, tag: string, path: string) => {
	if (!text) {
		return [
			at(
				path,
				"ERROR",
				hasKeyword(name)
					? missingKeyword(tag, name, false)
					: `${tag} is missing requirement text`,
			),
		];
	}
	return hasKeyword(text)
		? []
		: [at(path, "WARNING", missingKeyword(tag, name, true))];
};

export const blockIssues = (
	b: Block,
	label: "ADDED" | "MODIFIED",
	path: string,
): Issue[] => {
	const text = requirementText(b.raw);
	const tag = `${label} "${b.name}"`;
	const bodies = bodiesOf(b.raw);
	const out = textIssues(text, b.name, tag, path);
	if (label === "ADDED" && text.length > MAX_REQUIREMENT) {
		out.push(
			at(
				path,
				"WARNING",
				`${tag}: Requirement text is very long (>${MAX_REQUIREMENT} characters). Move examples and edge cases into scenarios, or split it into separate requirements that each state one behavior.`,
			),
		);
	}
	if (!bodies.some((x) => x.trim())) {
		const empty = bodies.length > 0;
		out.push(
			at(
				path,
				"ERROR",
				`${tag} must include at least one scenario${empty ? " (a scenario header with no body under it does not count)" : ""}`,
			),
		);
	}
	return [...out, ...stepIssues(b.raw, tag, path)];
};

interface Region {
	start: number;
	end: number;
	seen: Set<string>;
}

const lineIssues = (line: string, i: number, r: Region): Issue[] => {
	const t = line.trim();
	const req = REQUIREMENT_H3.exec(line);
	if (DELTA_HEADER.test(line)) {
		return [at("file", "ERROR", `Main spec contains delta header "${t}".`)];
	}
	if (!req) {
		return [];
	}
	if (!(r.start >= 0 && i > r.start && i < r.end)) {
		return [
			at(
				"file",
				"ERROR",
				`Requirement header "${t}" appears outside the main ## Requirements section.`,
			),
		];
	}
	const key = norm(req[1] ?? "");
	if (r.seen.has(key)) {
		return [
			at(
				"file",
				"ERROR",
				`Requirement header "${t}" duplicates an earlier requirement.`,
			),
		];
	}
	r.seen.add(key);
	return [];
};

const structureIssues = (md: string): Issue[] => {
	const raw = lineBreaks(md).split("\n");
	const mask = fenceMask(raw);
	const lines = raw.map((l, i) => (masked(mask, i) ? "" : l));
	const start = lines.findIndex((l) => REQUIREMENTS_H2.test(l));
	const next =
		start === -1 ? -1 : lines.findIndex((l, i) => i > start && ANY_H2.test(l));
	const region: Region = {
		start,
		end: next < 0 ? lines.length : next,
		seen: new Set(),
	};
	return lines.flatMap((line, i) => lineIssues(line, i, region));
};

const isPlaceholder = (purpose: string) => {
	const lines = purpose.split("\n");
	const mask = fenceMask(lines);
	const prose = lines
		.filter((_, i) => !masked(mask, i))
		.join("\n")
		.trim();
	return (
		MARKER.test(prose) || MARKER_SOFT.test(prose) || PLACEHOLDER.test(prose)
	);
};

const purposeIssues = (purpose: string): Issue[] => {
	if (isPlaceholder(purpose)) {
		return [
			at("overview", "WARNING", "Purpose section is still a placeholder"),
		];
	}
	return purpose.length < MIN_PURPOSE
		? [
				at(
					"overview",
					"WARNING",
					`Purpose section is too brief (less than ${MIN_PURPOSE} characters)`,
				),
			]
		: [];
};

const childIssues = (child: Node, i: number): Issue[] => {
	const text =
		requirementText(`${child.title}\n${child.content}`) || child.title;
	const live = child.children.filter((c) => c.content.trim()).length;
	const message = "Requirement must have at least one scenario";
	return [
		...(text.length > MAX_REQUIREMENT
			? [at(`requirements[${i}]`, "WARNING", "Requirement text is very long")]
			: []),
		...(live === 0
			? [
					at(`requirements.${i}.scenarios`, "ERROR", message),
					at(`requirements[${i}].scenarios`, "WARNING", message),
				]
			: []),
	];
};

const blockRules = (b: Block, i: number): Issue[] => {
	const tag = `Requirement "${b.name}"`;
	const path = `requirements[${i}]`;
	return [
		...textIssues(requirementText(b.raw), b.name, tag, path),
		...stepIssues(b.raw, tag, `${path}.scenarios`),
	];
};

export const validateSpec = (md: string, strict: boolean): Report => {
	const roots = tree(md);
	const purpose = find(roots, "Purpose")?.content ?? "";
	const reqs = find(roots, "Requirements");
	if (!(purpose && reqs)) {
		const what = purpose ? "Requirements" : "Purpose";
		return report(
			[at("file", "ERROR", `Spec must have a ${what} section`)],
			strict,
		);
	}
	const issues = [
		...(reqs.children.length === 0
			? [at("requirements", "ERROR", "Spec must have at least one requirement")]
			: []),
		...structureIssues(md),
		...purposeIssues(purpose),
		...reqs.children.flatMap(childIssues),
		...blocks(section(md, "Requirements") ?? "").flatMap((item, index) =>
			blockRules(item, index),
		),
	];
	return report(issues, strict);
};
