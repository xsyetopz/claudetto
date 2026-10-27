// The Markdown of a spec, read as OpenSpec 1.15.0 reads it: requirement blocks and delta sections.

export interface Block {
	name: string;
	raw: string;
}
export type Delta = ReturnType<typeof parseDelta>;

const REQ = /^###\s*Requirement:\s*(.+)\s*$/i;
const TOP = /^##\s+/;
const STRAY = /^###\s+(.+?)\s*$/;
const BULLET = /^\s*[-*+]\s*`?###\s*Requirement:\s*(.+?)`?\s*$/;
const PAIR = /^\s*[-*+]?\s*(FROM|TO):\s*`?###\s*Requirement:\s*(.+?)`?\s*$/;
const SCENARIO_RENAME =
	/^\s*[-*+]\s*RENAMED SCENARIO (FROM|TO):\s*`?(?:####\s*Scenario:)?\s*(.+?)`?\s*$/i;
const FENCE = /^([ \t]*)(`{3,}|~{3,})(.*)$/;
const ITEM = /^( *(?:[-*+]|\d{1,9}[.)]))(?:([ \t]+)(\S)?|$)/;
const NON_BLANK_START = /^\S/;
const TRAILING_HASHES = /[ \t]+#+[ \t]*$/;
const BOM = /^\uFEFF/;
const CRLF = /\r\n?/g;
const REQUIREMENTS_SECTION = /.\srequirements$/i;
const ADDED_OR_MODIFIED_SECTION = /^(added|modified) requirements$/i;
const ANY_HEADER = /^#{1,6}\s/;
const LEVEL_1_TO_4_HEADER = /^#{1,4}\s/;
const SCENARIO_HEADER = /^####\s+/;
const SCENARIO_PREFIX = /^Scenario:\s*/i;
const HTML_COMMENT = /<!--[\s\S]*?(?:-->|$)/g;
const NUMBERED_TITLE = /^\d/;
const BREAK = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;

/**
 * The width of the list item content that the line `l` opens, or the width of the item before it. A line with no indent ends the item.
 * CommonMark: 5 or more columns after the marker leave the rest as indented code, so the width is the marker plus 1, and an empty item has that width too.
 * A thematic break (`* * *`) is no item, and a blank line after an empty item (`empty`) closes it.
 */
const itemWidth = (l: string, item: number, empty: boolean): number => {
	const [, marker = "", gap = "", text = ""] = BREAK.test(l)
		? []
		: (ITEM.exec(l) ?? []);
	if (!marker) {
		return (!l.trim() && empty) || NON_BLANK_START.test(l) ? 0 : item;
	}
	const start = columns(marker);
	const after = columns(marker + gap) - start;
	return text && after < 5 ? start + after : start + 1;
};

/** CommonMark: a tab in the indent goes to the next multiple of 4 columns. */
const columns = (indent: string): number => {
	let width = 0;
	for (const c of indent) {
		width = c === "\t" ? width + 4 - (width % 4) : width + 1;
	}
	return width;
};

/** CommonMark: a fence has 0 to 3 columns of indent, and a list item adds the width of its content. */
const fenceIndent = (space: number, item: number): boolean =>
	space <= 3 || (item > 0 && space >= item);

/** CommonMark: the info string of a backtick fence holds no backtick. */
const opens = (run: string, info: string): boolean =>
	run !== "" && !(run[0] === "`" && info.includes("`"));

/** CommonMark: a closing fence is at least as long as its opener and has no info string. */
const closes = (open: string, run: string, info: string): boolean =>
	run[0] === open[0] && run.length >= open.length && !info.trim();

/** The lines with each fenced line blank, so that no pattern matches inside a code block. */
const plain = (ls: string[]): string[] => {
	let open = "";
	let item = 0;
	let empty = false;
	return ls.map((l) => {
		if (!open) {
			item = itemWidth(l, item, empty);
			empty = !BREAK.test(l) && ITEM.test(l) && !ITEM.exec(l)?.[3];
		}
		const [, space = "", run = "", info = ""] = FENCE.exec(l) ?? [];
		const fence = fenceIndent(columns(space), item);
		if (!open) {
			if (!(fence && opens(run, info))) {
				return l;
			}
			open = run;
		} else if (fence && closes(open, run, info)) {
			open = "";
		}
		return "";
	});
};

/** The text with each fenced line blank. */
export const unfenced = (text: string): string =>
	plain(text.split("\n")).join("\n");

/** The index and the match of each unfenced line that matches `re`. */
const heads = (ls: string[], re: RegExp) =>
	plain(ls).flatMap((l, i) => {
		const m = re.exec(l);
		return m ? [{ i, m }] : [];
	});

const clean = (s: string) => s.replace(TRAILING_HASHES, "").trim();

const titleOf = (line: string) => clean(line.replace(TOP, ""));

const split = (text: string) =>
	text.replace(BOM, "").replace(CRLF, "\n").split("\n");

const blocksOf = (body: string[]) => {
	const at = heads(body, REQ);
	const join = (a: number, b?: number) => body.slice(a, b).join("\n").trimEnd();
	return {
		preamble: join(0, at[0]?.i),
		blocks: at.map(
			({ i, m }, k): Block => ({
				name: clean(m[1] ?? ""),
				raw: join(i, at[k + 1]?.i),
			}),
		),
	};
};

const renames = (body: string[]) => {
	const out: { from: string; to: string }[] = [];
	let from = "";
	for (const l of plain(body)) {
		const [, side, name = ""] = PAIR.exec(l) ?? [];
		if (side === "FROM") {
			from = clean(name);
		} else if (side === "TO" && from) {
			out.push({ from, to: clean(name) });
			from = "";
		}
	}
	return out;
};

export const parseDelta = (text: string) => {
	const all = split(text);
	const tops = heads(all, TOP);
	const secs = tops.map(({ i }, k) => ({
		at: i,
		line: all[i] ?? "",
		title: titleOf(all[i] ?? ""),
		body: all.slice(i + 1, tops[k + 1]?.i),
	}));
	const body = (t: string) =>
		secs.filter((s) => s.title.toLowerCase() === t).flatMap((s) => s.body);
	const removed = body("removed requirements");
	return {
		added: blocksOf(body("added requirements")).blocks,
		modified: blocksOf(body("modified requirements")).blocks,
		removed: plain(removed).flatMap((l) => {
			const m = REQ.exec(l) ?? BULLET.exec(l);
			return m?.[1] ? [clean(m[1])] : [];
		}),
		removedBlocks: blocksOf(removed).blocks,
		renamed: renames(body("renamed requirements")),
		purpose: secs.some((s) => s.title.toLowerCase() === "purpose")
			? body("purpose").join("\n").trim()
			: null,
		sections: secs
			.filter((s) => REQUIREMENTS_SECTION.test(s.title))
			.map((s) => s.line.trim()),
		// The `###` headers in ADDED and MODIFIED that are no requirements: validation ignores them.
		strays: secs
			.filter((s) => ADDED_OR_MODIFIED_SECTION.test(s.title))
			.flatMap((s) =>
				heads(s.body, STRAY)
					.filter(({ m }) => !REQ.test(m[0]))
					.map(({ i, m }) => ({
						header: m[1] ?? "",
						section: s.title,
						line: s.at + i + 2,
					})),
			),
	};
};

