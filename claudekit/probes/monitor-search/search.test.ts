import { describe, expect, test } from "bun:test";
import { checkGrader } from "../../src/grade/grade.ts";
import { arms, measures, session } from "./probe.ts";
import { WRAPPER, measure, wrapperOnly } from "./search.ts";

const arm = (name: string) => {
	const a = arms.find((x) => x.name === name);
	if (!a) {
		throw new Error(`arm ${name}: absent`);
	}
	return a;
};

describe("wrapperOnly", () => {
	test("passes its good fixture and fails its bad ones", async () => {
		expect(await checkGrader(wrapperOnly)).toMatchObject({ ok: true });
	});
});

describe("measure", () => {
	test("counts UTF-8 bytes of each tool the later request added", () => {
		const before = { tools: [{ name: "Bash" }] };
		const after = { tools: [{ name: "Bash" }, { name: "Monitor", description: "a → b" }] };
		expect(measure(before, after)).toEqual({
			loaded: [{ name: "Monitor", bytes: Buffer.byteLength(JSON.stringify(after.tools[1])) }],
			monitorUpFront: false,
		});
		expect(measure(before, { tools: [{ name: "Bash" }, { name: WRAPPER }] }).loaded.map((t) => t.name)).toEqual([WRAPPER]);
	});
});

describe("session", () => {
	test("the stock arm's search loads Monitor, and the rewrite arm's loads only the wrapper", async () => {
		const [stock, rewrite] = await Promise.all(
			["stock", "rewrite"].map((name, index) => session({ arm: arm(name), case: { name: "search", prompt: "find the monitor tool" }, index })),
		);
		expect(stock?.armCheck).toMatchObject({ ok: true, diff: [] });
		expect(rewrite?.armCheck).toMatchObject({ ok: true, diff: [] });
		expect(measures.get(stock?.runId ?? "")?.loaded.map((t) => t.name)).toEqual(["Monitor"]);
		expect(stock?.verdict.pass).toBe(false);
		expect(rewrite?.verdict).toMatchObject({ pass: true, label: WRAPPER });
		expect(measures.get(rewrite?.runId ?? "")?.loaded).toEqual([{ name: WRAPPER, bytes: 866 }]);
	});
});
