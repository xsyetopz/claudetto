// Usage: bun scripts/vendor-rules.ts   (or `just vendor-rules`)
// Builds the gate's command rules from kaplanelad/shellfirm (Apache-2.0), then applies our patch on top.
// Only data is read from the download (YAML and LICENSE); nothing from it is imported or run.
import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { file as bunFile, spawn, write, YAML } from "bun";

const SOURCE = "https://github.com/kaplanelad/shellfirm";
const COMMIT = "f9a867dd05a9467f6550f6228a62c33d5c37ce23";
const SHA256 =
	"d43ab61e72c05f80c4402fc0b01517d80db205089362fac109c210dff5893a51";
const GROUPS = ["fs", "git", "shell"];
const SEVERITY = new Map([
	["Critical", "deny"],
	["High", "ask"],
]);
const GATE = new URL("../plugins/claudetto/hooks/gate/", import.meta.url);
const LEADING_FLAGS = /^\(\?([a-z]+)\)/;
const JS_FLAGS = /[^ims]/g;

const fail = (message: string): never => {
	throw new Error(`vendor-rules: ${message}`);
};
const record = (v: unknown, what: string): Record<string, unknown> =>
	typeof v === "object" && v !== null && !Array.isArray(v)
		? Object.fromEntries(Object.entries(v))
		: fail(`${what} is not a map`);
const list = (v: unknown, what: string): unknown[] =>
	Array.isArray(v) ? v : fail(`${what} is not a list`);
const text = (v: unknown, what: string): string =>
	typeof v === "string" ? v : fail(`${what} is not a string`);
const decision = (v: unknown, what: string): "deny" | "ask" =>
	v === "deny" || v === "ask" ? v : fail(`${what} is not deny or ask`);
const feed = (v: unknown, what: string): "raw" | "parsed" =>
	v === "raw" || v === "parsed" ? v : fail(`${what} is not raw or parsed`);

interface Filter {
	type: string;
	value: string;
}
interface Rule {
	id: string;
	decision: "deny" | "ask";
	description: string;
	feed: "raw" | "parsed";
	regex: string;
	flags: string;
	filters: Filter[];
}
interface Fixture {
	test: string;
	expect_ids: string[];
}

// Rust's leading `(?i)` is the one regex syntax JavaScript lacks that the kept rules use.
const toJs = (pattern: string): { regex: string; flags: string } => {
	const lead = LEADING_FLAGS.exec(pattern);
	const regex = lead ? pattern.slice(lead[0].length) : pattern;
	const flags = (lead?.[1] ?? "").replace(JS_FLAGS, "");
	try {
		return { regex: new RegExp(regex, flags).source, flags };
	} catch (error) {
		return fail(`regex does not compile in JavaScript: ${pattern} (${error})`);
	}
};

const download = async (into: string): Promise<string> => {
	const response = await fetch(
		`https://api.github.com/repos/kaplanelad/shellfirm/tarball/${COMMIT}`,
	);
	if (!response.ok) {
		fail(`download failed: HTTP ${response.status}`);
	}
	const bytes = new Uint8Array(await response.arrayBuffer());
	const found = createHash("sha256").update(bytes).digest("hex");
	if (found !== SHA256) {
		fail(`tarball sha256 is ${found}, expected ${SHA256}`);
	}
	const archive = join(into, "shellfirm.tgz");
	await write(archive, bytes);
	const untar = spawn(["tar", "-xzf", archive, "-C", into], {
		stderr: "pipe",
	});
	if ((await untar.exited) !== 0) {
		fail(`tar failed: ${await new Response(untar.stderr).text()}`);
	}
	const top = (await readdir(into)).find((n) => n.startsWith("kaplanelad-"));
	return top ? join(into, top) : fail("tarball has no top folder");
};

const yaml = async (path: string, what: string): Promise<unknown[]> =>
	list(YAML.parse(await bunFile(path).text()), what);

