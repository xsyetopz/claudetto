import { ID_PATTERN } from "./paths";

/** One parsed requirement of a spec file. */
export interface Requirement {
	id: string;
	title: string;
	file: string;
	line: number;
	scenarios: number;
	open: string[];
}

/** A heading or requirement the schema rejects. */
export interface Malformed {
	file: string;
	line: number;
	reason: string;
}

/** A requirement with more than one behaviour sentence or more than three scenarios. */
export interface Inflated {
	id: string;
	file: string;
	line: number;
	sentences: number;
	scenarios: number;
}

const MAX_SENTENCES = 1;
const MAX_SCENARIOS = 3;
const HEADING = new RegExp(
	String.raw`^##\s+(${ID_PATTERN})\s+(\S.*?)\s*$`,
	"u"
);
const STEP = /^(Given|When|Then|And|But)\b/u;
const OPEN = /^Open:\s*(.*)$/u;
const ABBREVIATION = /\b(?:e\.g|i\.e|etc|vs)\./giu;
const FENCE = /^\s*(?:```|~~~)/u;
const TITLE = /^#\s+\S/u;
const SUBHEADING = /^##(?!#)/u;

function stripMarker(line: string): string {
	return line
		.trim()
		.replace(/^[-*+]\s+/u, "")
		.replace(/^\*\*([A-Za-z]+)\*\*/u, "$1");
}

function countSentences(prose: string): number {
	const plain = prose
		.replaceAll(/`[^`]*`/gu, "x")
		.replaceAll(ABBREVIATION, "x")
		.trim();
	if (plain === "") {
		return 0;
	}
	return plain.split(/(?<=[.!?])\s+/u).filter((s) => s.trim() !== "").length;
}

interface Draft {
	requirement: Requirement;
	prose: string[];
	hasWhen: boolean;
	hasThen: boolean;
}

function startsNewScenario(step: string, draft: Draft): boolean {
	if (step === "Given") {
		return true;
	}
	if (step === "When") {
		return draft.requirement.scenarios === 0 || draft.hasWhen || draft.hasThen;
	}
	return false;
}

function absorb(line: string, draft: Draft): void {
	const text = stripMarker(line);
	if (text === "") {
		return;
	}
	const open = OPEN.exec(text);
	if (open) {
		draft.requirement.open.push((open[1] ?? "").trim());
		return;
	}
	const step = STEP.exec(text)?.[1];
	if (step === undefined) {
		draft.prose.push(text);
		return;
	}
	if (startsNewScenario(step, draft)) {
		draft.requirement.scenarios += 1;
		draft.hasWhen = false;
		draft.hasThen = false;
	}
	draft.hasWhen ||= step === "When";
	draft.hasThen ||= step === "Then";
}

function newDraft(match: RegExpExecArray, file: string, line: number): Draft {
	return {
		requirement: {
			id: match[1] ?? "",
			title: match[2] ?? "",
			file,
			line,
			scenarios: 0,
			open: []
		},
		prose: [],
		hasWhen: false,
		hasThen: false
	};
}

/** The drafts and malformed headings of one spec file, in file order. */
function scan(
	file: string,
	text: string
): { drafts: Draft[]; malformed: Malformed[] } {
	const drafts: Draft[] = [];
	const malformed: Malformed[] = [];
	let current: Draft | undefined;
	let fenced = false;
	let titled = false;
	for (const [index, line] of text.split(/\r?\n/u).entries()) {
		if (FENCE.test(line)) {
			fenced = !fenced;
		} else if (fenced) {
			continue;
		} else if (TITLE.test(line)) {
			current = undefined;
			titled = true;
		} else if (SUBHEADING.test(line)) {
			const match = HEADING.exec(line);
			current = match === null ? undefined : newDraft(match, file, index + 1);
			if (current === undefined) {
				malformed.push({
					file,
					line: index + 1,
					reason:
						"heading must read `## <ID> <title>` with an ID such as AUTH-3"
				});
			} else {
				drafts.push(current);
			}
		} else if (current !== undefined) {
			absorb(line, current);
		}
	}
	if (!titled) {
		malformed.push({ file, line: 1, reason: "missing `# <Capability>` title" });
	}
	return { drafts, malformed };
}

/** The requirements, malformed headings, inflated requirements and behaviour prose of one spec file. */
export function parseSpec(
	file: string,
	text: string
): {
	requirements: Requirement[];
	malformed: Malformed[];
	inflated: Inflated[];
	behaviours: Map<string, string>;
} {
	const { drafts, malformed } = scan(file, text);
	const inflated: Inflated[] = [];
	for (const { requirement, prose } of drafts) {
		const sentences = countSentences(prose.join(" "));
		if (sentences > MAX_SENTENCES || requirement.scenarios > MAX_SCENARIOS) {
			inflated.push({
				id: requirement.id,
				file,
				line: requirement.line,
				sentences,
				scenarios: requirement.scenarios
			});
		}
	}
	return {
		requirements: drafts.map((d) => d.requirement),
		malformed,
		inflated,
		behaviours: new Map(
			drafts.map((d) => [
				d.requirement.id,
				d.prose.join(" ").replaceAll(/\s+/gu, " ").trim()
			])
		)
	};
}
