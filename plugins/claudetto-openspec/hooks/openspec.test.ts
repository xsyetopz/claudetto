import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { memory } from "./memory-fs.ts";

const TOOL = "mcp__claudetto-openspec__openspec";
const C = "/repo/openspec/changes";
const delta = (head: string, body = "The system SHALL x.") =>
	`## ${head} Requirements\n\n### Requirement: Thing\n${body}\n\n#### Scenario: S\n- **WHEN** a\n- **THEN** b\n`;
const base =
	"# cap Specification\n\n## Purpose\nA purpose long enough to pass the strict length check here.\n\n## Requirements\n\n### Requirement: Thing\nThe system SHALL x.\n\n#### Scenario: S\n- **WHEN** a\n- **THEN** b\n\n#### Scenario: T\n- **WHEN** c\n- **THEN** d\n";
const change = (extra: Record<string, string> = {}) => ({
	[`${C}/c/proposal.md`]: "# P\n",
	[`${C}/c/tasks.md`]: "- [x] 1.1 done\n",
	[`${C}/c/specs/cap/spec.md`]: delta("ADDED", "The system SHALL y."),
	...extra,
});

const call = async (
	$: Engine,
	input: { action?: string; change?: string; yes?: boolean; force?: boolean },
) => {
	const out = await $.tool.call({ tool: TOOL, ...input });
	return typeof out.result === "string" ? out.result : "";
};

test("The tool is registered deferred under the plugin's name", async ($: Engine, on: On) => {
	const seen: { name: string; isDeferred?: boolean }[] = [];
	on("session.start", () => ({ cwd: "/repo" }));
	on("tool.register", (_$, e) => {
		seen.push(e);
		return { value: { tool: `mcp__claudetto-openspec__${e.name}` } };
	});
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: false });
	expect(seen.map((s) => [s.name, s.isDeferred])).toEqual([["openspec", true]]);
});

test("Validate Call: reports and runs no process", async ($: Engine, on: On) => {
	const { runs } = memory(on, change());
	const out = await call($, { action: "validate", change: "c" });
	expect(out).toBe("c: valid");
	expect(runs).toEqual([]);
});

test("Validate is the default action", async ($: Engine, on: On) => {
	memory(on, change());
	expect(await call($, {})).toBe(await call($, { action: "validate" }));
});

test("No openspec folder: says so", async ($: Engine, on: On) => {
	memory(on, {});
	expect(await call($, {})).toContain("openspec");
});

test("A change name that is a path is refused", async ($: Engine, on: On) => {
	const { runs } = memory(on, change());
	const out = await call($, { action: "archive", change: "../c" });
	expect(out).toContain("../c");
	expect(runs).toEqual([]);
});

test("Status lists each open task as its line with the line number", async ($: Engine, on: On) => {
	memory(
		on,
		change({ [`${C}/c/tasks.md`]: "- [x] 1.1 done\n- [ ] 1.2 open\n" }),
	);
	const out = await call($, { action: "status", change: "c" });
	expect(out).toContain("- [ ] 1.2 open");
	expect(out).toContain("2");
});

test("Status without a change lists the changes", async ($: Engine, on: On) => {
	memory(on, change());
	expect(await call($, { action: "status" })).toContain("c");
});

test("Archive Refuses Open Tasks: names 1.2 and moves nothing", async ($: Engine, on: On) => {
	const { runs, tree } = memory(
		on,
		change({ [`${C}/c/tasks.md`]: "- [x] 1.1 a\n- [ ] 1.2 open\n" }),
	);
	const out = await call($, { action: "archive", change: "c" });
	expect(out).toContain("1.2");
	expect(runs).toEqual([]);
	expect(tree.has("/repo/openspec/specs/cap/spec.md")).toBe(false);
});

test("Archive has no override for open tasks (#2006, #1652)", async ($: Engine, on: On) => {
	const { runs } = memory(
		on,
		change({ [`${C}/c/tasks.md`]: "- [ ] 1.1 open\n" }),
	);
	await call($, { action: "archive", change: "c", yes: true, force: true });
	expect(runs).toEqual([]);
});

