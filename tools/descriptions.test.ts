import { expect, test } from "bun:test";

import { Glob } from "bun";

import {
	TOOL_DESCRIPTION,
	TOOL_INPUT_SCHEMA,
} from "../plugins/claudetto-openspec/hooks/texts.ts";
import { DECIDE_SPEC } from "../plugins/claudetto/hooks/texts-gate.ts";
import {
	HANDOFF_TOOL,
	TOOL_HANDOFF,
} from "../plugins/claudetto/hooks/texts-handoff.ts";
import {
	AGENT_TEXT,
	ASK_TEXT,
	MONITOR_SPEC,
	REPLY_SPEC,
	TOOL_TEXTS,
} from "../plugins/claudetto/hooks/texts.ts";

const LIMIT = 200;
const ROOT = `${import.meta.dir}/..`;

type Described = readonly [source: string, text: string];

const scan = (pattern: string): Promise<string[]> =>
	Array.fromAsync(new Glob(pattern).scan(ROOT));

/** Each `description` string at any depth of a JSON schema or manifest value. */
const descriptionsIn = (source: string, value: unknown): Described[] =>
	typeof value === "object" && value !== null
		? Object.entries(value).flatMap(([key, child]): Described[] =>
				key === "description" && typeof child === "string"
					? [[source, child]]
					: descriptionsIn(`${source}.${key}`, child),
			)
		: [];

const manifests = async (): Promise<Described[]> => {
	const paths = await scan("plugins/*/.claude-plugin/plugin.json");
	const found = await Promise.all(
		paths.map(async (path): Promise<Described[]> =>
			descriptionsIn(path, await Bun.file(`${ROOT}/${path}`).json()),
		),
	);
	return found.flat();
};

// A line match, not a YAML parse: Claude Code reads a plain scalar that holds `: `, which YAML refuses.
const frontmatterDescription = async (path: string): Promise<Described> => {
	const text = await Bun.file(`${ROOT}/${path}`).text();
	const head = /^---\n([\s\S]*?)\n---/u.exec(text)?.[1] ?? "";
	const line = /^description:[ \t]*(.*)$/mu.exec(head)?.[1] ?? "";
	return [path, line.replace(/^"(.*)"$/u, "$1")];
};

const frontmatters = async (): Promise<Described[]> => {
	const groups = await Promise.all(
		[
			"plugins/*/skills/*/SKILL.md",
			"plugins/*/commands/*.md",
			"plugins/*/agents/*.md",
			"plugins/*/output-styles/*.md",
		].map((pattern) => scan(pattern)),
	);
	return Promise.all(groups.flat().map((path) => frontmatterDescription(path)));
};

const SPECS = {
	monitor: MONITOR_SPEC,
	reply: REPLY_SPEC,
	decide: DECIDE_SPEC,
	handoff: { name: HANDOFF_TOOL, description: TOOL_HANDOFF },
	openspec: {
		name: "openspec",
		description: TOOL_DESCRIPTION,
		inputSchema: TOOL_INPUT_SCHEMA,
	},
};

const registered = (): Described[] =>
	Object.entries(SPECS).flatMap(([name, spec]) =>
		descriptionsIn(`tool ${name}`, spec),
	);

const rewritten = (): Described[] => [
	...Object.entries(TOOL_TEXTS).map(([tool, text]): Described => [
		`TOOL_TEXTS.${tool}`,
		text,
	]),
	["AGENT_TEXT", AGENT_TEXT],
	["ASK_TEXT", ASK_TEXT],
];

const registerArguments = async (path: string): Promise<string[]> => {
	const text = await Bun.file(`${ROOT}/${path}`).text();
	return [...text.matchAll(/\$\.tool\.register\(\s*([A-Za-z_]+|\{)/gu)].map(
		(m) => m[1] ?? "",
	);
};

test("the specs above cover each $.tool.register call of a plugin", async () => {
	const paths = await scan("plugins/*/hooks/**/*.ts");
	const sources = paths.filter((path) => !/\.(?:test|mock)\.ts$/u.test(path));
	const found = await Promise.all(
		sources.map((path) => registerArguments(path)),
	);
	// `spec` is the handoff tool's, `{` the openspec tool's inline spec.
	expect(new Set(found.flat())).toEqual(
		new Set(["DECIDE_SPEC", "MONITOR_SPEC", "spec", "{"]),
	);
});

test(`no description the model sees is over ${LIMIT} characters`, async () => {
	const all = [
		...(await manifests()),
		...(await frontmatters()),
		...registered(),
		...rewritten(),
	];
	expect(all.length).toBeGreaterThan(40);
	const over = all
		.filter(([, text]) => text.length > LIMIT)
		.map(([source, text]) => `${source}: ${text.length}`);
	expect(over).toEqual([]);
});
