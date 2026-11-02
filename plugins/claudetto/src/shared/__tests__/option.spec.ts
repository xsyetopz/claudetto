import { describe, expect, test } from "bun:test";
import { optionOf, optionOverDefault } from "../option.ts";

describe("optionOf", () => {
	test("the new name wins over the stored old one", () => {
		expect(optionOf({ now: 1, old: 2 }, "now", "old")).toBe(1);
	});

	test("with no new name the stored old one is read", () => {
		expect(optionOf({ old: 2 }, "now", "old")).toBe(2);
	});

	test("an empty string, which the host fills in for an unset option, counts as unset", () => {
		expect(optionOf({ now: "", old: 2 }, "now", "old")).toBe(2);
	});

	test("with neither it is undefined", () => {
		expect(optionOf({}, "now", "old")).toBeUndefined();
	});
});

describe("optionOverDefault", () => {
	test("a new name that differs from the default is the user's choice", () => {
		expect(optionOverDefault({ now: "b", old: "c" }, "now", "old", "a")).toBe(
			"b",
		);
	});

	test("a new name at the default cannot tell a choice from a fill, so a stored old one wins", () => {
		expect(optionOverDefault({ now: "a", old: "c" }, "now", "old", "a")).toBe(
			"c",
		);
	});

	test("with no stored old one the new name stands, default or not", () => {
		expect(optionOverDefault({ now: "a" }, "now", "old", "a")).toBe("a");
		expect(optionOverDefault({}, "now", "old", "a")).toBeUndefined();
	});
});
