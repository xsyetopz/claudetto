// Lean reader for upstream's spec layout: requirement blocks, delta plans, and the one merge that
// validate and archive both run.
export interface Block {
	name: string;
	raw: string;
}
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

const FENCE_OPEN = /^\s*(`{3,}|~{3,})(.*)/;
const FENCE_CLOSE = /^\s*(`{3,}|~{3,})\s*$/;
const TRAILING_HASHES = /[ \t]+#+[ \t]*$/;
const WHITESPACE = /\s+/g;
const BOM = /^\uFEFF/;
const LINE_BREAK = /\r\n?/g;
const H3 = /^###\s+(.+?)\s*$/;
const H1 = /^#\s/;
const H3_PREFIX = /^###\s/;
const ANY_HEADING = /^#{1,6}\s/;
const META = /^\*\*[^*]+\*\*:/;
const COMMENT = /<!--[\s\S]*?(?:--!?>|$)/g;
const NOT_NEWLINE = /[^\n]/g;
const REMOVED_BULLET = /^\s*[-*+]\s*`?###\s*Requirement:\s*(.+?)`?\s*$/;
const RENAME_LINE =
	/^\s*[-*+]?\s*(FROM|TO):\s*`?###\s*Requirement:\s*(.+?)`?\s*$/;
const SCENARIO_LABEL = /^Scenario:\s*/i;
const REQ_LINE = /^###\s*Requirement:.*$/im;
const REQ = /^###\s*Requirement:\s*(.+)\s*$/i;
const TOP = /^##\s+(.+)$/;
const SCENARIO = /^####\s+/;
const SCENARIO_END = /^#{1,4}\s/;
const DELTA_TITLES = ["added", "modified", "removed", "renamed"].map(
	(k) => `${k} requirements`,
);

export const norm = (name: string) => name.replace(TRAILING_HASHES, "").trim();
export const fold = (name: string) =>
	norm(name).toLowerCase().replace(WHITESPACE, " ");
const lineBreaks = (md: string) =>
	md.replace(BOM, "").replace(LINE_BREAK, "\n");

// True for lines inside a fenced block, fence lines included.
export const fenceMask = (lines: string[]) => {
	let open: { ch: string; len: number } | undefined;
	return lines.map((line) => {
		if (!open) {
			const m = FENCE_OPEN.exec(line);
			if (!m || (m[1]?.startsWith("`") && m[2]?.includes("`"))) {
				return false;
			}
			open = { ch: m[1]?.[0] ?? "", len: m[1]?.length ?? 0 };
			return true;
		}
		const m = FENCE_CLOSE.exec(line);
		if (m && m[1]?.[0] === open.ch && (m[1]?.length ?? 0) >= open.len) {
			open = undefined;
		}
		return true;
	});
};

interface Body {
	lines: string[];
	mask: boolean[];
	start: number;
}

