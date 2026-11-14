import type { EngineInterface } from "claude-code";

import { isAbsent } from "../../absent";
import {
	type Advice,
	ask,
	type Question,
	SKIP,
	textOf,
	WRITE,
	writeFile,
} from "./engine";

export const RULES = [
	"useLeastCode",
	"scopeEditsToGoal",
	"guardOnlyTrustBoundaries",
	"findFactsByExperiment",
	"useOneObviousWay",
	"useBlockLanguage",
	"lookForClone",
	"useHeadlineseNames",
	"commentOnlyWhy",
	"useEdgeCaseReport",
];

const hashKey = (name: string) => `rules:${name}:hash`;
const seenKey = (name: string) => `rules:${name}:reported`;

const sha256 = async (text: string): Promise<string> =>
	Array.from(
		new Uint8Array(
			await crypto.subtle.digest(
				"SHA-256",
				new Uint8Array(new TextEncoder().encode(text)),
			),
		),
		(byte) => byte.toString(16).padStart(2, "0"),
	).join("");

const DISMISSED = "Wrote no further rules: the question was dismissed.";

/** The copy offer for one rule, or `undefined` when the user holds it as shipped. */
async function ruleOffer(
	$: EngineInterface,
	dir: string,
	name: string,
): Promise<{ question: Question; path: string; shipped: string } | undefined> {
	const shipped = await textOf($, `${$.plugin.root}/rules/${name}.md`);
	const path = `${dir}/rules/claudetto/${name}.md`;
	if (shipped === undefined || shipped === (await textOf($, path))) {
		return undefined;
	}
	return {
		question: {
			text: `Copy the ${name} rule to ${path}? A session loads it at its start.\n\n${shipped.trim()}`,
			options: [WRITE, SKIP],
		},
		path,
		shipped,
	};
}

/** The line for one rule, or `undefined` when the user holds it as shipped. */
async function offerRule(
	$: EngineInterface,
	dir: string,
	name: string,
	advice: Advice,
): Promise<string | undefined> {
	const offer = await ruleOffer($, dir, name);
	if (offer === undefined) {
		return undefined;
	}
	const { question, path, shipped } = offer;
	try {
		const answer = await ask($, question, advice);
		if (answer.trim() !== WRITE) {
			return `Skipped the ${name} rule.`;
		}
		const failed = await writeFile($, path, shipped);
		if (failed === undefined) {
			await $.store.set(hashKey(name), await sha256(shipped));
		}
		return failed ?? `Wrote ${path}.`;
	} catch (error) {
		$.ui.log(`The ${name} rule was not offered or written (${String(error)})`);
		return DISMISSED;
	}
}

async function offerFrom(
	$: EngineInterface,
	advice: Advice,
	dir: string,
	index: number,
	done: string[],
): Promise<string[]> {
	const name = RULES[index];
	if (name === undefined || done.at(-1) === DISMISSED) {
		return done;
	}
	const line = await offerRule($, dir, name, advice);
	return offerFrom(
		$,
		advice,
		dir,
		index + 1,
		line === undefined ? done : [...done, line],
	);
}

const DELETE = "Delete";

/** The `.md` files in the rules folder whose name no shipped rule holds. */
async function strayRules(
	$: EngineInterface,
	folder: string,
): Promise<string[]> {
	try {
		const entries = await $.fs.list(folder);
		return entries
			.filter(
				(entry) =>
					entry.kind === "file" &&
					entry.name.endsWith(".md") &&
					!RULES.includes(entry.name.slice(0, -".md".length)),
			)
			.map((entry) => entry.name);
	} catch (error) {
		if (!isAbsent(error)) {
			$.ui.log(`The folder ${folder} was not listed (${String(error)})`);
		}
		return [];
	}
}

const strayQuestion = (folder: string, names: readonly string[]): Question => ({
	text: `Delete these rules from ${folder}? Claudetto no longer ships them.\n\n${names.map((name) => `- ${name}`).join("\n")}`,
	options: [DELETE, SKIP],
});

