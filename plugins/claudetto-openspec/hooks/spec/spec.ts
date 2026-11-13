// Lean reader for upstream's spec layout: top sections, requirement blocks, and scenarios.
import { type Block, fenceMask, lineBreaks, masked, norm } from "./spec-lines";

const SCENARIO_LABEL = /^Scenario:\s*/iu;
const H3 = /^###\s+(.+?)\s*$/u;
const ANY_HEADING = /^#{1,6}\s/u;
const META = /^\*\*[^*]+\*\*:/u;
export const REQ = /^###\s*Requirement:\s*(.+)\s*$/iu;
export const TOP = /^##\s+(.+)$/u;
const SCENARIO = /^####\s+/u;
const SCENARIO_END = /^#{1,4}\s/u;

export interface Body {
	lines: string[];
	mask: boolean[];
	start: number;
}

export const topSections = (lines: string[], mask: boolean[]) => {
	const heads = lines.flatMap((l, i) => {
		const m = masked(mask, i) ? null : TOP.exec(l);
		return m ? [{ title: (m[1] ?? "").trim(), index: i }] : [];
	});
	return heads.map((h, n) => {
		const end = heads[n + 1]?.index ?? lines.length;
		const body: Body = {
			lines: lines.slice(h.index + 1, end),
			mask: mask.slice(h.index + 1, end),
			start: h.index + 2,
		};
		return { title: h.title, body };
	});
};

export const section = (md: string, title: string) => {
	const lines = lineBreaks(md).split("\n");
	const found = topSections(lines, fenceMask(lines)).find(
		(s) => s.title.toLowerCase() === title.toLowerCase(),
	);
	return found?.body.lines.join("\n").trim();
};

export const parseBlocks = (
	body: Body,
	skipped?: { header: string }[],
): Block[] => {
	const out: Block[] = [];
	let cur: string[] | undefined;
	const flush = () => {
		const first = cur?.[0];
		const m = first === undefined ? null : REQ.exec(first);
		if (cur && m) {
			out.push({ name: norm(m[1] ?? ""), raw: cur.join("\n").trimEnd() });
		}
		cur = undefined;
	};
	for (const [i, line] of body.lines.entries()) {
		if (masked(body.mask, i)) {
			cur?.push(line);
			continue;
		}
		if (REQ.test(line)) {
			flush();
			cur = [line];
			continue;
		}
		if (TOP.test(line)) {
			flush();
			continue;
		}
		const h3 = H3.exec(line);
		if (h3 && skipped) {
			skipped.push({ header: (h3[1] ?? "").trim() });
		}
		cur?.push(line);
	}
	flush();
	return out;
};

export const blocks = (md: string): Block[] => {
	const lines = lineBreaks(md).split("\n");
	return parseBlocks({ lines, mask: fenceMask(lines), start: 1 });
};

export interface Scenario {
	name: string;
	raw: string;
	labeled: boolean;
}

export const scenarios = (raw: string): Scenario[] => {
	const lines = lineBreaks(raw).split("\n");
	const mask = fenceMask(lines);
	const heads = lines.flatMap((l, i) =>
		!masked(mask, i) && SCENARIO.test(l) ? [i] : [],
	);
	return heads.map((h, n) => {
		const head = (lines[h] ?? "").replace(SCENARIO, "");
		return {
			name: norm(head).replace(SCENARIO_LABEL, ""),
			labeled: SCENARIO_LABEL.test(head),
			raw: lines
				.slice(h, heads[n + 1] ?? lines.length)
				.join("\n")
				.trimEnd(),
		};
	});
};

// Scenario bodies as upstream counts them: a body runs to the next heading of level 1-4.
export const scenarioBodies = (bodyLines: string[]) => {
	const mask = fenceMask(bodyLines);
	return bodyLines.flatMap((l, i) => {
		if (masked(mask, i) || !SCENARIO.test(l)) {
			return [];
		}
		let end = i + 1;
		while (
			end < bodyLines.length &&
			(masked(mask, end) || !SCENARIO_END.test(bodyLines[end] ?? ""))
		) {
			end++;
		}
		return [bodyLines.slice(i + 1, end).join("\n")];
	});
};

// Prose of a requirement: lines above the first heading, fenced lines skipped; **Key**: metadata
// counts only when no prose line exists.
export const requirementText = (raw: string) => {
	const body = raw.split("\n").slice(1);
	const mask = fenceMask(body);
	const prose: string[] = [];
	const meta: string[] = [];
	for (const [i, line] of body.entries()) {
		if (masked(mask, i)) {
			continue;
		}
		if (ANY_HEADING.test(line)) {
			break;
		}
		const t = line.trim();
		if (t) {
			(META.test(t) ? meta : prose).push(t);
		}
	}
	return (prose.length > 0 ? prose : meta).join("\n");
};