test("Archive merges, moves with mv, and writes the main spec", async ($: Engine, on: On) => {
	const { runs, tree } = memory(on, change());
	const out = await call($, { action: "archive", change: "c" });
	expect(runs.map((r) => r[0])).toEqual(["mkdir", "mv"]);
	expect(out).toContain(
		"Archived c to /repo/openspec/changes/archive/2026-11-06-c",
	);
	expect(tree.get("/repo/openspec/specs/cap/spec.md")).toContain(
		"The system SHALL y.",
	);
});

test("A Notes File beside a Delta: validation names it and archive merges nothing (#2173)", async ($: Engine, on: On) => {
	const { runs, tree } = memory(
		on,
		change({ [`${C}/c/specs/cap/notes/extra.md`]: "notes\n" }),
	);
	expect(await call($, { action: "validate", change: "c" })).toContain(
		"notes/extra.md",
	);
	expect(await call($, { action: "archive", change: "c" })).toContain(
		"notes/extra.md",
	);
	expect(runs).toEqual([]);
	expect(tree.has("/repo/openspec/specs/cap/spec.md")).toBe(false);
});

test("An unknown delta section fails validation (#2195)", async ($: Engine, on: On) => {
	memory(
		on,
		change({
			[`${C}/c/specs/cap/spec.md`]: `${delta("ADDED")}\n## CHANGED Requirements\n\n### Requirement: Z\nThe system SHALL z.\n`,
		}),
	);
	expect(await call($, { change: "c" })).toContain("CHANGED");
});

test("Validate fails what archive would refuse (#1112)", async ($: Engine, on: On) => {
	const files = change({
		[`${C}/c/specs/cap/spec.md`]: delta(
			"MODIFIED",
			"The system SHALL y.",
		).replace("Thing", "Missing"),
		"/repo/openspec/specs/cap/spec.md": base,
	});
	const { runs } = memory(on, files);
	const v = await call($, { change: "c" });
	const a = await call($, { action: "archive", change: "c" });
	expect(v).toContain("Missing");
	expect(a).toContain("Missing");
	expect(runs).toEqual([]);
});

test("MODIFIED that drops a scenario fails (kept from upstream)", async ($: Engine, on: On) => {
	memory(
		on,
		change({
			[`${C}/c/specs/cap/spec.md`]: delta("MODIFIED", "The system SHALL y."),
			"/repo/openspec/specs/cap/spec.md": base,
		}),
	);
	expect(await call($, { change: "c" })).toContain("T");
});

test("MODIFIED that replaces a scenario by two keeps upstream's verdict: invalid, naming the omitted one (#1697)", async ($: Engine, on: On) => {
	const scenario = (n: string) =>
		`#### Scenario: ${n}\n- **WHEN** a\n- **THEN** b\n`;
	memory(
		on,
		change({
			[`${C}/c/specs/cap/spec.md`]: `## MODIFIED Requirements\n\n### Requirement: Thing\nThe system SHALL x.\n\n${scenario("S1")}\n${scenario("S2")}\n${scenario("T")}`,
			"/repo/openspec/specs/cap/spec.md": base,
		}),
	);
	const out = await call($, { change: "c" });
	expect(out).toContain("c: INVALID");
	expect(out).toContain('omits scenario(s) the current spec still has: "S"');
});

test("File Compatibility: x- keys in .openspec.yaml are read and kept", async ($: Engine, on: On) => {
	const yaml = "schema: spec-driven\nx-owner: me\ncreated: 2026-01-01\n";
	const { tree } = memory(on, change({ [`${C}/c/.openspec.yaml`]: yaml }));
	expect(await call($, { change: "c" })).toBe("c: valid");
	expect(tree.get(`${C}/c/.openspec.yaml`)).toBe(yaml);
});

test("skip_specs with a malformed .openspec.yaml is reported", async ($: Engine, on: On) => {
	memory(
		on,
		change({
			[`${C}/c/.openspec.yaml`]: "skip_specs: true\nschema: [unclosed\n",
		}),
	);
	expect(await call($, { change: "c" })).toContain("c: INVALID");
});
