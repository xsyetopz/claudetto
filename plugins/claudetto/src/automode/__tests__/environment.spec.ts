import { describe, expect, test } from "bun:test";
import { autoModeSnippet, DEFAULTS } from "../automode.ts";
import {
	ENVIRONMENT_FACTS,
	ENVIRONMENT_FIELDS,
	type EnvironmentFact,
	environmentEntries,
	environmentEntry,
	environmentFaults,
} from "../environment.ts";

const sound = (): EnvironmentFact => ({
	field: "Organization",
	text: "a fact",
	source: "a file of the project",
});

describe("the shipped environment facts", () => {
	test("the shipped facts have no fault", () => {
		expect(environmentFaults()).toEqual([]);
	});

	test("every fact fills a field the program has", () => {
		const fields = ENVIRONMENT_FACTS.map((fact) => fact.field);

		expect(fields.every((field) => ENVIRONMENT_FIELDS.includes(field))).toBe(
			true,
		);
	});
});

describe("the check reports a fact nothing backs", () => {
	test("a fact with no reading behind it is named", () => {
		const facts = [{ ...sound(), source: "   " }];

		const faults = environmentFaults(facts);

		expect(faults).toEqual([
			"Organization: the fact names nothing that was read for it, so nothing checks it",
		]);
	});

	test("a fact with no text is named", () => {
		const facts = [{ ...sound(), text: "" }];

		const faults = environmentFaults(facts);

		expect(faults).toEqual(["Organization: the fact has no text"]);
	});

	test("a fact for a field the program does not have is named", () => {
		const facts = [{ ...sound(), field: "Favourite Colour" }];

		const faults = environmentFaults(facts);

		expect(faults).toEqual([
			"Favourite Colour: no field of `autoMode.environment` has that label",
		]);
	});

	test("two facts for one field are named", () => {
		const facts = [sound(), { ...sound(), text: "another fact" }];

		const faults = environmentFaults(facts);

		expect(faults).toEqual([
			"Organization: a second fact fills the same field, so the classifier gets two of ours",
		]);
	});
});

describe("the entries the snippet writes", () => {
	test("an entry takes the shape the built-in entries use", () => {
		expect(environmentEntry(sound())).toBe("**Organization**: a fact");
	});

	test("the snippet keeps the defaults first and adds one entry per fact", () => {
		const { environment } = autoModeSnippet().autoMode;

		expect(environment[0]).toBe(DEFAULTS);
		expect(environment.slice(1)).toEqual([...environmentEntries()]);
	});

	// An entry of ours is added beside the built-in entry for the same field rather than replacing it
	// (`docs/auto-mode.md`, "The Facts of `autoMode.environment`"), so each one has to carry its own
	// field label in the shape the built-in entries use, or the classifier reads it as loose prose.
	test("every written entry names its field", () => {
		const { environment } = autoModeSnippet().autoMode;

		expect(environment.length).toBe(1 + ENVIRONMENT_FACTS.length);
		expect(environment.slice(1).every((e) => e.startsWith("**"))).toBe(true);
	});
});