const upstreamRules = (group: string, entries: unknown[]): Rule[] =>
	entries.flatMap((entry) => {
		const r = record(entry, `a ${group} rule`);
		const id = text(r.id, "a rule id");
		const verdict = SEVERITY.get(
			text(r.severity ?? "Medium", `${id} severity`),
		);
		return verdict && !id.startsWith("fs-strict:")
			? [
					{
						id,
						decision: decision(verdict, id),
						description: text(r.description, `${id} description`),
						feed: group === "shell" ? "raw" : "parsed",
						...toJs(text(r.test, `${id} test`)),
						filters: list(r.filters ?? [], `${id} filters`).flatMap((f) => {
							const { type, value } = record(f, `${id} filter`);
							const kind = text(type, `${id} filter type`);
							// A `PathExists` filter asks whether a file exists, which the gate does not check, so it is left out and the rule applies whether or not the path exists.
							if (kind === "PathExists") {
								return [];
							}
							const pattern = text(value, `${id} filter value`);
							toJs(pattern);
							return [{ type: kind, value: pattern }];
						}),
					},
				]
			: [];
	});

const fixtureList = (entries: unknown[]): Fixture[] =>
	entries.map((entry) => {
		const f = record(entry, "a fixture");
		return {
			test: text(f.test, "a fixture test"),
			expect_ids: list(f.expect_ids, "expect_ids").map((id) =>
				text(id, "an expected id"),
			),
		};
	});

const applyPatch = (
	upstream: Rule[],
	patch: Record<string, unknown>,
): Rule[] => {
	const disable = list(patch.disable, "disable").map((id) =>
		text(id, "disable id"),
	);
	const override = list(patch.override, "override").map((o) => {
		const { id, decision: d } = record(o, "an override");
		text(record(o, "an override").evidence, "an override's evidence");
		return { id: text(id, "override id"), decision: decision(d, "override") };
	});
	const known = new Set(upstream.map((r) => r.id));
	for (const id of [...disable, ...override.map((o) => o.id)]) {
		if (!known.has(id)) {
			fail(`patch names ${id}, which matches no upstream rule`);
		}
	}
	const decided = new Map(override.map((o) => [o.id, o.decision]));
	const added: Rule[] = list(patch.add, "add").map((entry) => {
		const a = record(entry, "an added rule");
		const id = text(a.id, "an added id");
		return {
			id,
			decision: decision(a.decision, id),
			description: text(a.description, `${id} description`),
			feed: feed(a.feed ?? "parsed", id),
			...toJs(text(a.regex, `${id} regex`)),
			filters: [],
		};
	});
	return [
		...upstream
			.filter((r) => !disable.includes(r.id))
			.map((r) => ({ ...r, decision: decided.get(r.id) ?? r.decision })),
		...added,
	];
};

const scratch = await mkdtemp(join(tmpdir(), "vendor-rules-"));
try {
	const root = `${await download(scratch)}/shellfirm`;
	const groups = await Promise.all(
		GROUPS.map(async (g) => ({
			rules: upstreamRules(g, await yaml(`${root}/checks/${g}.yaml`, g)),
			fixtures: fixtureList(await yaml(`${root}/tests/checks/${g}.yaml`, g)),
		})),
	);
	const upstream = groups.flatMap((g) => g.rules);
	const patch = record(
		await bunFile(new URL("rules.patch.json", GATE)).json(),
		"the patch",
	);
	const rules = applyPatch(upstream, patch);
	const live = new Set(rules.map((r) => r.id));
	// A fixture stays when every id it expects is a rule that still runs, or when it expects nothing.
	const all = groups.flatMap((g) => g.fixtures);
	const fixtures = all.filter((f) => f.expect_ids.every((id) => live.has(id)));
	// A hooks module can import only code files, so the data is written as a TypeScript module.
	const data = JSON.stringify(
		{
			source: SOURCE,
			commit: COMMIT,
			sha256: SHA256,
			license: "Apache-2.0",
			rules,
			fixtures,
		},
		null,
		"\t",
	);
	await write(
		new URL("rules.generated.ts", GATE),
		`// Generated by scripts/vendor-rules.ts from rules.patch.json and ${SOURCE}; do not edit.\nexport const GENERATED = ${data} as const;\n`,
	);
	await write(new URL("rules.LICENSE", GATE), bunFile(`${root}/../LICENSE`));
	console.info(
		`${upstream.length} upstream rules, ${rules.length} after the patch; ${fixtures.length} of ${all.length} fixtures kept`,
	);
} finally {
	await rm(scratch, { recursive: true, force: true });
}
