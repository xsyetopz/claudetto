import { fieldOf } from "./json.ts";

/** A test of a parsed request body, which a server uses to choose its answer or its route. */
export type Match = (body: unknown) => boolean;

/** Holds when the request lists at least one tool. */
export const carriesTools: Match = (body) => {
	const tools = fieldOf(body, "tools");
	return Array.isArray(tools) && tools.length > 0;
};

/** Holds when the request asks for a streamed answer. */
export const streams: Match = (body) => fieldOf(body, "stream") === true;

/** Holds when the request names exactly `model`. */
export const byModel =
	(model: string): Match =>
	(body) =>
		fieldOf(body, "model") === model;

/** Holds when every one of `matches` holds, so a probe can say "streams and carries tools" in one line. */
export const allOf =
	(...matches: readonly Match[]): Match =>
	(body) =>
		matches.every((match) => match(body));

/** The text of each block of the request's `system`, which is one string or a list of blocks. */
export const systemTexts = (body: unknown): string[] => {
	const system = fieldOf(body, "system");
	return Array.isArray(system)
		? system.map((block) => String(fieldOf(block, "text") ?? ""))
		: [String(system ?? "")];
};

const CLASSIFIER_OPENING =
	"You are a security monitor for autonomous AI coding agents.";

/** The classifier sends no tools and has no fixed position among the requests, so its text names it. */
export const classifies: Match = (body) =>
	systemTexts(body).some((text) => text.startsWith(CLASSIFIER_OPENING));

/** `classifies` for a body that is still text; it throws on text that is not JSON. */
export const isClassifier = (raw: string): boolean =>
	classifies(JSON.parse(raw));

/** Holds for a body whose text contains any of `markers`; a reworded prompt silently stops matching. */
export const mentionsAny =
	(markers: readonly string[]) =>
	(raw: string): boolean =>
		markers.some((marker) => raw.includes(marker));