export const parseMain = (text: string) => {
	let all = split(text);
	let start = heads(all, TOP).find(
		({ i }) => titleOf(all[i] ?? "").toLowerCase() === "requirements",
	)?.i;
	if (start === undefined) {
		all = [...split(text.trimEnd()), "", "## Requirements", ""];
		start = all.length - 2;
	}
	const end = heads(all, TOP).find(({ i }) => i > (start ?? 0))?.i;
	return {
		before: all.slice(0, start).join("\n"),
		header: all[start] ?? "",
		...blocksOf(all.slice(start + 1, end ?? all.length)),
		after: all.slice(end ?? all.length).join("\n"),
	};
};

/** The text of a requirement: its lines up to the first header, with no blank and no fenced line. */
export const requirementText = (raw: string) => {
	const ls = plain(raw.split("\n").slice(1));
	const stop = ls.findIndex((l) => ANY_HEADER.test(l));
	return ls
		.slice(0, stop < 0 ? undefined : stop)
		.map((l) => l.trim())
		.filter(Boolean)
		.join("\n");
};

/** The scenarios of a requirement: each `####` header outside a fence, and the text up to the next header. */
export const scenarioList = (raw: string) => {
	const body = raw.split("\n").slice(1);
	const next = heads(body, LEVEL_1_TO_4_HEADER);
	return heads(body, SCENARIO_HEADER).map(({ i }) => ({
		name: clean((body[i] ?? "").replace(SCENARIO_HEADER, "")).replace(
			SCENARIO_PREFIX,
			"",
		),
		rawText: body
			.slice(i + 1, next.find((h) => h.i > i)?.i)
			.join("\n")
			.trim(),
	}));
};

