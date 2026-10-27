// A tool that a deny text of claudetto points to is ready to call (task 19.15 of change `redesign-0-4-0`): a stuck agent stops, or picks a workaround that breaks the rule.
// A tool behind `ToolSearch` needs one more call first, so no such tool may be in `DEFERRED_TOOLS`.

import { expect, test } from "bun:test";
import path from "node:path";
import { Glob } from "bun";
import { DEFERRED_TOOLS } from "../../plugins/claudetto/modules/session/prompt/domain/tools.ts";
import { REPO } from "../support/repo.ts";

const MODULES = path.join(REPO, "plugins/claudetto/modules");
const DENY = /^DENY_|_DENY$/;

/** An argument for which each field reads as `x`, so a deny text with fields renders. */
const FIELDS = new Proxy({}, { get: () => "x" });

/** The names in backticks of the text `text`. */
const quoted = (text: string): string[] =>
	[...text.matchAll(/`([A-Za-z][\w]*)`/g)].map((m) => m[1] ?? "");

/** The deny texts of each `prompts.ts` of the core plugin, by export name. */
const denyTexts = async (): Promise<Record<string, string>> => {
	const texts: Record<string, string> = {};
	const files = [...new Glob("**/prompts.ts").scanSync(MODULES)];
	const loaded = await Promise.all(
		files.map(
			async (file): Promise<[string, Record<string, unknown>]> => [
				file,
				await import(path.join(MODULES, file)),
			],
		),
	);
	for (const [file, exports] of loaded) {
		for (const [name, value] of Object.entries(exports)) {
			if (DENY.test(name)) {
				texts[`${file} ${name}`] =
					typeof value === "function" ? String(value(FIELDS)) : String(value);
			}
		}
	}
	return texts;
};

test("no tool that a deny text names is deferred", async () => {
	const texts = await denyTexts();
	const deferred = Object.entries(texts).flatMap(([name, text]) =>
		quoted(text)
			.filter((tool) => DEFERRED_TOOLS.includes(tool))
			.map((tool) => `${name}: ${tool}`),
	);
	expect(deferred).toEqual([]);
});

test("the scan finds the tools that the deny texts name", async () => {
	const names = new Set(Object.values(await denyTexts()).flatMap(quoted));
	for (const tool of ["Monitor", "TaskStop", "Edit", "Write"]) {
		expect(names.has(tool), tool).toBe(true);
	}
});
