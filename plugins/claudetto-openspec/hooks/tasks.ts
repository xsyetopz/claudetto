export interface Doc {
	path: string;
	content: string;
}
export interface TaskIssue {
	path: string;
	line: number;
	message: string;
}

const TASK =
	/^\s*(?:[-*+]|\d{1,9}[.)])\s*\[(?:\s*([^\]\s]?)\s*\](?![([])|\s+\])\s*(.*)/u;
const LIST_ITEM = /^\s*(?:[-*+]|\d{1,9}[.)])\s+\S/u;
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)/u;
const FRONT_MATTER = /^-{3}\s*$/u;
const LEVEL_TWO = /^ {0,3}##(?!#)(?:[ \t]+|[ \t]*\r?$)/u;
const GROUP = /^ {0,3}##[ \t]+(\d+)\.(?:[ \t]|\r?$)/u;
const TASK_ID = /^(\d+(?:\.\d+)+(?:[A-Za-z]+)?)(?=\s|$)/u;
const LEADING_ZEROS = /^0+(?=\d)/u;
const LEADING_SPACE = /^[ \t]*/u;
const BOM = /^﻿/u;

const taskLine = (line: string) => TASK.exec(line);

// A tab counts to the next multiple of four columns.
const indent = (line: string) => {
	let col = 0;
	for (const ch of LEADING_SPACE.exec(line)?.[0] ?? "") {
		col += ch === "\t" ? 4 - (col % 4) : 1;
	}
	return col;
};

const skipFrontMatter = (lines: string[]) => {
	if (!FRONT_MATTER.test((lines[0] ?? "").replace(BOM, "").trimEnd())) {
		return 0;
	}
	const end = lines.findIndex(
		(l, i) => i > 0 && FRONT_MATTER.test(l.trimEnd()),
	);
	return end === -1 ? 0 : end + 1;
};

interface Scan {
	fence?: { ch: string; len: number };
	comment: boolean;
}

// Advances the fence/comment state over one line; true when the line is not list content.
const skipLine = (st: Scan, line: string) => {
	if (st.comment) {
		st.comment = !line.includes("-->");
		return true;
	}
	const f = FENCE.exec(line);
	if (f) {
		const run = f[1] ?? "";
		if (!st.fence) {
			st.fence = { ch: run[0] ?? "", len: run.length };
		} else if (
			run.startsWith(st.fence.ch) &&
			run.length >= st.fence.len &&
			(f[2] ?? "").trim() === ""
		) {
			delete st.fence;
		}
		return true;
	}
	if (st.fence) {
		return true;
	}
	if (line.trimStart().startsWith("<!--")) {
		st.comment = !line.includes("-->", line.indexOf("<!--") + 4);
		return true;
	}
	return false;
};

// First list item in rendered content: fences, comments, front matter and indented code are skipped.
const firstListItem = (content: string) => {
	const lines = content.split("\n");
	const st: Scan = { comment: false };
	const start = skipFrontMatter(lines);
	const at = lines.findIndex(
		(line, i) =>
			i >= start &&
			!skipLine(st, line) &&
			LIST_ITEM.test(line) &&
			indent(line) < 4,
	);
	return at === -1 ? undefined : at + 1;
};

export const missingCheckboxes = (docs: Doc[]): TaskIssue[] => {
	if (docs.some((d) => d.content.split("\n").some((l) => taskLine(l)))) {
		return [];
	}
	const message =
		'This change counts as 0 tasks: no line in its tracked task files is a checkbox, so "openspec list" and "openspec status" report no work and "openspec archive" has nothing to flag as incomplete. Write each task as "- [ ] 1.1 Description".';
	return docs.flatMap((d) => {
		const line = firstListItem(d.content);
		return line === undefined ? [] : [{ path: d.path, line, message }];
	});
};

type Seen = Map<string, { path: string; line: number }>;

const idIssues = (
	d: Doc,
	line: number,
	id: string,
	group: string,
	first: Seen,
): TaskIssue[] => {
	const out: TaskIssue[] = [];
	const target = id.split(".")[0] ?? "";
	if (target.replace(LEADING_ZEROS, "") !== group.replace(LEADING_ZEROS, "")) {
		out.push({
			path: d.path,
			line,
			message: `Task "${id}" is under group ${group}, but its leading number points to group ${target}. Move it to group ${target} or renumber it.`,
		});
	}
	const seen = first.get(id);
	if (!seen) {
		first.set(id, { path: d.path, line });
		return out;
	}
	const where =
		seen.path === d.path
			? `on line ${seen.line}`
			: `in ${seen.path} on line ${seen.line}`;
	out.push({
		path: d.path,
		line,
		message: `Task ID "${id}" is duplicated; it was first declared ${where}.`,
	});
	return out;
};

const docNumbering = (d: Doc, first: Seen) => {
	const lines = d.content.split("\n");
	if (!lines.some((l) => GROUP.test(l))) {
		return [];
	}
	const issues: TaskIssue[] = [];
	let group: string | undefined;
	for (const [i, line] of lines.entries()) {
		if (LEVEL_TWO.test(line)) {
			group = GROUP.exec(line)?.[1];
		}
		const id = TASK_ID.exec((taskLine(line)?.[2] ?? "").trim())?.[1];
		if (id !== undefined && id !== "" && group !== undefined) {
			issues.push(...idIssues(d, i + 1, id, group, first));
		}
	}
	return issues;
};

export const numberingIssues = (docs: Doc[]): TaskIssue[] => {
	const first: Seen = new Map();
	return docs.flatMap((d) => docNumbering(d, first));
};

export interface OpenTask {
	line: number;
	text: string;
}

// The ticked count and each unticked checkbox of tasks.md; fences, comments, and front matter are skipped.
export const scanTasks = (content: string) => {
	const lines = content.split("\n");
	const st: Scan = { comment: false };
	const open: OpenTask[] = [];
	let done = 0;
	for (let i = skipFrontMatter(lines); i < lines.length; i++) {
		const line = lines[i] ?? "";
		const mark = skipLine(st, line) ? undefined : taskLine(line);
		if (mark && (mark[1] ?? "") !== "") {
			done++;
		} else if (mark) {
			open.push({ line: i + 1, text: line.trim() });
		}
	}
	return { done, open };
};
