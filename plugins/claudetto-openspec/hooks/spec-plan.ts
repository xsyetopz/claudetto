// A delta spec read as a plan: the blocks to add or modify, the names to remove or rename, and the text a merge would drop.
import {
	type Block,
	fenceMask,
	lineBreaks,
	masked,
	norm,
} from "./spec-lines.ts";
import { type Body, parseBlocks, REQ, TOP, topSections } from "./spec.ts";

export interface Plan {
	added: Block[];
	modified: Block[];
	removed: string[];
	renamed: { from: string; to: string }[];
	unpaired: { side: "FROM" | "TO"; name: string }[];
	skipped: { header: string }[];
	orphans: string[];
	unapplied: { section: string | null }[];
	present: Record<"added" | "modified" | "removed" | "renamed", boolean>;
}

const H3_PREFIX = /^###\s/u;
const H1 = /^#\s/u;
const COMMENT = /<!--[\s\S]*?(?:--!?>|$)/gu;
const NOT_NEWLINE = /[^\n]/gu;
const REMOVED_BULLET = /^\s*[-*+]\s*`?###\s*Requirement:\s*(.+?)`?\s*$/u;
const RENAME_LINE =
	/^\s*[-*+]?\s*(FROM|TO):\s*`?###\s*Requirement:\s*(.+?)`?\s*$/u;
const DELTA_TITLES = new Set(
	["added", "modified", "removed", "renamed"].map((k) => `${k} requirements`),
);
const KINDS = ["added", "modified", "removed", "renamed"] as const;

const removedNames = (body: Body) =>
	body.lines.flatMap((line, i) => {
		const m = masked(body.mask, i)
			? null
			: (REQ.exec(line) ?? REMOVED_BULLET.exec(line));
		return m ? [norm(m[1] ?? "")] : [];
	});

const renamedPairs = (body: Body, plan: Plan) => {
	let pending: string | undefined;
	for (const [i, line] of body.lines.entries()) {
		const m = masked(body.mask, i) ? null : RENAME_LINE.exec(line);
		if (!m) {
			continue;
		}
		const name = norm(m[2] ?? "");
		if (m[1] === "FROM") {
			if (pending !== undefined) {
				plan.unpaired.push({ side: "FROM", name: pending });
			}
			pending = name;
		} else if (pending === undefined) {
			plan.unpaired.push({ side: "TO", name });
		} else {
			plan.renamed.push({ from: pending, to: name });
			pending = undefined;
		}
	}
	if (pending !== undefined) {
		plan.unpaired.push({ side: "FROM", name: pending });
	}
};

const visibleLines = (lines: string[], mask: boolean[]) =>
	lines
		.map((l, i) => (masked(mask, i) ? "" : l))
		.join("\n")
		.replaceAll(COMMENT, (m) => m.replaceAll(NOT_NEWLINE, " "))
		.split("\n")
		.map((l, i) => (masked(mask, i) ? (lines[i] ?? "") : l));

const hasText = (visible: string[], from: number, to: number, skip?: RegExp) =>
	visible
		.slice(from, to)
		.some((l) => l.trim() !== "" && skip?.test(l) !== true);

const sectionUnapplied = (
	visible: string[],
	{ title, body }: { title: string; body: Body },
) => {
	const folded = title.toLowerCase();
	const start = body.start - 1;
	if (folded === "added requirements" || folded === "modified requirements") {
		const first = body.lines.findIndex(
			(l, i) => !masked(body.mask, i) && REQ.test(l),
		);
		return hasText(
			visible,
			start,
			start + (first === -1 ? body.lines.length : first),
			H3_PREFIX,
		);
	}
	if (
		DELTA_TITLES.has(folded) ||
		(folded === "purpose" && (visible[start - 1]?.trim() ?? "") !== "")
	) {
		return false;
	}
	return hasText(visible, start, start + body.lines.length);
};

// Non-blank text outside comments that the merge would drop: above the first "## ", in a
// non-delta section, or before the first requirement of ADDED/MODIFIED.
const unappliedContent = (
	lines: string[],
	mask: boolean[],
	secs: ReturnType<typeof topSections>,
) => {
	const visible = visibleLines(lines, mask);
	const out: Plan["unapplied"] = [];
	if (
		hasText(visible, 0, secs[0] ? secs[0].body.start - 2 : lines.length, H1)
	) {
		out.push({ section: null });
	}
	for (const sec of secs) {
		if (sectionUnapplied(visible, sec)) {
			out.push({ section: sec.title });
		}
	}
	return out;
};

const orphanNames = (lines: string[], mask: boolean[]) => {
	const names: string[] = [];
	let heading: string | null = null;
	for (const [i, line] of lines.entries()) {
		if (masked(mask, i)) {
			continue;
		}
		const top = TOP.exec(line);
		const req = REQ.exec(line);
		if (top) {
			heading = (top[1] ?? "").trim();
		} else if (req && !DELTA_TITLES.has((heading ?? "").toLowerCase())) {
			names.push(norm(req[1] ?? ""));
		}
	}
	return names;
};

export const parsePlan = (md: string): Plan => {
	const lines = lineBreaks(md).split("\n");
	const mask = fenceMask(lines);
	const secs = topSections(lines, mask);
	const plan: Plan = {
		added: [],
		modified: [],
		removed: [],
		renamed: [],
		unpaired: [],
		skipped: [],
		orphans: orphanNames(lines, mask),
		unapplied: unappliedContent(lines, mask, secs),
		present: { added: false, modified: false, removed: false, renamed: false },
	};
	for (const { title, body } of secs) {
		const kind = KINDS.find((k) => title.toLowerCase() === `${k} requirements`);
		if (!kind) {
			continue;
		}
		plan.present[kind] = true;
		if (kind === "added" || kind === "modified") {
			plan[kind].push(...parseBlocks(body, plan.skipped));
		} else if (kind === "removed") {
			plan.removed.push(...removedNames(body));
		} else {
			renamedPairs(body, plan);
		}
	}
	return plan;
};