/** The declared scenario renames of a `MODIFIED` block: each `FROM` bullet paired with the `TO` bullet after it. */
export const scenarioRenames = (raw: string) => {
	const out: { from: string; to: string }[] = [];
	let from = "";
	for (const l of plain(raw.split("\n"))) {
		const [, side = "", name = ""] = SCENARIO_RENAME.exec(l) ?? [];
		if (side.toUpperCase() === "FROM") {
			from = clean(name);
		} else if (side && from) {
			out.push({ from, to: clean(name) });
			from = "";
		}
	}
	return out;
};

/** The block `raw` without its rename declarations, because a main spec holds no delta marker. */
export const withoutRenames = (raw: string) => {
	const ls = raw.split("\n");
	const marked = plain(ls).map((l) => SCENARIO_RENAME.test(l));
	return ls.filter((_, i) => !marked[i]).join("\n");
};

/** The scenarios of `current` that `incoming` lacks, and the sentence that counts both blocks. A declared rename in `incoming` is no loss. */
export const scenarioLoss = (current: string, incoming: string) => {
	const without = (a: string[], b: string[]) => {
		const left = [...b];
		return a.filter((name) => {
			const at = left.indexOf(name);
			if (at >= 0) {
				left.splice(at, 1);
			}
			return at < 0;
		});
	};
	const namesOf = (raw: string) => scenarioList(raw).map((s) => s.name);
	const old = namesOf(current);
	const has = namesOf(incoming);
	// A declaration credits one old scenario, and only when its new scenario is in the incoming block.
	const had = [...old];
	for (const { from, to } of scenarioRenames(incoming)) {
		const at = had.indexOf(from);
		if (at >= 0 && has.includes(to)) {
			had[at] = to;
		}
	}
	const added = without(has, had);
	const n = (c: number) => `${c} ${c === 1 ? "scenario" : "scenarios"}`;
	const adds =
		added.length > 0
			? `It adds ${n(added.length)} not in the current spec: ${added
					.slice(0, 3)
					.map((a) => `"${a}"`)
					.join(
						", ",
					)}${added.length > 3 ? ` and ${added.length - 3} more` : ""}.`
			: "It adds none.";
	return {
		missing: without(had, has),
		balance: `The modified block has ${n(has.length)}; the current spec has ${n(had.length)}. ${adds}`,
	};
};

/** The `##` sections of `text`, by lower-case title, with the text of each section (its subsections too). */
const sections = (text: string) => {
	// Comments go before the split at `##`, so a `##` line in a comment is no section.
	const all = plain(split(text))
		.join("\n")
		.replace(HTML_COMMENT, "")
		.split("\n");
	const tops = heads(all, TOP);
	return tops.map(({ i }, k) => ({
		title: titleOf(all[i] ?? "").toLowerCase(),
		text: all
			.slice(i + 1, tops[k + 1]?.i)
			.join("\n")
			.trim(),
	}));
};

/**
 * Whether the file `text` fills the template `template`: each `##` section of the template is in the file, with text.
 * A numbered section of the template, such as `## 1. Group`, is an example of a group that the author names, so the file needs no section for it.
 */
export const fills = (template: string, text: string) => {
	const have = sections(text);
	return sections(template)
		.filter((s) => !NUMBERED_TITLE.test(s.title))
		.every((s) => have.some((h) => h.title === s.title && h.text));
};
