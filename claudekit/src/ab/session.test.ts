import { describe, expect, test } from "bun:test";
import { mainRequests, readRequests } from "../fake/fake.ts";
import { DEFAULT_MODEL } from "../shared/model.ts";
import { tempDir } from "../shared/temp.ts";
import { launchArm, measuresByArm } from "./session.ts";

describe("launchArm", () => {
	test("runs one arm against its own fake, saves the request, and leaves no fake running", async () => {
		const arm = { name: "bare", plugins: [], model: DEFAULT_MODEL, expect: {} };
		const plan = { steps: [], fallback: { blocks: [{ type: "text" as const, text: "SESSION-OK." }] } };
		const { run, result, requests } = await launchArm(arm, { name: "hi", prompt: "hi" }, {
			probe: "unit",
			root: await tempDir("session"),
			plan,
			launch: { mode: "text", settingSources: [] },
		});
		expect(result.exitCode).toBe(0);
		expect(await Bun.file(result.files.stdout).text()).toContain("SESSION-OK.");
		expect(mainRequests(await readRequests(requests))[0]?.body.model).toBe(DEFAULT_MODEL);
		expect(result.record).toMatchObject({ arm: "bare", case: "hi" });
		const ps = Bun.spawnSync(["ps", "-Ao", "args"]).stdout.toString();
		expect(ps.includes(requests)).toBe(false);
		expect(requests.startsWith(run.dir)).toBe(true);
	});
});

describe("measuresByArm", () => {
	test("groups measures by arm and leaves out a session whose arm check failed", () => {
		const results = [
			{ arm: "a", runId: "1", armCheck: { ok: true } },
			{ arm: "a", runId: "2", armCheck: { ok: false } },
			{ arm: "b", runId: "3", armCheck: { ok: true } },
		];
		const measures = new Map([["1", 10], ["2", 20], ["3", 30]]);
		expect(measuresByArm(results, measures)).toEqual({ a: [10], b: [30] });
	});
});
