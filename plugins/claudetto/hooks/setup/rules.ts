import type { EngineInterface } from "claude-code";

import { ask, SKIP, textOf, WRITE, writeFile } from "./engine.ts";

export const RULES = [
	"useLeastCode",
	"noUnrequestedEdits",
	"noImpossibleStateGuards",
	"findFactsByExperiment",
	"useOneObviousWay",
	"useBlockLanguage",
	"lookForAClone",
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

/** The line for one rule, or `undefined` when the user holds it as shipped. */
async function offerRule(
	$: EngineInterface,
	dir: string,
	name: string,
): Promise<string | undefined> {
	const shipped = await textOf($, `${$.plugin.root}/rules/${name}.md`);
	const path = `${dir}/rules/claudetto/${name}.md`;
	if (shipped === undefined || shipped === (await textOf($, path))) {
		return undefined;
	}
	try {
		const answer = await ask(
			$,
			`Copy the ${name} rule to ${path}? A session loads it at its start.\n\n${shipped.trim()}`,
			[WRITE, SKIP],
		);
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
	dir: string,
	index: number,
	done: string[],
): Promise<string[]> {
	const name = RULES[index];
	if (name === undefined || done.at(-1) === DISMISSED) {
		return done;
	}
	const line = await offerRule($, dir, name);
	return offerFrom(
		$,
		dir,
		index + 1,
		line === undefined ? done : [...done, line],
	);
}

/** One dialog per rule the user lacks or holds in another form; a dismissed one ends the rest, as nobody is there to answer. */
export async function rulesPart(
	$: EngineInterface,
	dir: string,
): Promise<string> {
	const report = await offerFrom($, dir, 0, []);
	return report.length === 0
		? "The code rules are up to date."
		: report.join("\n");
}

async function dayOf($: EngineInterface, path: string): Promise<string> {
	const found = await $.fs.stat(path);
	return new Date(found.mtimeMs).toISOString().slice(0, 10);
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
	const kind =
		(await $.store.get(hashKey(name))) === heldHash ? "updated" : "modified";
	$.ui.log(
		`The ${name} rule is ${kind}: shipped ${shippedHash.slice(0, 8)} (${await dayOf($, from)}), installed ${heldHash.slice(0, 8)} (${await dayOf($, path)}). Run /${setup}.`,
	);
	await $.store.set(seenKey(name), pair);
}
