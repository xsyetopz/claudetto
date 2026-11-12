import { expect, test } from "bun:test";

import { Glob } from "bun";

import {
	EFFORTS,
	MODELS,
	settingsOf,
} from "../plugins/claudetto-you-should-know/hooks/settings.ts";

// The advisor asks these two beside the side-check models.
const ADVISOR_MODELS = ["claude-fable-5-2", "claude-mythos-5-2"];
const ROOT = `${import.meta.dir}/..`;
const SETTINGS_IMPORT =
	/import \{[^}]*\bsettingsOf\b[^}]*\} from "\.\/settings\.ts"/u;
const CALL = /\$\.model\s*\.complete\s*\(\s*\{/gu;
const OPENERS = "([{";
const CLOSERS = ")]}";

interface Call {
	readonly file: string;
	readonly line: number;
	readonly source: string;
	readonly fields: ReadonlyMap<string, string>;
}

/** The index after the comment, string, or template that starts at `at`, or `at` when none starts there. */
const skipQuoted = (text: string, at: number): number => {
	const open = text[at] ?? "";
	if (text.startsWith("//", at)) {
		const end = text.indexOf("\n", at);
		return end === -1 ? text.length : end;
	}
	if (text.startsWith("/*", at)) {
		const end = text.indexOf("*/", at + 2);
		return end === -1 ? text.length : end + 2;
	}
	if (open !== '"' && open !== "'" && open !== "`") {
		return at;
	}
	let i = at + 1;
	while (i < text.length && text[i] !== open) {
		i += text[i] === "\\" ? 2 : 1;
	}
	return i + 1;
};

/** The parts of the object literal whose `{` is at `open`, split at each comma that sits directly inside it. */
const partsOf = (text: string, open: number): string[] => {
	const parts: string[] = [];
	let depth = 0;
	let start = open + 1;
	let i = open;
	while (i < text.length) {
		const after = skipQuoted(text, i);
		const ch = text[i] ?? "";
		if (after !== i) {
			i = after;
			continue;
		}
		if (OPENERS.includes(ch)) {
			depth += 1;
		} else if (CLOSERS.includes(ch)) {
			depth -= 1;
		} else if (ch === "," && depth === 1) {
			parts.push(text.slice(start, i));
			start = i + 1;
		}
		if (depth === 0) {
			break;
		}
		i += 1;
	}
	return [...parts, text.slice(start, i)];
};

/** A part as `[key, value]`: `key: value` splits at its colon, a spread has the key `...`, and a shorthand names its own value. */
const fieldOf = (part: string): [string, string] | undefined => {
	const text = part.replaceAll(/\/\/.*$/gmu, "").trim();
	if (text.startsWith("...")) {
		return ["...", text.slice(3).trim()];
	}
	const named = /^([\w$]+)\s*(?::\s*([\s\S]*))?$/u.exec(text);
	return named?.[1] === undefined
		? undefined
		: [named[1], (named[2] ?? named[1]).trim()];
};

const callsIn = (file: string, source: string): Call[] =>
	[...source.matchAll(CALL)].map((m) => ({
		file,
		line: source.slice(0, m.index).split("\n").length,
		source,
		fields: new Map(
			partsOf(source, m.index + m[0].length - 1)
				.map((part) => fieldOf(part))
				.filter((f) => f !== undefined),
		),
	}));

/** The model IDs a call can send: a string literal or a same-file `const` that holds one, or every string of a same-file `const` object the call indexes. */
const modelsOf = (call: Call): string[] => {
	const value = call.fields.get("model") ?? "";
	const literal = /^["'`]([^"'`]*)["'`]$/u.exec(value);
	if (literal?.[1] !== undefined) {
		return [literal[1]];
	}
	const name = /^([\w$]+)(\[[^\]]*\])?$/u.exec(value);
	const body = new RegExp(
		`const ${name?.[1] ?? String.raw`\0`}\\s*(?::[^=]+)?=\\s*(\\{[^}]*\\}|["'\`][^"'\`]*["'\`])`,
		"u",
	).exec(call.source)?.[1];
	const kind = name?.[2] === undefined ? '"' : "{";
	return body?.startsWith(kind) === true
		? [...body.matchAll(/["'`]([^"'`]*)["'`]/gu)].map((m) => m[1] ?? "")
		: [];
};

/** Each fault of a call, as `file:line message`. */
const faultsOf = (call: Call): string[] => {
	const at = `${call.file}:${call.line}`;
	const faults: string[] = [];
	if (
		call.fields.get("...") === "settings" &&
		SETTINGS_IMPORT.test(call.source)
	) {
		return faults;
	}
	if (!call.fields.has("effort")) {
		faults.push(`${at} passes no effort`);
	}
	const models = modelsOf(call);
	if (
		models.length === 0 ||
		!models.every((m) => [...MODELS, ...ADVISOR_MODELS].includes(m))
	) {
		faults.push(
			`${at} model is ${call.fields.get("model") ?? "missing"}, which is not a full ID of ${MODELS.join(", ")}`,
		);
	}
	return faults;
};

const isShipped = (file: string): boolean =>
	!file.includes("node_modules") &&
	!file.endsWith(".d.ts") &&
	!file.endsWith(".test.ts") &&
	!file.endsWith(".mock.ts");

const callsOf = async (file: string): Promise<Call[]> =>
	callsIn(file, await Bun.file(`${ROOT}/${file}`).text());

const SETTINGS_HEAD = 'import { settingsOf } from "./settings.ts";\n';

const faultsAt = (body: string, head = ""): string[] =>
	callsIn("x.ts", `${head}await $.model.complete({ ${body} });`).flatMap(
		(call) => faultsOf(call),
	);

test("every $.model.complete call in plugins passes effort and a full model ID", async () => {
	const files = await Array.fromAsync(new Glob("plugins/**/*.ts").scan(ROOT));
	const found = await Promise.all(
		files.filter((file) => isShipped(file)).map((file) => callsOf(file)),
	);
	const calls = found.flat();

	expect(calls.length).toBeGreaterThan(0);
	expect(calls.flatMap((call) => faultsOf(call))).toEqual([]);
});

test("a call with an alias, an unvalidated spread, or no effort is a fault", () => {
	expect(faultsAt('model: "haiku", prompt: "p"')).toHaveLength(2);
	expect(faultsAt("...settings, prompt: p")).toHaveLength(2);
	expect(faultsAt("...other, prompt: p", SETTINGS_HEAD)).toHaveLength(2);
	expect(faultsAt('model: "claude-haiku-5-5", prompt: f(a, b)')).toHaveLength(
		1,
	);
	expect(
		faultsAt(
			'model: "claude-haiku-5-5", effort: "low", prompt: f(a, { b: 1 })',
		),
	).toEqual([]);
	expect(faultsAt("...settings, prompt: p", SETTINGS_HEAD)).toEqual([]);
});

test("the settings a spread carries are always inside the allowed models and efforts", () => {
	for (const model of ["haiku", "", 7, "claude-haiku-4-5", ...MODELS]) {
		for (const effort of ["extreme", 3, ...EFFORTS]) {
			const got = settingsOf({
				sideCheckModel: model,
				sideCheckEffortLevel: effort,
			});

			expect(MODELS).toContain(got.model);
			expect(EFFORTS).toContain(got.effort);
		}
	}
	expect(settingsOf({})).toEqual({ model: "claude-haiku-5-5", effort: "high" });
});
