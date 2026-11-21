import { isRecord } from "../measure-tools/measure";

/** The pinned Jev model (docs.typesafe.ai/models.md). */
export const MODEL = "jev-1.14.0";
/** USD per million input tokens for Jev 1.14. */
export const USD_PER_MTOK = 0.042;
/** A Noul at or above this reads as yes. */
export const YES_AT = 0.7;
/** A Noul at or below this reads as no; the band between is unsettled. */
export const NO_AT = 0.3;

/** One Noul question as `jev.yaml` states it. */
export interface Question {
	readonly instructions: string;
	readonly criteria?: { readonly true: string; readonly false: string };
	readonly weight: number;
}

/** A case's `jev.yaml`. */
export interface JevConfig {
	readonly facts: string | readonly string[];
	readonly questions: Readonly<Record<string, Question>>;
}

const TOP_KEYS = new Set(["facts", "questions"]);
const QUESTION_KEYS = new Set(["instructions", "criteria", "weight"]);

const unknownKey = (
	value: Record<string, unknown>,
	allowed: ReadonlySet<string>,
	where: string
): string | undefined => {
	const bad = Object.keys(value).find((key) => !allowed.has(key));
	return bad === undefined ? undefined : `${where}: unknown key "${bad}"`;
};

const isText = (value: unknown): value is string =>
	typeof value === "string" && value.trim() !== "";

const parseCriteria = (
	value: unknown,
	where: string
): NonNullable<Question["criteria"]> | string => {
	if (!isRecord(value)) {
		return `${where}.criteria must be a mapping with true and false`;
	}
	const bad = unknownKey(
		value,
		new Set(["true", "false"]),
		`${where}.criteria`
	);
	if (bad !== undefined) {
		return bad;
	}
	const yes = value["true"];
	const no = value["false"];
	if (!isText(yes) || !isText(no)) {
		return `${where}.criteria needs non-empty text for true and false`;
	}
	return { true: yes, false: no };
};

const parseQuestion = (value: unknown, id: string): Question | string => {
	const where = `questions.${id}`;
	if (!isRecord(value)) {
		return `${where} must be a mapping`;
	}
	const bad = unknownKey(value, QUESTION_KEYS, where);
	if (bad !== undefined) {
		return bad;
	}
	const instructions = value["instructions"];
	if (!isText(instructions)) {
		return `${where}.instructions must be non-empty text`;
	}
	const weight = value["weight"] ?? 1;
	if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0) {
		return `${where}.weight must be a number of 0 or more`;
	}
	if (value["criteria"] === undefined) {
		return { instructions, weight };
	}
	const criteria = parseCriteria(value["criteria"], where);
	return typeof criteria === "string"
		? criteria
		: { instructions, criteria, weight };
};

const parseFacts = (value: unknown): JevConfig["facts"] | undefined => {
	if (isText(value)) {
		return value;
	}
	if (
		Array.isArray(value) &&
		value.length > 0 &&
		value.every((item: unknown) => isText(item))
	) {
		return value;
	}
	return undefined;
};

/**
 * Validates a parsed `jev.yaml`.
 *
 * @param raw The parsed YAML value.
 * @returns The config, or one message naming the first problem.
 */
export function validateConfig(raw: unknown): JevConfig | string {
	if (!isRecord(raw)) {
		return "jev.yaml must be a mapping with facts and questions";
	}
	const bad = unknownKey(raw, TOP_KEYS, "jev.yaml");
	if (bad !== undefined) {
		return bad;
	}
	const facts = parseFacts(raw["facts"]);
	if (facts === undefined) {
		return "facts must be text or a non-empty list of text";
	}
	const rawQuestions = raw["questions"];
	if (!isRecord(rawQuestions) || Object.keys(rawQuestions).length === 0) {
		return "questions must be a non-empty mapping of id to question";
	}
	const questions: Record<string, Question> = {};
	for (const [id, value] of Object.entries(rawQuestions)) {
		const question = parseQuestion(value, id);
		if (typeof question === "string") {
			return question;
		}
		questions[id] = question;
	}
	if (Object.values(questions).every((question) => question.weight === 0)) {
		return "questions need at least one weight above 0";
	}
	return { facts, questions };
}

/**
 * Reads and validates a case's `jev.yaml`.
 *
 * @param path The file to read.
 * @returns The config, or `undefined` when the file is absent.
 * @throws When the file is malformed or breaks the schema.
 */
export async function loadConfig(path: string): Promise<JevConfig | undefined> {
	const file = Bun.file(path);
	if (!(await file.exists())) {
		return undefined;
	}
	const config = validateConfig(Bun.YAML.parse(await file.text()));
	if (typeof config === "string") {
		throw new TypeError(`${path}: ${config}`);
	}
	return config;
}
