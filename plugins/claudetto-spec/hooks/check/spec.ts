import {
	citedIds,
	ID_PATTERN,
	isSpecFile,
	isTestFile,
	listPaths
} from "./paths";

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

/** What `spec_check` reports. */
export interface Report {
	requirements: Requirement[];
	malformed: Malformed[];
	inflated: Inflated[];
	uncovered: string[];
	orphans: string[];
	changedSinceStaged: string[];
}

/** The files and git outputs one check reads. */
export interface CheckInput {
	/** `git ls-files --cached --others --exclude-standard` output. */
	listing: string;
	/** `git diff --name-only` output (work tree against the index). */
	diff: string;
	/** File text by path, for the spec and test files `listing` names. */
	texts: ReadonlyMap<string, string>;
	/** Limits the report to one spec file. */
	path?: string | undefined;
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

/** The requirements, malformed headings and inflated requirements of one spec file. */
export function parseSpec(
	file: string,
	text: string
): {
	requirements: Requirement[];
	malformed: Malformed[];
	inflated: Inflated[];
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
		inflated
	};
}

function prefixOf(id: string): string {
	return id.replace(/-\d+$/u, "");
}

/** Malformed entries for each ID a later file or line defines again. */
function duplicates(requirements: Requirement[]): Malformed[] {
	const seen = new Map<string, Requirement>();
	const found: Malformed[] = [];
	for (const requirement of requirements) {
		const first = seen.get(requirement.id);
		if (first === undefined) {
			seen.set(requirement.id, requirement);
		} else {
			found.push({
				file: requirement.file,
				line: requirement.line,
				reason: `duplicate ID ${requirement.id}, first defined at ${first.file}:${first.line}`
			});
		}
	}
	return found;
}

/** Parses the specs, reads the citations in the tests, and lists what the git outputs say changed. */
export function checkSpecs(input: CheckInput): Report {
	const paths = listPaths(input.listing);
	const requirements: Requirement[] = [];
	const malformed: Malformed[] = [];
	const inflated: Inflated[] = [];
	for (const file of paths.filter((p) => isSpecFile(p)).toSorted()) {
		const parsed = parseSpec(file, input.texts.get(file) ?? "");
		requirements.push(...parsed.requirements);
		malformed.push(...parsed.malformed);
		inflated.push(...parsed.inflated);
	}
	malformed.push(...duplicates(requirements));
	const cited = new Set<string>();
	for (const file of paths.filter((p) => isTestFile(p) && !isSpecFile(p))) {
		for (const id of citedIds(input.texts.get(file) ?? "")) {
			cited.add(id);
		}
	}
	const known = new Set(requirements.map((r) => r.id));
	const scope = (file: string): boolean =>
		input.path === undefined || file === input.path;
	const scoped = requirements.filter((r) => scope(r.file));
	// With a path, only the prefixes of that spec count; known IDs come from every spec.
	const prefixes = new Set(
		(input.path === undefined ? requirements : scoped).map((r) =>
			prefixOf(r.id)
		)
	);
	return {
		requirements: scoped,
		malformed: malformed.filter((m) => scope(m.file)),
		inflated: inflated.filter((i) => scope(i.file)),
		uncovered: scoped.map((r) => r.id).filter((id) => !cited.has(id)),
		orphans: [...cited]
			.filter((id) => !known.has(id) && prefixes.has(prefixOf(id)))
			.toSorted(),
		changedSinceStaged: listPaths(input.diff).filter((p) => isTestFile(p))
	};
}
