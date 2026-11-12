// The heading tree of a spec: each node owns the text up to the next heading of its level or higher.
import { fenceMask, lineBreaks, masked } from "./spec-lines.ts";

const HEADING = /^(#{1,6})\s+(.+)$/u;
const HEADING_START = /^(#{1,6})\s+/u;
const HEADING_MARKS = /^(#{1,6})/u;

export interface Node {
	level: number;
	title: string;
	content: string;
	children: Node[];
}

const closes = (line: string, level: number) =>
	HEADING_START.test(line) &&
	(HEADING_MARKS.exec(line)?.[1]?.length ?? 0) <= level;

const nodeEnd = (
	lines: string[],
	mask: boolean[],
	from: number,
	level: number,
) => {
	let end = from + 1;
	while (
		end < lines.length &&
		(masked(mask, end) || !closes(lines[end] ?? "", level))
	) {
		end++;
	}
	return end;
};

export const tree = (md: string): Node[] => {
	const lines = lineBreaks(md).split("\n");
	const mask = fenceMask(lines);
	const roots: Node[] = [];
	const stack: Node[] = [];
	for (const [i, line] of lines.entries()) {
		const m = masked(mask, i) ? null : HEADING.exec(line);
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

export const find = (nodes: Node[], title: string): Node | undefined => {
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