/** One dialog that lists each installed rule claudetto no longer ships, and removes them on yes. */
async function offerStray(
	$: EngineInterface,
	dir: string,
	advice: Advice,
): Promise<string | undefined> {
	const folder = `${dir}/rules/claudetto`;
	const names = await strayRules($, folder);
	if (names.length === 0) {
		return undefined;
	}
	try {
		const answer = await ask($, strayQuestion(folder, names), advice);
		if (answer.trim() !== DELETE) {
			return "Kept the rules that claudetto no longer ships.";
		}
		const results = await Promise.all(
			names.map((name) =>
				$.process.run(["rm", "--", `${folder}/${name}`], { timeoutMs: 5000 }),
			),
		);
		return results.every((result) => result.exitCode === 0)
			? `Deleted ${names.join(", ")} from ${folder}.`
			: `Could not delete every rule that claudetto no longer ships from ${folder}.`;
	} catch (error) {
		$.ui.log(`The stray rules were not offered or deleted (${String(error)})`);
		return DISMISSED;
	}
}

/** The rule and stray-rule questions a setup run can ask. */
export async function ruleQuestions(
	$: EngineInterface,
	dir: string,
): Promise<Question[]> {
	const folder = `${dir}/rules/claudetto`;
	const names = await strayRules($, folder);
	const offers = await Promise.all(
		RULES.map((name) => ruleOffer($, dir, name)),
	);
	return [
		...offers.flatMap((offer) => (offer === undefined ? [] : [offer.question])),
		...(names.length === 0 ? [] : [strayQuestion(folder, names)]),
	];
}

/** One dialog per rule the user lacks or holds in another form, then one for the rules claudetto no longer ships; a dismissed one ends the rest, as nobody is there to answer. */
export async function rulesPart(
	$: EngineInterface,
	dir: string,
	advice: Advice,
): Promise<string> {
	const offered = await offerFrom($, advice, dir, 0, []);
	const stray =
		offered.at(-1) === DISMISSED ? undefined : await offerStray($, dir, advice);
	const report = stray === undefined ? offered : [...offered, stray];
	return report.length === 0
		? "The code rules are up to date."
		: report.join("\n");
}

/** The day a file was last changed, or `undefined` when it is gone. */
async function dayOf(
	$: EngineInterface,
	path: string,
): Promise<string | undefined> {
	try {
		const found = await $.fs.stat(path);
		return new Date(found.mtimeMs).toISOString().slice(0, 10);
	} catch (error) {
		if (isAbsent(error)) {
			return undefined;
		}
		throw error;
	}
}

/** The saved hash decides updated or modified, not the dates: a plugin install likely stamps every shipped file anew. */
export async function reportRule(
	$: EngineInterface,
	dir: string,
	name: string,
	setup: string,
): Promise<void> {
	const from = `${$.plugin.root}/rules/${name}.md`;
	const path = `${dir}/rules/claudetto/${name}.md`;
	const [shipped, held] = [await textOf($, from), await textOf($, path)];
	if (shipped === undefined || held === undefined) {
		return;
	}
	const [shippedHash, heldHash] = [await sha256(shipped), await sha256(held)];
	const pair = `${shippedHash}:${heldHash}`;
	if (shippedHash === heldHash || (await $.store.get(seenKey(name))) === pair) {
		return;
	}
	const [shippedDay, heldDay] = [await dayOf($, from), await dayOf($, path)];
	if (shippedDay === undefined || heldDay === undefined) {
		return;
	}
	const kind =
		(await $.store.get(hashKey(name))) === heldHash ? "updated" : "modified";
	$.ui.log(
		`The ${name} rule is ${kind}: shipped ${shippedHash.slice(0, 8)} (${shippedDay}), installed ${heldHash.slice(0, 8)} (${heldDay}). Run /${setup}.`,
	);
	await $.store.set(seenKey(name), pair);
}
