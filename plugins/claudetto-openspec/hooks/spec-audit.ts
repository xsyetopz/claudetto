// Audit of a whole spec file: which lines the title, Purpose, and requirement blocks account for.
import { fenceMask, lineBreaks } from "./spec-lines.ts";

const REQ_LINE = /^###\s*Requirement:.*$/imu;
const ITEM = /^\s*(?:[-*+]|\d{1,9}[.)])\s+/u;
const LEVEL_1 = /^#\s+\S/u;
const PURPOSE = /^##\s+purpose\s*$/iu;
const REQUIREMENTS = /^##\s+requirements\s*$/iu;
const LEVEL_2 = /^ {0,3}##\s/u;
const HEADING = /^ {0,3}(?:#{1,6}\s|<h[1-6]\b)/iu;
const SCENARIO_HEAD = /^ {0,3}####\s+Scenario:/iu;
const UNDERLINE = /^ {0,3}(?:=+|-+)\s*$/u;
const INTERRUPTS =
	/^ {0,3}(?:>|\||[-*_]{3,}\s*$|<|`{3}|~{3}|#{1,6}\s|[-*+]\s|\d{1,9}[.)]\s)/u;
const TABLE_OR_HTML = /^\s*[|<]/u;
const TAB = /\t/gu;
const width = (text: string) => text.replaceAll(TAB, "    ").length;

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

const startsBlock = (a: Audit) => {
	a.block = true;
	Object.assign(a, {
		seen: false,
		run: false,
		bullets: false,
		item: null,
		open: false,
	});
};

// A line outside a requirement block: Purpose text is accounted for; any other area closes the audit's current one.
const outsideBlock = (a: Audit, line: string, masked: boolean) => {
	if (
		a.area === "purpose" &&
		(masked || !(HEADING.test(line) || UNDERLINE.test(line)))
	) {
		return true;
	}
	a.area =
		a.area === "head" || LEVEL_2.test(line) || HEADING.test(line)
			? "other"
			: a.area;
	return false;
};

// Whether one line is the title, Purpose text, a section header the merge understands, or part of a requirement.
const accounted = (a: Audit, line: string, prev: string, masked: boolean) => {
	if (!masked && enters(a, line)) {
		return true;
	}
	if (a.area === "reqs" && !masked && REQ_LINE.test(line)) {
		startsBlock(a);
		return true;
	}
	if (a.area === "reqs" && a.block && !(masked || LEVEL_2.test(line))) {
		return inBlock(a, line, prev, masked);
	}
	return outsideBlock(a, line, masked);
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
