import { describe, expect, test } from "bun:test";
import { valueAt } from "../../../tiers/merge.ts";
import { tierSnippet } from "../../../tiers/snippet.ts";
import { SNIPPET_ROW } from "../../../tiers/tiers.ts";
import { differencesOf, setupWrite } from "../diff.ts";

const snippet = () => tierSnippet(SNIPPET_ROW, "darwin");

const idsOf = (held: Record<string, unknown>): readonly string[] =>
	differencesOf(held, snippet()).map((d) => d.id);

describe("the differences between the snippet and the user settings", () => {
	test("an empty file differs in every key, and each key names its group", () => {
		const all = differencesOf({}, snippet());

		expect(all.map((d) => d.id)).toContain("model");
		expect(all.map((d) => d.id)).toContain("sandbox.enabled");
		expect(all.every((d) => d.group !== "")).toBe(true);
		expect(all.find((d) => d.id === "model")?.now).toBeUndefined();
	});

	test("a key the user already holds with the same value is not a difference", () => {
		const model = snippet()["model"];

		expect(idsOf({ model })).not.toContain("model");
	});

	test("a key the user holds with another value is a difference that shows both values", () => {
		const found = differencesOf({ model: "opus" }, snippet()).find(
			(d) => d.id === "model",
		);

		expect(found?.now).toBe("opus");
		expect(found?.claudetto).toBe(snippet()["model"]);
	});

	test("the two sandbox toggles are offered with the sandbox keys", () => {
		const all = differencesOf({}, snippet());
		const toggles = all.filter((d) => d.id.includes("="));

		expect(toggles.map((d) => [d.id, d.claudetto])).toEqual([
			["sandbox.enabled=false", false],
			["sandbox.network.allowLocalBinding=true", true],
		]);
		expect(new Set(toggles.map((d) => d.group))).toEqual(
			new Set([all.find((d) => d.id === "sandbox.enabled")?.group ?? ""]),
		);
	});

	test("a toggle the user already holds is not offered", () => {
		expect(
			idsOf({ sandbox: { network: { allowLocalBinding: true } } }),
		).not.toContain("sandbox.network.allowLocalBinding=true");
	});
});

describe("the write of the kept differences", () => {
	test("only the kept keys are written", () => {
		const { applied } = setupWrite({}, snippet(), ["model", "effortLevel"]);

		expect(applied.written.map((w) => w.path)).toEqual([
			"model",
			"effortLevel",
		]);
		expect(Object.keys(applied.settings)).toEqual(["model", "effortLevel"]);
	});

	test("a kept key replaces the user's other value, and a discarded one stays", () => {
		const { applied } = setupWrite(
			{ model: "opus", effortLevel: "low" },
			snippet(),
			["model"],
		);

		expect(applied.settings["model"]).toBe(snippet()["model"]);
		expect(applied.settings["effortLevel"]).toBe("low");
	});

	test("a kept deny list adds to the user's rules and drops none", () => {
		const { applied } = setupWrite(
			{ permissions: { deny: ["Bash(rm:*)"] } },
			snippet(),
			["permissions.deny"],
		);

		const deny = valueAt(applied.settings, ["permissions", "deny"]);
		expect(Array.isArray(deny) ? deny[0] : undefined).toBe("Bash(rm:*)");
		expect(Array.isArray(deny) ? deny.length : 0).toBeGreaterThan(1);
	});

	test("a toggle writes its own value", () => {
		const { applied } = setupWrite({}, snippet(), [
			"sandbox.enabled=false",
			"sandbox.network.allowLocalBinding=true",
		]);

		expect(applied.settings["sandbox"]).toEqual({
			enabled: false,
			network: { allowLocalBinding: true },
		});
	});

	test("an unknown id and a key named twice are refused, and nothing of them is written", () => {
		const out = setupWrite({}, snippet(), [
			"no.such.key",
			"sandbox.enabled",
			"sandbox.enabled=false",
		]);

		expect(out.refused).toEqual([
			"no.such.key",
			"sandbox.enabled",
			"sandbox.enabled=false",
		]);
		expect(out.applied.written).toEqual([]);
	});
});
