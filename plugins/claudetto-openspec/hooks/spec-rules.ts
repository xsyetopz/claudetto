// Rules for one spec: its heading structure, purpose, and each requirement block. No file access.
import {
	type Block,
	blocks,
	fenceMask,
	norm,
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
const MAX_REQUIREMENT = 500;
const PLACEHOLDER =
	/TBD - created by archiving change [\s\S]*\. Update Purpose after archive\./;
const MARKER = /^(?:TBD|TODO)(?![\p{L}\p{N}\p{M}_])/u;
const MARKER_SOFT =
	/^(?:TBD|TODO)(?![\p{L}\p{N}\p{M}_])(?=[ \t]*(?:$|\n|[:\-–—.,;()[\]{}]))/iu;
const TRIGGER = /(?:\*\*|__)(?:WHEN|GIVEN):?(?:\*\*|__)|\b(?:WHEN|GIVEN)\b/i;
const OUTCOME = /(?:\*\*|__)THEN:?(?:\*\*|__)|\bTHEN\b/i;
const BARE_TRIGGER = /\b(?:WHEN|GIVEN)\b/;
const BARE_OUTCOME = /\bTHEN\b/;
const KEYWORD = /\b(SHALL|MUST)\b/;
const BOM = /^﻿/;
const LINE_BREAK = /\r\n?/g;
const HEADING = /^(#{1,6})\s+(.+)$/;
const HEADING_START = /^(#{1,6})\s+/;
const HEADING_MARKS = /^(#{1,6})/;
const REQUIREMENTS_H2 = /^##\s+Requirements\s*$/i;
const ANY_H2 = /^##\s+/;
const DELTA_HEADER =
	/^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/i;
const REQUIREMENT_H3 = /^###\s*Requirement:\s*(.+)\s*$/i;

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
export const lineBreaks = (md: string) =>
	md.replace(BOM, "").replace(LINE_BREAK, "\n");

export const withoutFences = (md: string) => {
	const lines = lineBreaks(md).split("\n");
	const mask = fenceMask(lines);
	return lines.filter((_, i) => !mask[i]).join("\n");
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
		const live = body.filter((_, i) => !mask[i]);
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

interface Node {
	level: number;
	title: string;
	content: string;
	children: Node[];
}

// A node owns the text up to the next heading of its level or higher.
const nodeEnd = (
	lines: string[],
	mask: boolean[],
	from: number,
	level: number,
) => {
	let end = from + 1;
	while (
		end < lines.length &&
		(mask[end] || !closes(lines[end] ?? "", level))
	) {
		end++;
	}
	return end;
};
const closes = (line: string, level: number) =>
	HEADING_START.test(line) &&
	(HEADING_MARKS.exec(line)?.[1]?.length ?? 0) <= level;

const tree = (md: string): Node[] => {
	const lines = lineBreaks(md).split("\n");
	const mask = fenceMask(lines);
	const roots: Node[] = [];
	const stack: Node[] = [];
	for (const [i, line] of lines.entries()) {
		const m = mask[i] ? null : HEADING.exec(line);
		if (!m) {
			continue;
		}
		const level = m[1]?.length ?? 1;
		const node: Node = {
			level,
			title: (m[2] ?? "").trim(),
			content: lines
				.slice(i + 1, nodeEnd(lines, mask, i, level))
				.join("\n")
				.trim(),
			children: [],
		};
		while ((stack.at(-1)?.level ?? 0) >= level && stack.length > 0) {
			stack.pop();
		}
		(stack.at(-1)?.children ?? roots).push(node);
		stack.push(node);
	}
	return roots;
};

const find = (nodes: Node[], title: string): Node | undefined => {
	for (const n of nodes) {
		const hit =
			n.title.toLowerCase() === title.toLowerCase()
				? n
				: find(n.children, title);
		if (hit) {
			return hit;
		}
	}
	return undefined;
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
	const lines = raw.map((l, i) => (mask[i] ? "" : l));
	const start = lines.findIndex((l) => REQUIREMENTS_H2.test(l));
	const next =
		start < 0 ? -1 : lines.findIndex((l, i) => i > start && ANY_H2.test(l));
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
		.filter((_, i) => !mask[i])
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
		...blocks(section(md, "Requirements") ?? "").flatMap(blockRules),
	];
	return report(issues, strict);
};