const topSections = (lines: string[], mask: boolean[]) => {
	const heads = lines.flatMap((l, i) => {
		const m = mask[i] ? null : TOP.exec(l);
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

const parseBlocks = (body: Body, skipped?: Plan["skipped"]): Block[] => {
	const out: Block[] = [];
	let cur: string[] | undefined;
	const flush = () => {
		const m = cur?.[0] ? REQ.exec(cur[0]) : null;
		if (cur && m) {
			out.push({ name: norm(m[1] ?? ""), raw: cur.join("\n").trimEnd() });
		}
		cur = undefined;
	};
	for (const [i, line] of body.lines.entries()) {
		if (body.mask[i]) {
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

const removedNames = (body: Body) =>
	body.lines.flatMap((line, i) => {
		const m = body.mask[i]
			? null
			: (REQ.exec(line) ?? REMOVED_BULLET.exec(line));
		return m ? [norm(m[1] ?? "")] : [];
	});

const renamedPairs = (body: Body, plan: Plan) => {
	let pending: string | undefined;
	for (const [i, line] of body.lines.entries()) {
		const m = body.mask[i] ? null : RENAME_LINE.exec(line);
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
		.map((l, i) => (mask[i] ? "" : l))
		.join("\n")
		.replace(COMMENT, (m) => m.replace(NOT_NEWLINE, " "))
		.split("\n")
		.map((l, i) => (mask[i] ? (lines[i] ?? "") : l));

const hasText = (visible: string[], from: number, to: number, skip?: RegExp) =>
	visible.slice(from, to).some((l) => l.trim() && !skip?.test(l));

const sectionUnapplied = (
	visible: string[],
	{ title, body }: { title: string; body: Body },
) => {
	const folded = title.toLowerCase();
	const start = body.start - 1;
	if (folded === "added requirements" || folded === "modified requirements") {
		const first = body.lines.findIndex((l, i) => !body.mask[i] && REQ.test(l));
		return hasText(
			visible,
			start,
			start + (first < 0 ? body.lines.length : first),
			H3_PREFIX,
		);
	}
	if (
		DELTA_TITLES.includes(folded) ||
		(folded === "purpose" && visible[start - 1]?.trim())
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

const KINDS = ["added", "modified", "removed", "renamed"] as const;

const orphanNames = (lines: string[], mask: boolean[]) => {
	const names: string[] = [];
	let heading: string | null = null;
	for (const [i, line] of lines.entries()) {
		if (mask[i]) {
			continue;
		}
		const top = TOP.exec(line);
		const req = REQ.exec(line);
		if (top) {
			heading = (top[1] ?? "").trim();
		} else if (req && !DELTA_TITLES.includes((heading ?? "").toLowerCase())) {
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

export interface Scenario {
	name: string;
	raw: string;
	labeled: boolean;
}

export const scenarios = (raw: string): Scenario[] => {
	const lines = lineBreaks(raw).split("\n");
	const mask = fenceMask(lines);
	const heads = lines.flatMap((l, i) =>
		!mask[i] && SCENARIO.test(l) ? [i] : [],
	);
	return heads.map((h, n) => {
		const head = (lines[h] ?? "").replace(SCENARIO, "");
		return {
			name: head
				.replace(TRAILING_HASHES, "")
				.replace(SCENARIO_LABEL, "")
				.trim(),
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
		if (mask[i] || !SCENARIO.test(l)) {
			return [];
		}
		let end = i + 1;
		while (
			end < bodyLines.length &&
			(mask[end] || !SCENARIO_END.test(bodyLines[end] ?? ""))
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
		if (mask[i]) {
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

// Scenario names of `current` that `incoming` does not carry, counting repeats.
export const missingScenarios = (current: Block, incoming: Block) => {
	const left = new Map<string, number>();
	for (const s of scenarios(incoming.raw)) {
		left.set(s.name, (left.get(s.name) ?? 0) + 1);
	}
	return scenarios(current.raw).flatMap(({ name }) => {
		const n = left.get(name) ?? 0;
		left.set(name, n - 1);
		return n > 0 ? [] : [name];
	});
};

export interface Failure {
	kind: "merge" | "scenario-loss";
	name: string;
	message: string;
}

interface Ctx {
	list: Block[];
	failures: Failure[];
}
const fail = (c: Ctx, kind: Failure["kind"], name: string, message: string) =>
	c.failures.push({ kind, name, message });
const find = (c: Ctx, name: string) => c.list.findIndex((b) => b.name === name);
const flat = (b: Block) => b.raw.replace(LINE_BREAK, "\n").trim();
const same = (a: Block, b: Block) => flat(a) === flat(b);

const rename = (c: Ctx, { from, to }: { from: string; to: string }) => {
	const i = find(c, from);
	const old = c.list[i];
	if (!old) {
		const near =
			find(c, to) >= 0 &&
			c.list.find((b) => b.name !== to && fold(b.name) === fold(from));
		// Source gone, target present: the rename was already synced.
		if (near) {
			fail(
				c,
				"merge",
				from,
				`RENAMED failed for "${from}": found "${near.name}"`,
			);
		} else if (find(c, to) < 0) {
			fail(c, "merge", from, `RENAMED failed for "${from}": source not found`);
		}
	} else if (find(c, to) >= 0) {
		fail(c, "merge", to, `RENAMED failed for "${to}": target already exists`);
	} else {
		c.list[i] = {
			name: to,
			raw: old.raw.replace(REQ_LINE, `### Requirement: ${to}`),
		};
	}
};

// An absent target is an already-synced removal; only a case/space near-miss is a typo.
const remove = (c: Ctx, name: string) => {
	const near = c.list.find((b) => fold(b.name) === fold(name));
	if (near && near.name !== name) {
		fail(
			c,
			"merge",
			name,
			`REMOVED failed for "${name}": not found, but "${near.name}" exists`,
		);
	}
	c.list = c.list.filter((b) => b.name !== name);
};

const modify = (c: Ctx, block: Block) => {
	const i = find(c, block.name);
	const old = c.list[i];
	if (!old) {
		fail(
			c,
			"merge",
			block.name,
			`MODIFIED failed for "${block.name}": not found`,
		);
		return;
	}
	const lost = missingScenarios(old, block);
	if (lost.length > 0) {
		fail(
			c,
			"scenario-loss",
			block.name,
			`MODIFIED "${block.name}" omits scenario(s) the current spec still has: ${lost.map((n) => `"${n}"`).join(", ")}`,
		);
	} else {
		c.list[i] = block;
	}
};

const add = (c: Ctx, block: Block) => {
	const have = c.list[find(c, block.name)];
	if (!have) {
		c.list.push(block);
	} else if (!same(have, block)) {
		fail(
			c,
			"merge",
			block.name,
			`ADDED failed for "${block.name}": already exists`,
		);
	}
};

// RENAMED, REMOVED, MODIFIED, ADDED, matched by exact (whitespace-normalized) name.
export const merge = (
	base: Block[] | undefined,
	plan: Plan,
): { blocks: Block[]; failures: Failure[] } => {
	const c: Ctx = { list: [...(base ?? [])], failures: [] };
	for (const r of plan.renamed) {
		rename(c, r);
	}
	for (const name of plan.removed) {
		remove(c, name);
	}
	for (const block of plan.modified) {
		modify(c, block);
	}
	for (const block of plan.added) {
		add(c, block);
	}
	return { blocks: c.list, failures: c.failures };
};

const ITEM = /^\s*(?:[-*+]|\d{1,9}[.)])\s+/;
const LEVEL_1 = /^#\s+\S/;
const PURPOSE = /^##\s+purpose\s*$/i;
const REQUIREMENTS = /^##\s+requirements\s*$/i;
const LEVEL_2 = /^ {0,3}##\s/;
const HEADING = /^ {0,3}(?:#{1,6}\s|<h[1-6]\b)/i;
const SCENARIO_HEAD = /^ {0,3}####\s+Scenario:/i;
const UNDERLINE = /^ {0,3}(?:=+|-+)\s*$/;
const INTERRUPTS =
	/^ {0,3}(?:>|\||[-*_]{3,}\s*$|<|`{3}|~{3}|#{1,6}\s|[-*+]\s|\d{1,9}[.)]\s)/;
const TABLE_OR_HTML = /^\s*[|<]/;
const TAB = /\t/g;
const width = (text: string) => text.replace(TAB, "    ").length;

interface Audit {
	area: "head" | "purpose" | "reqs" | "other";
	titled: boolean;
	block: boolean;
	seen: boolean;
	run: boolean;
	bullets: boolean;
	item: number | null;
	open: boolean;
}

// A line that is neither inside an open item nor a heading: it starts a scenario or bullet, or is loose.
const opensItem = (a: Audit, line: string) => {
	const bullet = ITEM.exec(line);
	a.item = bullet ? width(bullet[0]) : null;
	a.open = bullet !== null;
	if (SCENARIO_HEAD.test(line)) {
		[a.seen, a.run, a.bullets] = [true, true, false];
		return true;
	}
	if (bullet) {
		a.bullets ||= a.run;
		return a.run || !a.seen;
	}
	return !(a.seen || TABLE_OR_HTML.test(line));
};

// One line of a requirement block: its statement, scenario headers, and each scenario's bullets
// (with wrapped, nested, and fenced lines) belong to it; a heading, note, or loose line does not.
const inBlock = (a: Audit, line: string, prev: string, masked: boolean) => {
	const inside =
		a.item !== null && width(line) - width(line.trimStart()) >= a.item;
	const within = inside ? line.trimStart() : line;
	if (masked) {
		a.item = inside ? a.item : null;
		a.open = false;
		return true;
	}
	if (prev.trim() && UNDERLINE.test(within)) {
		[a.item, a.open] = [null, false];
		return false;
	}
	if (HEADING.test(within) && !SCENARIO_HEAD.test(line)) {
		return false;
	}
	if (inside || (a.open && a.run && !INTERRUPTS.test(within))) {
		a.open = !INTERRUPTS.test(within);
		return true;
	}
	return opensItem(a, line);
};

// Moves the audit into the title, Purpose, or Requirements area when the line opens it.
const enters = (a: Audit, line: string) => {
	if (LEVEL_1.test(line) && !a.titled && a.area === "head") {
		a.titled = true;
	} else if (
		PURPOSE.test(line) &&
		(a.area === "head" || a.area === "purpose")
	) {
		a.area = "purpose";
	} else if (REQUIREMENTS.test(line) && a.area !== "reqs") {
		a.area = "reqs";
	} else {
		return false;
	}
	return true;
};

// Whether one line is the title, Purpose text, a section header the merge understands, or part of a requirement.
const accounted = (a: Audit, line: string, prev: string, masked: boolean) => {
	if (!masked && enters(a, line)) {
		return true;
	}
	if (a.area === "reqs" && !masked && REQ_LINE.test(line)) {
		a.block = true;
		Object.assign(a, {
			seen: false,
			run: false,
			bullets: false,
			item: null,
			open: false,
		});
	} else if (a.area === "reqs" && a.block && !(masked || LEVEL_2.test(line))) {
		return inBlock(a, line, prev, masked);
	} else if (
		a.area === "purpose" &&
		(masked || !(HEADING.test(line) || UNDERLINE.test(line)))
	) {
		return true;
	} else {
		a.area =
			a.area === "head" || LEVEL_2.test(line) || HEADING.test(line)
				? "other"
				: a.area;
		return false;
	}
	return true;
};

// The non-blank lines that the title, Purpose, and requirement blocks (header, statement, scenario
// bullets) do not account for. A retirement deletes the whole file, so any such line refuses it.
export const leftovers = (md: string): string[] => {
	const lines = lineBreaks(md).split("\n");
	const mask = fenceMask(lines);
	const a: Audit = {
		area: "head",
		titled: false,
		block: false,
		seen: false,
		run: false,
		bullets: false,
		item: null,
		open: false,
	};
	return lines.flatMap((line, i) => {
		if (!line.trim()) {
			a.run &&= !a.bullets;
			Object.assign(a, { item: null, open: false });
			return [];
		}
		return accounted(a, line, lines[i - 1] ?? "", mask[i] ?? false)
			? []
			: [line.trim()];
	});
};

export const render = (title: string, purpose: string, list: Block[]) =>
	`# ${title}\n\n## Purpose\n${purpose}\n\n## Requirements\n\n${list.map((b) => b.raw).join("\n\n")}\n`;
