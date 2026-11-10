import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	ALLOCATION_ARMS,
	allocationOf,
	ARTEMIS_FILE,
	HAIKU,
	preparePlugins,
	withArtemisModel,
} from "../alloc/arms.ts";
import {
	parseAllocationArgs,
	planAllocation,
	planLines,
} from "../alloc/main.ts";
import { sessionArgv } from "../session.ts";

const options = () => {
	const parsed = parseAllocationArgs(["--runs", "2"]);
	if ("error" in parsed) {
		throw new Error(parsed.error);
	}
	return parsed;
};

describe("the allocation plan", () => {
	test("lists cases times four arms times the runs, with each arm's model", () => {
		const cases = [{ codes: ["K"] }, { codes: ["Z"] }] as never;
		const sessions = planAllocation(cases, new Set(["K", "Z"]), options());
		expect(sessions).toHaveLength(2 * 4 * 2);
		const lines = planLines(sessions);
		expect(lines).toContain("model calls: 16");
		expect(
			lines.some((l) => l.includes("| opusplan | run 1 | model opusplan")),
		).toBe(true);
		expect(
			lines.some((l) => l.includes(`CLAUDE_CODE_SUBAGENT_MODEL=${HAIKU}`)),
		).toBe(true);
	});

	test("an unseeded case adds no session", () => {
		const cases = [{ codes: ["K"] }] as never;
		expect(planAllocation(cases, new Set(), options())).toHaveLength(0);
	});

	test("an unknown arm is an error", () => {
		expect("error" in parseAllocationArgs(["--arm", "nope"])).toBe(true);
	});
});

describe("the arms", () => {
	test("only the subagent arm sets the env, and only opusplan changes --model", () => {
		const envs = ALLOCATION_ARMS.filter(
			(arm) => "CLAUDE_CODE_SUBAGENT_MODEL" in allocationOf(arm).env,
		);
		expect(envs).toEqual(["one subagent model"]);
		const models = ALLOCATION_ARMS.filter(
			(arm) => allocationOf(arm).model === "opusplan",
		);
		expect(models).toEqual(["opusplan"]);
	});

	test("the model reaches the argv", () => {
		const argv = sessionArgv("root prompt", {
			prompt: "p",
			pluginDir: "/x",
			model: allocationOf("opusplan").model,
		});
		expect(argv.join(" ")).toContain("--model opusplan");
	});

	test("Artemis.md gains one model line inside its frontmatter", () => {
		const out = withArtemisModel("---\nname: Artemis\n---\nbody");
		expect(out).toBe(`---\nmodel: ${HAIKU}\nname: Artemis\n---\nbody`);
		expect(() => withArtemisModel("---\nmodel: x\n---\n")).toThrow();
		expect(() => withArtemisModel("no frontmatter")).toThrow();
	});

	test("the plugin copy names haiku and the tree's file stays unchanged", async () => {
		const root = await mkdtemp(join(tmpdir(), "alloc-"));
		const dirs = await preparePlugins(
			join(import.meta.dir, "..", "..", ".."),
			root,
		);
		const copy = await readFile(
			join(dirs["Artemis on haiku"], ARTEMIS_FILE),
			"utf8",
		);
		const own = await readFile(join(dirs.control, ARTEMIS_FILE), "utf8");
		expect(copy).toContain(`model: ${HAIKU}`);
		expect(own).not.toContain("model:");
	});
});
